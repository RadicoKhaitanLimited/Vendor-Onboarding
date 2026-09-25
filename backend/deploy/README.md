# Deploying on GCP (e2-micro)

Django serves the API; nginx serves the built React app and static/media
files directly and proxies `/api/` + `/admin/` to gunicorn on
`127.0.0.1:8000`. See `../../.claude/plans/` (or ask Claude Code) for the
full migration plan this setup came from - this doc only covers the
steady-state deploy/redeploy flow once the VM is bootstrapped.

Public hostname (Phase C, no custom domain): a free
[sslip.io](https://sslip.io) hostname derived from the VM's static IP, e.g.
`34.123.45.67` -> `34-123-45-67.sslip.io`. A real domain can be swapped in
later (see the plan's deferred "future domain migration" section) without
changing anything below except `ALLOWED_HOSTS`/`CORS_ALLOWED_ORIGINS`/
`CSRF_TRUSTED_ORIGINS`/`FRONTEND_URL` and the nginx `server_name`.

## One-time VM bootstrap

Done once, on a fresh VM, as root/sudo:

```bash
apt update && apt upgrade -y
apt install -y nginx python3 python3-venv python3-pip git certbot python3-certbot-nginx

# dedicated non-root user that owns the app and runs gunicorn
adduser --disabled-password --gecos "" deploy

# 2GB swap - absorbs apt/pip bursts on a 1GB VM without slowing steady state
fallocate -l 2G /swapfile
chmod 600 /swapfile
mkswap /swapfile
swapon /swapfile
echo '/swapfile none swap sw 0 0' >> /etc/fstab
sysctl vm.swappiness=10
echo 'vm.swappiness=10' >> /etc/sysctl.conf

# app code
su - deploy
git clone git@github.com:RadicoKhaitanLimited/Vendor-Onboarding.git /opt/vendor-onboarding
cd /opt/vendor-onboarding/backend
python3 -m venv venv
source venv/bin/activate
pip install -r requirements.txt
```

Create `/opt/vendor-onboarding/backend/.env` (copy `.env.example`, fill in
real values - see that file for what's required). `chmod 600` it.

```bash
python manage.py migrate
python manage.py collectstatic --noinput
```

Install the systemd unit and nginx config (as root), then start:

```bash
cp deploy/systemd/vendor-onboarding.service /etc/systemd/system/
systemctl daemon-reload
systemctl enable --now vendor-onboarding

# edit <APP_ROOT> and <HOSTNAME> placeholders first
cp deploy/nginx/vendor-onboarding.conf /etc/nginx/sites-available/vendor-onboarding
ln -s /etc/nginx/sites-available/vendor-onboarding /etc/nginx/sites-enabled/
rm -f /etc/nginx/sites-enabled/default
nginx -t && systemctl reload nginx
```

Checkpoint: `curl http://<static-ip>/` from outside the VM should load the
app over plain HTTP.

Then get TLS (also one-time):

```bash
certbot --nginx -d <ip-with-dashes>.sslip.io
```

Certbot rewrites the nginx config to add the `443` block and the `80->443`
redirect, and installs its own renewal timer - no manual renewal upkeep.

Let the `deploy` user restart the service without a password (needed by
`remote-deploy.sh`):

```bash
echo 'deploy ALL=(root) NOPASSWD: /bin/systemctl restart vendor-onboarding' \
    > /etc/sudoers.d/vendor-onboarding-deploy
```

## Deploying new functionality (every time code changes)

**Frontend changed (or both frontend + backend):** from the **dev machine**:

```bash
backend/deploy/push.sh
```

Builds `frontend/dist` locally (the VM has no Node.js on purpose - Vite
builds are memory-hungry and risk OOM on a 1GB box), uploads it, and
triggers the backend redeploy below over SSH.

**Backend-only change:** either run `push.sh` (it still works, just rebuilds
a frontend that didn't change), or SSH into the VM and run directly:

```bash
/opt/vendor-onboarding/backend/deploy/remote-deploy.sh
```

Pulls latest code, reinstalls deps, runs migrations, runs `collectstatic`,
and restarts gunicorn. Stops on the first failure so the running app is
never left half-updated.

## Managing the service

```bash
systemctl status vendor-onboarding
journalctl -u vendor-onboarding -n 100 -f   # logs
sudo systemctl restart vendor-onboarding
```

## Verifying

- `curl -sI https://<ip-with-dashes>.sslip.io/` - valid TLS cert, 200
- Login, an authenticated API call, admin panel, document upload/download,
  and a notification email should all work end-to-end
- `sudo systemctl kill -s SIGKILL vendor-onboarding` then confirm systemd
  auto-restarts it within a few seconds
- `sudo reboot` then confirm nginx + gunicorn come back on their own

## Windows/COB deployment (retired)

The previous Windows Server deployment (waitress + Scheduled Task on COB,
`172.30.6.198`) has been fully torn down. `redeploy.bat`, `run.bat`,
`restart_service.ps1`, and `setup_service.ps1` in this directory document
that retired setup and are kept only as a cold reference until this new
deployment has soaked for a couple of weeks - they are not part of the
current deploy flow.
