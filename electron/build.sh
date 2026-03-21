#!/bin/bash
# Build script for APAS Desktop (Electron)
# Usage: cd electron && bash build.sh

echo "=== APAS Desktop Build ==="
echo ""

# Step 1: Build the web app
echo "[1/3] Building web app..."
cd "$(dirname "$0")/.."
npm run build
if [ $? -ne 0 ]; then
  echo "ERROR: Web build failed"
  exit 1
fi

# Step 2: Install Electron dependencies
echo "[2/3] Installing Electron dependencies..."
cd electron
npm install
if [ $? -ne 0 ]; then
  echo "ERROR: Electron dependency install failed"
  exit 1
fi

# Step 3: Build the installer
echo "[3/3] Building Windows installer..."
npm run build
if [ $? -ne 0 ]; then
  echo "ERROR: Electron build failed"
  exit 1
fi

echo ""
echo "=== Build complete! ==="
echo "Installer is in: electron-dist/"
