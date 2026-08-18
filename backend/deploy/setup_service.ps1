# Run this once from an elevated ("Run as Administrator") PowerShell on COB.
# Opens port 8000 inbound and registers a Scheduled Task that runs the app
# as SYSTEM at boot (survives reboots and logoffs, restarts on failure) -
# a lightweight stand-in for a real Windows Service without needing a
# third-party tool like NSSM.

$ErrorActionPreference = 'Stop'

$isAdmin = ([Security.Principal.WindowsPrincipal][Security.Principal.WindowsIdentity]::GetCurrent()).IsInRole([Security.Principal.WindowsBuiltInRole]::Administrator)
if (-not $isAdmin) {
    throw "Not running elevated. Close this window and open a NEW PowerShell via right-click 'Run as administrator' (or Win+X > Terminal (Admin)), then re-run this script."
}

$AppDir    = 'C:\Users\vendor\Desktop\Vendor\Vendor-Onboarding\backend'
$Waitress  = Join-Path $AppDir 'venv\Scripts\waitress-serve.exe'
$TaskName  = 'VendorOnboardingApp'
$FwRuleName = 'Vendor Onboarding 8000'

if (-not (Test-Path $Waitress)) {
    throw "waitress-serve.exe not found at $Waitress - check the venv exists."
}

# 1. Firewall: allow inbound TCP 8000
if (-not (Get-NetFirewallRule -DisplayName $FwRuleName -ErrorAction SilentlyContinue)) {
    New-NetFirewallRule -DisplayName $FwRuleName -Direction Inbound -Action Allow -Protocol TCP -LocalPort 8000 -ErrorAction Stop | Out-Null
    Write-Host "Firewall rule '$FwRuleName' created."
} else {
    Write-Host "Firewall rule '$FwRuleName' already exists - skipped."
}

# 2. Scheduled Task: run at startup as SYSTEM, restart on failure
$Action    = New-ScheduledTaskAction -Execute $Waitress `
                -Argument '--host=0.0.0.0 --port=8000 config.wsgi:application' `
                -WorkingDirectory $AppDir
$Trigger   = New-ScheduledTaskTrigger -AtStartup
$Principal = New-ScheduledTaskPrincipal -UserId 'SYSTEM' -LogonType ServiceAccount -RunLevel Highest
$Settings  = New-ScheduledTaskSettingsSet `
                -AllowStartIfOnBatteries -DontStopIfGoingOnBatteries -StartWhenAvailable `
                -RestartCount 999 -RestartInterval (New-TimeSpan -Minutes 1) `
                -ExecutionTimeLimit ([TimeSpan]::Zero)

Register-ScheduledTask -TaskName $TaskName -Action $Action -Trigger $Trigger `
    -Principal $Principal -Settings $Settings -Force -ErrorAction Stop `
    -Description 'Vendor Onboarding Portal - Django app served via waitress on :8000' | Out-Null

Write-Host "Scheduled task '$TaskName' registered."

Start-ScheduledTask -TaskName $TaskName -ErrorAction Stop
Start-Sleep -Seconds 3
Get-ScheduledTask -TaskName $TaskName | Select-Object TaskName, State

Write-Host ""
Write-Host "Check it's listening with:  Test-NetConnection -ComputerName localhost -Port 8000"
Write-Host "Browse to:                  http://172.30.6.198:8000/"
