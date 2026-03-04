import { createCanvas } from 'canvas';
import { writeFileSync, mkdirSync } from 'fs';
import { dirname } from 'path';

// Create a 256x256 icon with the plant emoji
const size = 256;
const canvas = createCanvas(size, size);
const ctx = canvas.getContext('2d');

// Transparent background
ctx.clearRect(0, 0, size, size);

// Draw the emoji
ctx.font = `${size * 0.8}px "Apple Color Emoji"`;
ctx.textAlign = 'center';
ctx.textBaseline = 'middle';
ctx.fillText('🪴', size / 2, size / 2 + 10);

// Save as PNG
const buffer = canvas.toBuffer('image/png');
const outputPath = new URL('../assets/icon.png', import.meta.url).pathname;

mkdirSync(dirname(outputPath), { recursive: true });
writeFileSync(outputPath, buffer);

console.log('✓ Icon generated at assets/icon.png');
