#!/usr/bin/env node
/**
 * Fix absolute paths in Expo web export for Electron file:// protocol
 * Converts paths like "/_expo/static/..." to "./_expo/static/..."
 */

const fs = require('fs');
const path = require('path');

const distDir = path.join(__dirname, '..', 'dist');
const indexPath = path.join(distDir, 'index.html');

if (!fs.existsSync(indexPath)) {
  console.error('dist/index.html not found. Run expo export first.');
  process.exit(1);
}

let html = fs.readFileSync(indexPath, 'utf8');

// Fix script src paths: /_expo/ -> ./_expo/
html = html.replace(/src="\/_expo\//g, 'src="./_expo/');

// Fix link href paths: /_expo/ -> ./_expo/
html = html.replace(/href="\/_expo\//g, 'href="./_expo/');

fs.writeFileSync(indexPath, html);
console.log('Fixed paths in dist/index.html for Electron');
