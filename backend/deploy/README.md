# Deploying on COB (172.30.6.198)

Django serves both the API and the built React app on a single origin,
port 8000 - matching `FRONTEND_URL` / `CORS_ALLOWED_ORIGINS` /
`CSRF_TRUSTED_ORIGINS` already set in `backend/.env`.

## One-time setup (already done as of this deploy)

```
cd backend
venv\Scripts\python.exe -m pip install -r requirements.txt
venv\Scripts\python.exe manage.py migrate
venv\Scripts\python.exe manage.py collectstatic --noinput

cd ..\frontend
npm run build
```

## Deploying new functionality (every time code changes)

Two steps, because the app runs as a SYSTEM scheduled task and only an
elevated session can touch it.

**1. Rebuild (no admin needed) - from a normal terminal:**

```
backend\deploy\redeploy.bat
```

Pulls latest code, reinstalls backend deps, runs migrations, runs
`collectstatic`, and rebuilds the frontend. Stops early with an error if
any step fails, so the running app is never left half-updated.

**2. Restart (needs admin) - from an elevated PowerShell:**

```powershell
cd 'C:\Users\vendor\Desktop\Vendor\Vendor-Onboarding\backend\deploy'
.\restart_service.ps1
```

Necessary even for a frontend-only change: Vite content-hashes filenames
(`index-XXXX.js`), and WhiteNoise indexes `frontend/dist` once at process
startup, so a stale process keeps serving the old `index.html` pointing at
old filenames until it's restarted.

## Start it persistently (requires admin, one time)

Open PowerShell **as Administrator** on COB and run:

```powershell
cd 'C:\Users\vendor\Desktop\Vendor\Vendor-Onboarding\backend\deploy'
.\setup_service.ps1
```

This opens TCP 8000 inbound in Windows Firewall and registers a Scheduled
Task (`VendorOnboardingApp`) that runs `waitress-serve.exe` as SYSTEM at
boot, restarting automatically if it crashes. No separate service-wrapper
tool (e.g. NSSM) required.

## Manual / foreground start (no admin needed)

Useful for testing or a one-off run without the scheduled task:

```
backend\deploy\run.bat
```

## Managing the scheduled task

All of these need an **elevated** PowerShell (the task runs as SYSTEM -
a non-admin session gets "Access is denied" even just querying it):

```powershell
schtasks /query /tn VendorOnboardingApp /v /fo list   # status
Stop-ScheduledTask -TaskName VendorOnboardingApp       # stop
Start-ScheduledTask -TaskName VendorOnboardingApp      # start
Get-ScheduledTask -TaskName VendorOnboardingApp | Get-ScheduledTaskInfo   # last run result
```

## Verifying

- `Test-NetConnection -ComputerName localhost -Port 8000` on COB itself
- From another machine on the LAN: `http://172.30.6.198:8000/` should load
  the login page, and API calls under `/api/v1/...` should succeed.
