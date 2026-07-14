@echo off
REM ── SV Students Recommend — Weekly DB Reset ──────────────────────────────────
REM Add this to Windows Task Scheduler to run every Sunday at 09:00 AM

set PROJECT=c:\Data\Projects\SV_Students_recommend
set LOG=%PROJECT%\reset_log.txt

echo. >> "%LOG%"
echo ============================================================ >> "%LOG%"
echo Reset started: %DATE% %TIME% >> "%LOG%"
echo ============================================================ >> "%LOG%"

cd /d "%PROJECT%\backend"

REM Use the root .venv Python which has dotenv and httpx installed
"%PROJECT%\.venv\Scripts\python.exe" reset.py >> "%LOG%" 2>&1

IF %ERRORLEVEL% EQU 0 (
    echo [OK] Reset finished successfully: %DATE% %TIME% >> "%LOG%"
) ELSE (
    echo [FAIL] Reset failed with exit code %ERRORLEVEL%: %DATE% %TIME% >> "%LOG%"
)
