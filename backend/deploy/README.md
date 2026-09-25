# Deploying on AWS EC2

This is the **only** supported deployment path for this app (the previous
Windows/COB setup and an earlier abandoned GCP attempt have both been
retired and removed). Django serves the API; nginx serves the built React
app and static/media files directly and proxies `/api/` + `/admin/` to
gunicorn on `127.0.0.1:8000`. TLS is a free Let's Encrypt certificate via
certbot. The database is Neon (managed Postgres), not local to the VM.

```
Vendor's browser
      │  HTTPS (Let's Encrypt cert, via certbot)
      ▼
AWS EC2 t3.micro (Ubuntu, Elastic IP)
   nginx :80 (redirect) / :443 (TLS)
      ├─ / , /assets/*   → frontend/dist/ (built off-VM, shipped by push.sh)
      ├─ /static/*       → backend/staticfiles/
      ├─ /media/*        → backend/media/
      └─ /api/*, /admin/*→ proxy_pass → gunicorn on 127.0.0.1:8000
                                 │
                                 ▼
                        Neon Postgres (DATABASE_URL, sslmode=require)
```

## Current live instance (reference)

- Region: **eu-north-1** (Stockholm)
- Instance: `vendor-onboarding-prod`, `t3.micro`, Ubuntu
- Public hostname: `56-228-57-231.sslip.io` (free [sslip.io](https://sslip.io)
  hostname auto-resolving to the Elastic IP `56.228.57.231` - no domain
  purchase, no DNS handoff needed). A real `radico.co.in` subdomain can be
  swapped in later - see "Migrating to a custom domain" below.
- App code lives at `/opt/vendor-onboarding` on the VM, owned by a
  dedicated `deploy` user (not `ubuntu`, not root).

## One-time VM bootstrap

This has already been done on the current instance; only needed again if
standing up a **new** instance from scratch.

```bash
# as the ubuntu user (initial SSH access)
sudo apt-get update -y && sudo apt-get upgrade -y
sudo apt-get install -y nginx python3 python3-venv python3-pip git certbot python3-certbot-nginx
```

> Fresh Ubuntu AMIs run `unattended-upgrades` in the background right after
> boot, which can hold the `dpkg` lock for several minutes (and may trigger
> an automatic reboot for kernel updates). If `apt-get install` fails with
> "Could not get lock", just wait - check with
> `sudo fuser /var/lib/dpkg/lock-frontend` and retry once it's free.

```bash
sudo adduser --disabled-password --gecos "" deploy
sudo mkdir -p /opt/vendor-onboarding && sudo chown deploy:deploy /opt/vendor-onboarding

# 2GB swap - absorbs apt/pip bursts on a 1GB instance without slowing steady state
sudo fallocate -l 2G /swapfile && sudo chmod 600 /swapfile && sudo mkswap /swapfile
sudo swapon /swapfile
echo '/swapfile none swap sw 0 0' | sudo tee -a /etc/fstab
sudo sysctl vm.swappiness=10 && echo 'vm.swappiness=10' | sudo tee -a /etc/sysctl.conf
```

**GitHub access**: generate a deploy key as the `deploy` user and add it as
a **read-only** Deploy Key on the GitHub repo (Settings → Deploy keys):

```bash
sudo -u deploy ssh-keygen -t ed25519 -f /home/deploy/.ssh/github_deploy_key -N "" -C "vendor-onboarding-ec2-deploy"
sudo -u deploy bash -c 'cat >> ~/.ssh/config << EOF
Host github.com
  IdentityFile ~/.ssh/github_deploy_key
  IdentitiesOnly yes
EOF'
sudo -u deploy cat /home/deploy/.ssh/github_deploy_key.pub   # add this to GitHub
```

```bash
sudo -u deploy git clone git@github.com:RadicoKhaitanLimited/Vendor-Onboarding.git /opt/vendor-onboarding
cd /opt/vendor-onboarding/backend
sudo -u deploy python3 -m venv venv
sudo -u deploy venv/bin/pip install -r requirements.txt
```

Create `/opt/vendor-onboarding/backend/.env` (copy `.env.example`, fill in
real values - see that file for what's required, including the "Production
example" block for this exact stack). `chmod 600` it; owned by `deploy`.

```bash
sudo -u deploy venv/bin/python manage.py migrate
sudo -u deploy venv/bin/python manage.py collectstatic --noinput
```

Install the systemd unit, then start it:

```bash
sudo cp deploy/systemd/vendor-onboarding.service /etc/systemd/system/
sudo systemctl daemon-reload
sudo systemctl enable --now vendor-onboarding
```

Let the `deploy` user restart the service without a password (needed by
`remote-deploy.sh`):

```bash
echo 'deploy ALL=(root) NOPASSWD: /bin/systemctl restart vendor-onboarding' \
    | sudo tee /etc/sudoers.d/vendor-onboarding-deploy
sudo visudo -c   # validate syntax before trusting it
```

Install nginx (HTTP only first - certbot adds the TLS block automatically
in the next step, don't hand-write it):

```bash
sudo sed -e "s|<APP_ROOT>|/opt/vendor-onboarding|g" -e "s|<HOSTNAME>|56-228-57-231.sslip.io|g" \
    /opt/vendor-onboarding/backend/deploy/nginx/vendor-onboarding.conf \
    | sudo tee /etc/nginx/sites-available/vendor-onboarding
sudo ln -sf /etc/nginx/sites-available/vendor-onboarding /etc/nginx/sites-enabled/vendor-onboarding
sudo rm -f /etc/nginx/sites-enabled/default
sudo nginx -t && sudo systemctl reload nginx
```

**AWS security group**: open inbound TCP 80 and 443 from anywhere (SSH/22
should stay restricted to admin IPs only) - EC2 console → Security Groups →
edit inbound rules. Nothing above is reachable externally until this is
done.

Checkpoint: `curl http://<elastic-ip>/` from outside the VM should load the
app over plain HTTP.

Then get TLS (also one-time per hostname):

```bash
sudo certbot --nginx -d 56-228-57-231.sslip.io --agree-tos -m <admin-email> --redirect
```

Certbot rewrites the nginx config to add the `443` block and the `80->443`
redirect, and installs its own renewal timer - no manual renewal upkeep.

## Deploying new functionality (every time code changes)

Both scripts connect over SSH as the `deploy` user. Load the SSH key into
an agent first so you're not passing `-i` around:

```bash
eval $(ssh-agent -s)
ssh-add /path/to/vendor-onboarding-key
```

**Frontend changed (or both frontend + backend):** from the **dev
machine**:

```bash
VM_HOST=56.228.57.231 VM_USER=deploy bash backend/deploy/push.sh
```

Builds `frontend/dist` locally (the VM has no Node.js on purpose - Vite
builds are memory-hungry and risk OOM on a 1GB instance), uploads it, and
triggers the backend redeploy below over SSH.

**Backend-only change:** either run `push.sh` (it still works, just
re-uploads a frontend that didn't change), or SSH in and run directly:

```bash
ssh deploy@56.228.57.231 /opt/vendor-onboarding/backend/deploy/remote-deploy.sh
```

Pulls latest code (`git pull`), reinstalls deps, runs migrations, runs
`collectstatic`, and restarts gunicorn. Stops on the first failure so the
running app is never left half-updated.

The normal flow: commit + `git push` locally like any other change, then
run one of the two commands above.

## Managing the service

```bash
sudo systemctl status vendor-onboarding
sudo journalctl -u vendor-onboarding -n 100 -f   # logs
sudo systemctl restart vendor-onboarding
```

## Verifying

- `curl -sI https://56-228-57-231.sslip.io/` - valid TLS cert, 200
- Login, an authenticated API call, admin panel, document upload/download,
  and a notification email should all work end-to-end
- `sudo systemctl kill -s SIGKILL vendor-onboarding` then confirm systemd
  auto-restarts it within a few seconds
- `sudo reboot` then confirm nginx + gunicorn come back on their own

## Long-term maintenance

- **AWS free tier ends 12 months after account creation** - after that the
  instance costs roughly $8-12/month if left running continuously. Put a
  calendar reminder near month 11 to decide: pay, resize down, or migrate.
- **AWS Budget alert** should already be configured (Billing → Budgets) -
  check it fires correctly.
- **OS security updates** aren't automatic beyond what
  `unattended-upgrades` covers - periodically run
  `sudo apt-get update && sudo apt-get upgrade -y` and reboot.
- **Neon usage**: glance at the Neon dashboard occasionally to confirm
  you're still comfortably inside the free tier (storage, compute hours).
- **Secrets rotation**: any credential that was ever pasted into a chat, a
  ticket, or committed to git history should be treated as exposed and
  rotated, even after removing it from the current file - `git log -p`
  still shows old values to anyone with repo access.

## Migrating to a custom domain

When ready to move from `56-228-57-231.sslip.io` to a `radico.co.in`
subdomain: get a Cloudflare account, ask whoever controls the `radico.co.in`
DNS zone for a one-time NS delegation of the subdomain to Cloudflare (after
that, no further IT involvement), switch nginx from the Let's Encrypt cert
to a Cloudflare Origin Certificate with SSL mode "Full (strict)", update
`ALLOWED_HOSTS` / `CORS_ALLOWED_ORIGINS` / `CSRF_TRUSTED_ORIGINS` /
`FRONTEND_URL` in `.env`, and restrict the security group's 80/443 rules to
Cloudflare's published IP ranges.
