#!/usr/bin/env node
/**
 * Generates seed/components.json and seed/component-variants.json
 * from the crystal catalog image list.
 */
import fs from 'node:fs';
import path from 'node:path';

const IMAGE_BASE = '/catalog/crystal-single-1019';

const SIZES = [
	{ mm: 6, priceMinor: 20000 },
	{ mm: 8, priceMinor: 24000 },
	{ mm: 10, priceMinor: 32000 },
	{ mm: 12, priceMinor: 40000 },
];

/** @type {Array<{ colorGroup: string; crystals: Array<{ slug: string; name: string }> }>} */
const GROUPS = [
	{
		colorGroup: 'clear-white',
		crystals: [
			{ slug: 'hetian-white-jade', name: 'Хотянский белый нефрит' },
			{ slug: 'white-rabbit-hair-quartz', name: 'Белый кварц «волосатик»' },
			{ slug: 'white-phantom-quartz', name: 'Белый фантомный кварц' },
			{ slug: 'white-moonstone', name: 'Белый лунный камень' },
			{ slug: 'clear-quartz', name: 'Горный хрусталь' },
			{ slug: 'white-chalcedony', name: 'Белый халцедон' },
			{ slug: 'white-fluorite', name: 'Белый флюорит' },
			{ slug: 'white-azeztulite', name: 'Белый азезулит' },
			{ slug: 'silver-rutilated-quartz', name: 'Серебристый волосатик' },
			{ slug: 'snowflake-phantom-quartz', name: 'Снежный фантомный кварц' },
		],
	},
	{
		colorGroup: 'pink',
		crystals: [{ slug: 'madagascar-rose-quartz', name: 'Мадагаскарский розовый кварц' }],
	},
	{
		colorGroup: 'red',
		crystals: [
			{ slug: 'red-rutilated-quartz', name: 'Красный волосатик' },
			{ slug: 'red-fire-quartz', name: 'Красный огненный кварц' },
		],
	},
	{
		colorGroup: 'yellow-gold',
		crystals: [
			{ slug: 'golden-rutilated-quartz', name: 'Золотой волосатик' },
			{ slug: 'gold-tiger-eye', name: 'Золотой тигровый глаз' },
			{ slug: 'golden-luck-stone', name: 'Золотой камень удачи' },
			{ slug: 'golden-titanium-rutilated-quartz', name: 'Золотой титановый волосатик' },
			{ slug: 'titanium-flower-quartz', name: 'Титановый цветочный кварц' },
			{ slug: 'yellow-rabbit-hair-quartz', name: 'Жёлтый кварц «волосатик»' },
			{ slug: 'yellow-tower-quartz', name: 'Жёлтый башенный кварц' },
			{ slug: 'citrine', name: 'Цитрин' },
			{ slug: 'yellow-fire-quartz', name: 'Жёлтый огненный кварц' },
			{ slug: 'yellow-fluorite', name: 'Жёлтый флюорит' },
			{ slug: 'yellow-tiger-eye', name: 'Жёлтый тигровый глаз' },
		],
	},
	{
		colorGroup: 'green',
		crystals: [{ slug: 'prehnite', name: 'Пренит' }],
	},
	{
		colorGroup: 'blue',
		crystals: [
			{ slug: 'blue-moonstone', name: 'Голубой лунный камень' },
			{ slug: 'blue-tiger-eye', name: 'Синий тигровый глаз' },
		],
	},
	{
		colorGroup: 'purple',
		crystals: [
			{ slug: 'bolivian-amethyst', name: 'Боливийский аметист' },
			{ slug: 'uruguay-amethyst', name: 'Уругвайский аметист' },
			{ slug: 'brazilian-amethyst', name: 'Бразильский аметист' },
			{ slug: 'auralite-23', name: 'Ауралит 23' },
			{ slug: 'ametrine', name: 'Аметрин' },
			{ slug: 'super-seven', name: 'Супер Севен' },
		],
	},
];

const components = [];
const variants = [];

for (const group of GROUPS) {
	for (const crystal of group.crystals) {
		const id = `comp-${crystal.slug}`;
		components.push({
			id,
			slug: crystal.slug,
			name: crystal.name,
			kind: 'bead',
			material: 'crystal',
			colorGroup: group.colorGroup,
			imageUrl: `${IMAGE_BASE}/${crystal.slug}.webp`,
			tags: ['stone', 'crystal', group.colorGroup],
			active: true,
		});

		for (const size of SIZES) {
			variants.push({
				id: `${crystal.slug}-${size.mm}`,
				componentId: id,
				sku: `${crystal.slug.slice(0, 12).toUpperCase().replace(/-/g, '')}-${size.mm}`,
				diameterMm: size.mm,
				axialLengthMm: size.mm,
				priceMinor: size.priceMinor,
				visualPresetId: 'polished-stone',
				stockQuantity: 200,
				active: true,
			});
		}
	}
}

// Keep non-crystal hardware
components.push(
	{
		id: 'comp-silver-spacer',
		slug: 'silver-spacer',
		name: 'Серебряный разделитель',
		kind: 'spacer',
		material: 'metal',
		colorGroup: 'silver',
		imageUrl: '',
		tags: ['metal'],
		active: true,
	},
	{
		id: 'comp-heart-charm',
		slug: 'heart-charm',
		name: 'Подвеска-сердце',
		kind: 'charm',
		material: 'metal',
		colorGroup: 'gold',
		imageUrl: '',
		tags: ['charm'],
		active: true,
	},
);

variants.push(
	{
		id: 'silver-spacer-3',
		componentId: 'comp-silver-spacer',
		sku: 'SS-3',
		diameterMm: 10,
		axialLengthMm: 3,
		priceMinor: 5000,
		visualPresetId: 'metal',
		stockQuantity: 300,
		active: true,
	},
	{
		id: 'heart-charm-1',
		componentId: 'comp-heart-charm',
		sku: 'HC-1',
		diameterMm: 10,
		axialLengthMm: 4,
		priceMinor: 25000,
		visualPresetId: 'metal',
		stockQuantity: 50,
		active: true,
	},
);

const seedDir = path.resolve('seed');
fs.writeFileSync(path.join(seedDir, 'components.json'), `${JSON.stringify(components, null, 2)}\n`);
fs.writeFileSync(
	path.join(seedDir, 'component-variants.json'),
	`${JSON.stringify(variants, null, 2)}\n`,
);
console.log(`Wrote ${components.length} components, ${variants.length} variants`);
