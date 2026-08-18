@echo off
REM Rebuilds everything from the latest code (no admin required).
REM Run this whenever backend or frontend code changes.
REM After it finishes, restart the app from an ELEVATED PowerShell
REM (see restart_service.ps1) so the new code/frontend actually loads.

setlocal
set ROOT=%~dp0..\..
cd /d "%ROOT%"

echo === git pull ===
git pull
if errorlevel 1 goto :error

cd backend

echo === pip install -r requirements.txt ===
venv\Scripts\python.exe -m pip install -r requirements.txt
if errorlevel 1 goto :error

echo === manage.py migrate ===
venv\Scripts\python.exe manage.py migrate
if errorlevel 1 goto :error

echo === manage.py collectstatic ===
venv\Scripts\python.exe manage.py collectstatic --noinput
if errorlevel 1 goto :error

cd ..\frontend

echo === npm run build ===
call npm run build
if errorlevel 1 goto :error

echo.
echo Rebuild complete. Now restart the app from an ELEVATED PowerShell:
echo   cd "%ROOT%\backend\deploy"
echo   .\restart_service.ps1
goto :eof

:error
echo.
echo *** Redeploy failed - see error above. App was NOT restarted. ***
exit /b 1
