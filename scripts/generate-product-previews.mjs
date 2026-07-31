/**
 * Compose top-down bracelet product shots from catalog bead webps (or synthetic beads).
 * Output: public/catalog/products/*.webp
 */
import fs from 'node:fs';
import path from 'node:path';
import sharp from 'sharp';

const ROOT = path.resolve('.');
const BEAD_DIR = path.join(ROOT, 'public/catalog/crystal-single-1019');
const OUT_DIR = path.join(ROOT, 'public/catalog/products');
const SIZE = 1024;
const BEAD_COUNT = 18;
const RING_RADIUS = 300;
const BEAD_SIZE = 148;
const BG = '#fffcf6';

async function loadBead(file) {
	return sharp(path.join(BEAD_DIR, file))
		.resize(BEAD_SIZE, BEAD_SIZE, { fit: 'contain', background: { r: 0, g: 0, b: 0, alpha: 0 } })
		.webp()
		.toBuffer();
}

async function syntheticObsidian() {
	const svg = Buffer.from(`
<svg width="${BEAD_SIZE}" height="${BEAD_SIZE}" xmlns="http://www.w3.org/2000/svg">
  <defs>
    <radialGradient id="g" cx="32%" cy="28%" r="68%">
      <stop offset="0%" stop-color="#5a5a5e"/>
      <stop offset="35%" stop-color="#1a1a1c"/>
      <stop offset="78%" stop-color="#0a0a0b"/>
      <stop offset="100%" stop-color="#000000"/>
    </radialGradient>
    <radialGradient id="shine" cx="30%" cy="26%" r="40%">
      <stop offset="0%" stop-color="#ffffff" stop-opacity="0.45"/>
      <stop offset="55%" stop-color="#ffffff" stop-opacity="0"/>
    </radialGradient>
  </defs>
  <circle cx="${BEAD_SIZE / 2}" cy="${BEAD_SIZE / 2}" r="${BEAD_SIZE * 0.42}" fill="url(#g)"/>
  <circle cx="${BEAD_SIZE / 2}" cy="${BEAD_SIZE / 2}" r="${BEAD_SIZE * 0.42}" fill="url(#shine)"/>
</svg>`);
	return sharp(svg).webp().toBuffer();
}

async function composeBracelet(beadBuffers, outName) {
	const composites = [];
	for (let i = 0; i < BEAD_COUNT; i++) {
		const angle = (i / BEAD_COUNT) * Math.PI * 2 - Math.PI / 2;
		const cx = SIZE / 2 + Math.cos(angle) * RING_RADIUS;
		const cy = SIZE / 2 + Math.sin(angle) * RING_RADIUS;
		composites.push({
			input: beadBuffers[i % beadBuffers.length],
			left: Math.round(cx - BEAD_SIZE / 2),
			top: Math.round(cy - BEAD_SIZE / 2),
		});
	}

	const cordSvg = Buffer.from(`
<svg width="${SIZE}" height="${SIZE}" xmlns="http://www.w3.org/2000/svg">
  <circle cx="${SIZE / 2}" cy="${SIZE / 2}" r="${RING_RADIUS}"
    fill="none" stroke="rgba(90,72,58,0.22)" stroke-width="3"/>
</svg>`);

	await sharp({
		create: {
			width: SIZE,
			height: SIZE,
			channels: 3,
			background: BG,
		},
	})
		.composite([{ input: cordSvg, left: 0, top: 0 }, ...composites])
		.webp({ quality: 82 })
		.toFile(path.join(OUT_DIR, outName));

	console.log(`Wrote ${outName}`);
}

async function main() {
	fs.mkdirSync(OUT_DIR, { recursive: true });

	const moonA = await loadBead('white-moonstone.webp');
	const moonB = await loadBead('blue-moonstone.webp');
	await composeBracelet([moonA, moonB, moonA, moonB, moonA], 'moonstone-bracelet.webp');

	const obsidian = await syntheticObsidian();
	await composeBracelet(Array.from({ length: BEAD_COUNT }, () => obsidian), 'obsidian-bracelet.webp');
}

main().catch((error) => {
	console.error(error);
	process.exit(1);
});
