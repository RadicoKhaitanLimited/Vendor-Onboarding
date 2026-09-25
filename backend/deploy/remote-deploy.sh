#!/usr/bin/env bash
# Run this ON THE VM (called automatically by push.sh over SSH, or run it
# directly on the VM for a backend-only change). Pulls latest backend code,
# reinstalls deps, runs migrations, collects static files, and restarts
# gunicorn. Stops on the first failure so the running app is never left
# half-updated - the Linux equivalent of redeploy.bat + restart_service.ps1.
set -euo pipefail

APP_ROOT="/opt/vendor-onboarding"
cd "$APP_ROOT"

echo "=== git pull ==="
git pull

cd backend
source venv/bin/activate

echo "=== pip install -r requirements.txt ==="
pip install -r requirements.txt

echo "=== manage.py migrate ==="
python manage.py migrate

echo "=== manage.py collectstatic ==="
python manage.py collectstatic --noinput

echo "=== restarting gunicorn ==="
sudo systemctl restart vendor-onboarding

sleep 2
if ! systemctl is-active --quiet vendor-onboarding; then
    echo "*** vendor-onboarding failed to start - check: journalctl -u vendor-onboarding -n 50 ***"
    exit 1
fi

echo "Redeploy complete. vendor-onboarding is active."
