#!/usr/bin/env bash
# Run this on the DEV MACHINE (not the VM) whenever the frontend changes.
# Builds the React app locally (the VM deliberately has no Node.js - Vite
# builds are memory-hungry and risk OOM on a 1GB e2-micro box) and ships
# the built dist/ to the VM, then triggers a backend redeploy over SSH.
#
# Fill in VM_HOST/VM_USER below once the VM exists (Phase B), or export
# them before running: VM_HOST=34.123.45.67 VM_USER=deploy ./push.sh
set -euo pipefail

VM_HOST="${VM_HOST:-<STATIC_IP>}"
VM_USER="${VM_USER:-deploy}"
APP_ROOT="${APP_ROOT:-/opt/vendor-onboarding}"

REPO_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"

echo "=== Building frontend ==="
cd "$REPO_ROOT/frontend"
npm ci
npm run build

echo "=== Uploading dist/ to $VM_USER@$VM_HOST:$APP_ROOT/frontend/dist ==="
ssh "$VM_USER@$VM_HOST" "mkdir -p $APP_ROOT/frontend/dist.new"
scp -r dist/* "$VM_USER@$VM_HOST:$APP_ROOT/frontend/dist.new/"
ssh "$VM_USER@$VM_HOST" "rm -rf $APP_ROOT/frontend/dist.old && \
    (mv $APP_ROOT/frontend/dist $APP_ROOT/frontend/dist.old || true) && \
    mv $APP_ROOT/frontend/dist.new $APP_ROOT/frontend/dist"

echo "=== Triggering backend redeploy on the VM ==="
ssh "$VM_USER@$VM_HOST" "$APP_ROOT/backend/deploy/remote-deploy.sh"

echo "Done."
