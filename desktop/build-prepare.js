/**
 * APAS Desktop Build Preparation Script
 * 
 * This script prepares the Electron app for building by:
 * 1. Building the web app (if not already built)
 * 2. Verifying all required files exist
 * 3. Copying installer assets to the right locations
 */

const { execSync } = require('child_process');
const path = require('path');
const fs = require('fs');

const ROOT_DIR = path.join(__dirname, '..');
const DIST_DIR = path.join(ROOT_DIR, 'dist');
const DESKTOP_DIR = __dirname;

console.log('========================================');
console.log('  APAS Desktop Build Preparation');
console.log('========================================\n');

// Step 1: Check if web app is built
console.log('[1/3] Checking web app build...');
if (!fs.existsSync(path.join(DIST_DIR, 'index.html'))) {
  console.log('  Web app not built. Building now...');
  try {
    execSync('npm run build', { cwd: ROOT_DIR, stdio: 'inherit' });
    console.log('  Web app built successfully!\n');
  } catch (error) {
    console.error('  ERROR: Failed to build web app!');
    process.exit(1);
  }
} else {
  console.log('  Web app already built.\n');
}

// Step 2: Verify required desktop files
console.log('[2/3] Verifying desktop files...');
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
console.log('');

// Step 3: Verify web app dist contents
console.log('[3/3] Verifying web app dist...');
const distFiles = fs.readdirSync(DIST_DIR);
console.log(`  Found ${distFiles.length} files/folders in dist/`);
if (fs.existsSync(path.join(DIST_DIR, 'index.html'))) {
  console.log('  ✓ index.html found');
} else {
  console.error('  ✗ index.html not found in dist!');
  process.exit(1);
}
if (fs.existsSync(path.join(DIST_DIR, 'assets'))) {
  const assets = fs.readdirSync(path.join(DIST_DIR, 'assets'));
  console.log(`  ✓ assets/ folder with ${assets.length} files`);
}

console.log('\n========================================');
console.log('  Build preparation complete!');
console.log('  Run electron-builder to create installer.');
console.log('========================================\n');
