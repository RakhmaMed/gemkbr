/**
 * Compose top-down bracelet product shots from catalog bead webps.
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

	const black = await loadBead('black-obsidian.webp');
	const silver = await loadBead('silver-obsidian.webp');
	const gold = await loadBead('gold-obsidian.webp');
	// Mostly black with silver/gold sheen accents — matches the minimalist Obsidian product.
	await composeBracelet([black, black, silver, black, black, gold], 'obsidian-bracelet.webp');
}

main().catch((error) => {
	console.error(error);
	process.exit(1);
});
