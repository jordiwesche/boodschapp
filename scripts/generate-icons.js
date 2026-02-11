#!/usr/bin/env node
/**
 * Generate PWA icons with Onest font: #155DFC background, white B
 * Run: node scripts/generate-icons.js
 */
const { createCanvas, GlobalFonts } = require('@napi-rs/canvas');
const sharp = require('sharp');
const path = require('path');
const fs = require('fs');

const publicDir = path.join(__dirname, '..', 'public');
const fontPath = path.join(
  __dirname,
  '..',
  'node_modules',
  '@fontsource',
  'onest',
  'files',
  'onest-latin-700-normal.woff'
);

if (!fs.existsSync(fontPath)) {
  console.error('Onest font not found. Run: npm install @fontsource/onest');
  process.exit(1);
}

GlobalFonts.registerFromPath(fontPath, 'Onest');

const BG_COLOR = '#155DFC';
const SIZE = 512;
// B ietsje kleiner dan voorheen
const FONT_SIZE = 280;

function createIcon() {
  const canvas = createCanvas(SIZE, SIZE);
  const ctx = canvas.getContext('2d');

  // Achtergrond
  ctx.fillStyle = BG_COLOR;
  ctx.fillRect(0, 0, SIZE, SIZE);

  // Witte B in Onest
  ctx.fillStyle = '#ffffff';
  ctx.font = `${FONT_SIZE}px Onest`;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText('B', SIZE / 2, SIZE / 2);

  return canvas.toBuffer('image/png');
}

;(async () => {
  try {
    const pngBuffer = createIcon();
    fs.writeFileSync(path.join(publicDir, 'icon-512x512.png'), pngBuffer);
    console.log('Generated icon-512x512.png');

    const smallPng = await sharp(pngBuffer).resize(192, 192).toBuffer();
    fs.writeFileSync(path.join(publicDir, 'icon-192x192.png'), smallPng);
    console.log('Generated icon-192x192.png');
  } catch (err) {
    console.error(err);
    process.exit(1);
  }
})();
