@echo off
REM Manual foreground start (no admin required).
REM Run this from anywhere - it locates backend\ relative to this script.
cd /d "%~dp0.."
venv\Scripts\waitress-serve.exe --host=0.0.0.0 --port=8000 config.wsgi:application
