# Run this from an elevated ("Run as Administrator") PowerShell on COB
# after redeploy.bat has finished rebuilding, to pick up the new code.
# The scheduled task runs as SYSTEM, so even querying/stopping/starting it
# requires an admin session - a plain user session gets "Access is denied".
#
# NOTE: Stop-ScheduledTask alone has proven unreliable here - it can lose
# track of the actual waitress/python.exe process (a grandchild of the
# task's launched executable), leaving an orphan still bound to :8000 that
# silently keeps serving old code even after the task reports "stopped"
# and a new instance is started. This script kills whatever is actually
# bound to port 8000 directly, so there's no ambiguity.

$ErrorActionPreference = 'Stop'

$isAdmin = ([Security.Principal.WindowsPrincipal][Security.Principal.WindowsIdentity]::GetCurrent()).IsInRole([Security.Principal.WindowsBuiltInRole]::Administrator)
if (-not $isAdmin) {
    throw "Not running elevated. Close this window and open a NEW PowerShell via right-click 'Run as administrator', then re-run this script."
}

$TaskName = 'VendorOnboardingApp'

Write-Host "Stopping scheduled task $TaskName..."
Stop-ScheduledTask -TaskName $TaskName -ErrorAction SilentlyContinue

Write-Host "Killing any process still bound to port 8000..."
for ($i = 0; $i -lt 5; $i++) {
    $conns = Get-NetTCPConnection -LocalPort 8000 -State Listen -ErrorAction SilentlyContinue
    if (-not $conns) { break }
    foreach ($pid_ in ($conns.OwningProcess | Select-Object -Unique)) {
        Write-Host "  Killing PID $pid_"
        Stop-Process -Id $pid_ -Force -ErrorAction SilentlyContinue
    }
    Start-Sleep -Seconds 1
}

$stillListening = Get-NetTCPConnection -LocalPort 8000 -State Listen -ErrorAction SilentlyContinue
if ($stillListening) {
    throw "Port 8000 is still held by PID(s) $($stillListening.OwningProcess -join ', ') after 5 attempts - investigate manually before continuing."
}
Write-Host "Port 8000 is free."

Write-Host "Starting $TaskName..."
Start-ScheduledTask -TaskName $TaskName
Start-Sleep -Seconds 3

$newConn = Get-NetTCPConnection -LocalPort 8000 -State Listen -ErrorAction SilentlyContinue
if (-not $newConn) {
    throw "Nothing is listening on :8000 after starting the task - check Get-ScheduledTask -TaskName $TaskName | Get-ScheduledTaskInfo for the failure."
}
$proc = Get-Process -Id ($newConn.OwningProcess | Select-Object -First 1)
Write-Host "New process serving :8000 -> PID $($proc.Id), started $($proc.StartTime)"

Get-ScheduledTask -TaskName $TaskName | Get-ScheduledTaskInfo | Select-Object LastRunTime, LastTaskResult

Write-Host ""
Write-Host "Verify at: http://172.30.6.198:8000/"
