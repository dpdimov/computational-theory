#!/usr/bin/env node
const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

const ROOT = __dirname;

console.log('=================================');
console.log('Computational Theory - Build Script');
console.log('=================================\n');

// Build all React apps using workspaces
console.log('Building React apps...\n');
try {
  execSync('npm run build --workspaces --if-present', {
    stdio: 'inherit',
    cwd: ROOT
  });
  console.log('\nReact apps built successfully!\n');
} catch (error) {
  console.error('Error building React apps:', error.message);
  process.exit(1);
}

// Copy static pages to root
console.log('Copying static pages...\n');
const staticDirs = ['venture-underground', 'venturing-function'];

staticDirs.forEach(dir => {
  const src = path.join(ROOT, 'static', dir);
  const dest = path.join(ROOT, dir);

  if (fs.existsSync(src)) {
    // Create destination directory if it doesn't exist
    if (!fs.existsSync(dest)) {
      fs.mkdirSync(dest, { recursive: true });
    }

    // Copy all files from source to destination
    fs.cpSync(src, dest, { recursive: true });
    console.log(`  Copied ${dir}/`);
  } else {
    console.warn(`  Warning: ${dir}/ source not found in static/`);
  }
});

console.log('\n=================================');
console.log('Build complete!');
console.log('=================================\n');

console.log('Output directories:');
console.log('  React apps -> /{app-name}/');
console.log('  Static pages -> /{page-name}/');
console.log('\nTo preview locally: npx serve .');
