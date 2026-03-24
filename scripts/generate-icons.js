#!/usr/bin/env node
/**
 * Generate placeholder PNG icons for the extension.
 * In production, replace with proper designed icons.
 * 
 * Run: node scripts/generate-icons.js
 * (Requires canvas package: npm install canvas)
 */

const fs = require('fs');
const path = require('path');

// Create icons directory
const iconsDir = path.join(__dirname, '../public/icons');
if (!fs.existsSync(iconsDir)) fs.mkdirSync(iconsDir, { recursive: true });

// Minimal SVG icon for the extension (used as placeholder)
const sizes = [16, 32, 48, 128];

for (const size of sizes) {
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 ${size} ${size}">
  <defs>
    <linearGradient id="g" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" style="stop-color:#22d3ee"/>
      <stop offset="100%" style="stop-color:#3b82f6"/>
    </linearGradient>
  </defs>
  <rect width="${size}" height="${size}" rx="${Math.round(size * 0.2)}" fill="url(#g)"/>
  <text x="50%" y="50%" dominant-baseline="central" text-anchor="middle" 
    font-family="system-ui,sans-serif" font-weight="bold" 
    font-size="${Math.round(size * 0.5)}" fill="#0f172a">OS</text>
</svg>`;
  
  fs.writeFileSync(path.join(iconsDir, `icon${size}.svg`), svg);
  console.log(`Generated icon${size}.svg`);
}

console.log('\nNote: Convert SVGs to PNGs using your preferred tool or an online converter.');
console.log('Tools: Inkscape, rsvg-convert, or https://svgtopng.com\n');
console.log('Commands (if rsvg-convert is installed):');
for (const size of sizes) {
  console.log(`  rsvg-convert -w ${size} -h ${size} public/icons/icon${size}.svg > public/icons/icon${size}.png`);
}
