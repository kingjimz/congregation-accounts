import sharp from 'sharp';
import { readFileSync } from 'fs';

const svg = readFileSync('./static/icon.svg');

await sharp(svg)
	.resize(192, 192)
	.png()
	.toFile('./static/icon-192.png');

await sharp(svg)
	.resize(512, 512)
	.png()
	.toFile('./static/icon-512.png');

console.log('Icons generated successfully!');
