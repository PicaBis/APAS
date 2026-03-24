/**
 * APAS Desktop Build Preparation Script
 * 
 * This script prepares the Electron app for building by:
 * 1. Verifying all required files exist
 */

const path = require('path');
const fs = require('fs');

const DESKTOP_DIR = __dirname;

console.log('========================================');
console.log('  APAS Desktop Build Preparation');
console.log('========================================\n');

// Verify required desktop files
console.log('[1/1] Verifying desktop files...');
const requiredFiles = [
  'main.js',
  'preload.js',
  'splash.html',
  'icon.png',
  'icon.ico',
  'installer/installer.nsh',
  'installer/installerHeader.bmp',
  'installer/installerSidebar.bmp',
];

let allFilesExist = true;
for (const file of requiredFiles) {
  const filePath = path.join(DESKTOP_DIR, file);
  if (fs.existsSync(filePath)) {
    console.log(`  ✓ ${file}`);
  } else {
    console.error(`  ✗ ${file} - MISSING!`);
    allFilesExist = false;
  }
}

if (!allFilesExist) {
  console.error('\nERROR: Some required files are missing!');
  process.exit(1);
}

console.log('\n========================================');
console.log('  Build preparation complete!');
console.log('  Run electron-builder to create installer.');
console.log('========================================\n');
