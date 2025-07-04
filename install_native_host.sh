#!/bin/bash

# Installation script for AI Video Analyzer native messaging host
# This script installs the native messaging host for Chrome/Chromium

set -e

echo "🎬 AI Video Analyzer - Native Messaging Host Installer"
echo "======================================================"

# Detect OS
if [[ "$OSTYPE" == "darwin"* ]]; then
    # macOS
    CHROME_DIR="$HOME/Library/Application Support/Google/Chrome"
    CHROMIUM_DIR="$HOME/Library/Application Support/Chromium"
    HOSTS_DIR="$CHROME_DIR/NativeMessagingHosts"
    echo "Detected macOS"
elif [[ "$OSTYPE" == "linux-gnu"* ]]; then
    # Linux
    CHROME_DIR="$HOME/.config/google-chrome"
    CHROMIUM_DIR="$HOME/.config/chromium"
    HOSTS_DIR="$CHROME_DIR/NativeMessagingHosts"
    echo "Detected Linux"
else
    echo "❌ Unsupported operating system: $OSTYPE"
    echo "Please install manually by copying ffmpeg_host.json to the appropriate directory:"
    echo "  - macOS: ~/Library/Application Support/Google/Chrome/NativeMessagingHosts/"
    echo "  - Linux: ~/.config/google-chrome/NativeMessagingHosts/"
    echo "  - Windows: %LOCALAPPDATA%\\Google\\Chrome\\User Data\\NativeMessagingHosts\\"
    exit 1
fi

# Check if FFmpeg is installed
echo "Checking FFmpeg installation..."
if ! command -v ffmpeg &> /dev/null; then
    echo "❌ FFmpeg is not installed or not in PATH"
    echo "Please install FFmpeg first:"
    echo "  - macOS: brew install ffmpeg"
    echo "  - Ubuntu/Debian: sudo apt install ffmpeg"
    echo "  - Windows: Download from https://ffmpeg.org/download.html"
    exit 1
else
    echo "✅ FFmpeg found: $(ffmpeg -version | head -n1)"
fi

# Check if Python 3 is available
echo "Checking Python installation..."
if ! command -v python3 &> /dev/null; then
    echo "❌ Python 3 is not installed or not in PATH"
    echo "Please install Python 3 first"
    exit 1
else
    echo "✅ Python 3 found: $(python3 --version)"
fi

# Get the directory where this script is located
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PYTHON_SCRIPT="$SCRIPT_DIR/ffmpeg_host.py"
JSON_FILE="$SCRIPT_DIR/ffmpeg_host.json"

# Check if required files exist
if [[ ! -f "$PYTHON_SCRIPT" ]]; then
    echo "❌ ffmpeg_host.py not found in $SCRIPT_DIR"
    exit 1
fi

if [[ ! -f "$JSON_FILE" ]]; then
    echo "❌ ffmpeg_host.json not found in $SCRIPT_DIR"
    exit 1
fi

echo "✅ Required files found"

# Make Python script executable
echo "Making Python script executable..."
chmod +x "$PYTHON_SCRIPT"
echo "✅ Python script is now executable"

# Create NativeMessagingHosts directory if it doesn't exist
echo "Creating NativeMessagingHosts directory..."
mkdir -p "$HOSTS_DIR"
echo "✅ Directory created: $HOSTS_DIR"

# Update the JSON file with the correct path
echo "Updating native messaging host configuration..."
TEMP_JSON=$(mktemp)
sed "s|ffmpeg_host.py|$PYTHON_SCRIPT|g" "$JSON_FILE" > "$TEMP_JSON"

# Copy the updated JSON file
cp "$TEMP_JSON" "$HOSTS_DIR/ffmpeg_host.json"
rm "$TEMP_JSON"

echo "✅ Native messaging host installed: $HOSTS_DIR/ffmpeg_host.json"

# Also install for Chromium if it exists
if [[ -d "$CHROMIUM_DIR" ]]; then
    echo "Installing for Chromium..."
    mkdir -p "$CHROMIUM_DIR/NativeMessagingHosts"
    cp "$HOSTS_DIR/ffmpeg_host.json" "$CHROMIUM_DIR/NativeMessagingHosts/"
    echo "✅ Also installed for Chromium"
fi

echo ""
echo "🎉 Installation completed successfully!"
echo ""
echo "Next steps:"
echo "1. Install the Chrome extension:"
echo "   - Open Chrome and go to chrome://extensions/"
echo "   - Enable 'Developer mode'"
echo "   - Click 'Load unpacked' and select the ScreenRecord folder"
echo ""
echo "2. Configure the extension:"
echo "   - Click the extension icon"
echo "   - Go to Settings & API Key"
echo "   - Enter your OpenAI API key"
echo "   - Test the FFmpeg connection"
echo ""
echo "3. Start analyzing videos!"
echo ""
echo "For troubleshooting, see README.md" 