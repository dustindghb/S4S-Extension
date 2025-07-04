@echo off
setlocal enabledelayedexpansion

echo 🎬 AI Video Analyzer - Native Messaging Host Installer
echo ======================================================
echo.

REM Check if FFmpeg is installed
echo Checking FFmpeg installation...
ffmpeg -version >nul 2>&1
if %errorlevel% neq 0 (
    echo ❌ FFmpeg is not installed or not in PATH
    echo Please install FFmpeg first:
    echo   - Download from https://ffmpeg.org/download.html
    echo   - Extract to a folder (e.g., C:\ffmpeg)
    echo   - Add C:\ffmpeg\bin to your system PATH
    pause
    exit /b 1
) else (
    echo ✅ FFmpeg found
)

REM Check if Python is installed
echo Checking Python installation...
python --version >nul 2>&1
if %errorlevel% neq 0 (
    echo ❌ Python is not installed or not in PATH
    echo Please install Python 3 first
    pause
    exit /b 1
) else (
    echo ✅ Python found
)

REM Get the directory where this script is located
set "SCRIPT_DIR=%~dp0"
set "PYTHON_SCRIPT=%SCRIPT_DIR%ffmpeg_host.py"
set "JSON_FILE=%SCRIPT_DIR%ffmpeg_host.json"

REM Check if required files exist
if not exist "%PYTHON_SCRIPT%" (
    echo ❌ ffmpeg_host.py not found in %SCRIPT_DIR%
    pause
    exit /b 1
)

if not exist "%JSON_FILE%" (
    echo ❌ ffmpeg_host.json not found in %SCRIPT_DIR%
    pause
    exit /b 1
)

echo ✅ Required files found

REM Create NativeMessagingHosts directory
set "HOSTS_DIR=%LOCALAPPDATA%\Google\Chrome\User Data\NativeMessagingHosts"
echo Creating NativeMessagingHosts directory...
if not exist "%HOSTS_DIR%" mkdir "%HOSTS_DIR%"
echo ✅ Directory created: %HOSTS_DIR%

REM Update the JSON file with the correct path
echo Updating native messaging host configuration...
set "TEMP_JSON=%TEMP%\ffmpeg_host_temp.json"

REM Create a temporary file with the correct path
powershell -Command "(Get-Content '%JSON_FILE%') -replace 'ffmpeg_host.py', '%PYTHON_SCRIPT:\=\\%' | Set-Content '%TEMP_JSON%'"

REM Copy the updated JSON file
copy "%TEMP_JSON%" "%HOSTS_DIR%\ffmpeg_host.json" >nul
del "%TEMP_JSON%"

echo ✅ Native messaging host installed: %HOSTS_DIR%\ffmpeg_host.json

echo.
echo 🎉 Installation completed successfully!
echo.
echo Next steps:
echo 1. Install the Chrome extension:
echo    - Open Chrome and go to chrome://extensions/
echo    - Enable 'Developer mode'
echo    - Click 'Load unpacked' and select the ScreenRecord folder
echo.
echo 2. Configure the extension:
echo    - Click the extension icon
echo    - Go to Settings ^& API Key
echo    - Enter your OpenAI API key
echo    - Test the FFmpeg connection
echo.
echo 3. Start analyzing videos!
echo.
echo For troubleshooting, see README.md
pause 