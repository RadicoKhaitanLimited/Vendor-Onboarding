# Run this from an elevated ("Run as Administrator") PowerShell on COB
# after redeploy.bat has finished rebuilding, to pick up the new code.
# The scheduled task runs as SYSTEM, so even querying/stopping/starting it
# requires an admin session - a plain user session gets "Access is denied".

$ErrorActionPreference = 'Stop'

$isAdmin = ([Security.Principal.WindowsPrincipal][Security.Principal.WindowsIdentity]::GetCurrent()).IsInRole([Security.Principal.WindowsBuiltInRole]::Administrator)
if (-not $isAdmin) {
    throw "Not running elevated. Close this window and open a NEW PowerShell via right-click 'Run as administrator', then re-run this script."
}

$TaskName = 'VendorOnboardingApp'

Write-Host "Stopping $TaskName..."
Stop-ScheduledTask -TaskName $TaskName -ErrorAction SilentlyContinue
Start-Sleep -Seconds 2

Write-Host "Starting $TaskName..."
Start-ScheduledTask -TaskName $TaskName
Start-Sleep -Seconds 3

Get-ScheduledTask -TaskName $TaskName | Get-ScheduledTaskInfo | Select-Object LastRunTime, LastTaskResult

Write-Host ""
Write-Host "Verify at: http://172.30.6.198:8000/"
