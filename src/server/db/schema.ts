import { integer, sqliteTable, text } from 'drizzle-orm/sqlite-core';

export const categories = sqliteTable('categories', {
	id: text('id').primaryKey(),
	slug: text('slug').notNull().unique(),
	name: text('name').notNull(),
	sortOrder: integer('sort_order').notNull().default(0),
});

export const products = sqliteTable('products', {
	id: text('id').primaryKey(),
	slug: text('slug').notNull().unique(),
	name: text('name').notNull(),
	description: text('description').notNull().default(''),
	categoryId: text('category_id').references(() => categories.id),
	imageUrl: text('image_url').notNull().default(''),
	active: integer('active', { mode: 'boolean' }).notNull().default(true),
});

export const productVariants = sqliteTable('product_variants', {
	id: text('id').primaryKey(),
	productId: text('product_id')
		.notNull()
		.references(() => products.id),
	sku: text('sku').notNull().unique(),
	priceMinor: integer('price_minor').notNull(),
	stockQuantity: integer('stock_quantity'),
	active: integer('active', { mode: 'boolean' }).notNull().default(true),
});

export const components = sqliteTable('components', {
	id: text('id').primaryKey(),
	slug: text('slug').notNull().unique(),
	name: text('name').notNull(),
	kind: text('kind').notNull(), // bead | spacer | charm
	material: text('material').notNull().default(''),
	colorGroup: text('color_group').notNull().default(''),
	imageUrl: text('image_url').notNull().default(''),
	tagsJson: text('tags_json').notNull().default('[]'),
	active: integer('active', { mode: 'boolean' }).notNull().default(true),
});

export const componentVariants = sqliteTable('component_variants', {
	id: text('id').primaryKey(),
	componentId: text('component_id')
		.notNull()
		.references(() => components.id),
	sku: text('sku').notNull().unique(),
	diameterMm: integer('diameter_mm').notNull(),
	axialLengthMm: integer('axial_length_mm').notNull(),
	priceMinor: integer('price_minor').notNull(),
	visualPresetId: text('visual_preset_id').notNull().default('polished-stone'),
	stockQuantity: integer('stock_quantity'),
	active: integer('active', { mode: 'boolean' }).notNull().default(true),
});

export const braceletTemplates = sqliteTable('bracelet_templates', {
	id: text('id').primaryKey(),
	name: text('name').notNull(),
	fitAllowanceMm: integer('fit_allowance_mm').notNull().default(8),
	minWristMm: integer('min_wrist_mm').notNull().default(130),
	maxWristMm: integer('max_wrist_mm').notNull().default(220),
	configJson: text('config_json').notNull().default('{}'),
	active: integer('active', { mode: 'boolean' }).notNull().default(true),
});

export const braceletDesigns = sqliteTable('bracelet_designs', {
	id: text('id').primaryKey(),
	userId: text('user_id'),
	templateId: text('template_id')
		.notNull()
		.references(() => braceletTemplates.id),
	targetWristMm: integer('target_wrist_mm').notNull(),
	configJson: text('config_json').notNull(),
	previewKey: text('preview_key'),
	priceMinorCached: integer('price_minor_cached').notNull().default(0),
	createdAt: integer('created_at', { mode: 'timestamp_ms' }).notNull(),
	updatedAt: integer('updated_at', { mode: 'timestamp_ms' }).notNull(),
});

export const carts = sqliteTable('carts', {
	id: text('id').primaryKey(),
	userId: text('user_id'),
	guestToken: text('guest_token'),
	updatedAt: integer('updated_at', { mode: 'timestamp_ms' }).notNull(),
});

export const cartItems = sqliteTable('cart_items', {
	id: text('id').primaryKey(),
	cartId: text('cart_id')
		.notNull()
		.references(() => carts.id),
	kind: text('kind').notNull(), // product | custom_bracelet
	productVariantId: text('product_variant_id').references(() => productVariants.id),
	designId: text('design_id').references(() => braceletDesigns.id),
	designJson: text('design_json'),
	previewKey: text('preview_key'),
	title: text('title').notNull().default(''),
	qty: integer('qty').notNull().default(1),
	unitPriceMinor: integer('unit_price_minor').notNull().default(0),
	createdAt: integer('created_at', { mode: 'timestamp_ms' }).notNull(),
});

export const wishlistItems = sqliteTable('wishlist_items', {
	id: text('id').primaryKey(),
	userId: text('user_id').notNull(),
	productVariantId: text('product_variant_id').references(() => productVariants.id),
	designId: text('design_id').references(() => braceletDesigns.id),
	createdAt: integer('created_at', { mode: 'timestamp_ms' }).notNull(),
});

export const orders = sqliteTable('orders', {
	id: text('id').primaryKey(),
	number: text('number').notNull().unique(),
	userId: text('user_id'),
	status: text('status').notNull().default('new'),
	customerName: text('customer_name').notNull(),
	customerPhone: text('customer_phone').notNull(),
	consentAt: integer('consent_at', { mode: 'timestamp_ms' }).notNull(),
	totalMinor: integer('total_minor').notNull(),
	currency: text('currency').notNull().default('RUB'),
	createdAt: integer('created_at', { mode: 'timestamp_ms' }).notNull(),
});

export const orderItems = sqliteTable('order_items', {
	id: text('id').primaryKey(),
	orderId: text('order_id')
		.notNull()
		.references(() => orders.id),
	kind: text('kind').notNull(),
	title: text('title').notNull(),
	qty: integer('qty').notNull(),
	priceMinor: integer('price_minor').notNull(),
	snapshotJson: text('snapshot_json').notNull(),
});

export const orderEvents = sqliteTable('order_events', {
	id: text('id').primaryKey(),
	orderId: text('order_id')
		.notNull()
		.references(() => orders.id),
	type: text('type').notNull(),
	payloadJson: text('payload_json').notNull().default('{}'),
	createdAt: integer('created_at', { mode: 'timestamp_ms' }).notNull(),
});

export const notificationOutbox = sqliteTable('notification_outbox', {
	id: text('id').primaryKey(),
	type: text('type').notNull(),
	payloadJson: text('payload_json').notNull(),
	status: text('status').notNull().default('pending'),
	attempts: integer('attempts').notNull().default(0),
	nextAttemptAt: integer('next_attempt_at', { mode: 'timestamp_ms' }).notNull(),
	lastError: text('last_error'),
	createdAt: integer('created_at', { mode: 'timestamp_ms' }).notNull(),
	sentAt: integer('sent_at', { mode: 'timestamp_ms' }),
});

// Better Auth tables
export const user = sqliteTable('user', {
	id: text('id').primaryKey(),
	name: text('name').notNull(),
	email: text('email').notNull().unique(),
	emailVerified: integer('email_verified', { mode: 'boolean' }).notNull().default(false),
	image: text('image'),
	createdAt: integer('created_at', { mode: 'timestamp_ms' }).notNull(),
	updatedAt: integer('updated_at', { mode: 'timestamp_ms' }).notNull(),
});

export const session = sqliteTable('session', {
	id: text('id').primaryKey(),
	expiresAt: integer('expires_at', { mode: 'timestamp_ms' }).notNull(),
	token: text('token').notNull().unique(),
	createdAt: integer('created_at', { mode: 'timestamp_ms' }).notNull(),
	updatedAt: integer('updated_at', { mode: 'timestamp_ms' }).notNull(),
	ipAddress: text('ip_address'),
	userAgent: text('user_agent'),
	userId: text('user_id')
		.notNull()
		.references(() => user.id),
});

export const account = sqliteTable('account', {
	id: text('id').primaryKey(),
	accountId: text('account_id').notNull(),
	providerId: text('provider_id').notNull(),
	userId: text('user_id')
		.notNull()
		.references(() => user.id),
	accessToken: text('access_token'),
	refreshToken: text('refresh_token'),
	idToken: text('id_token'),
	accessTokenExpiresAt: integer('access_token_expires_at', { mode: 'timestamp_ms' }),
	refreshTokenExpiresAt: integer('refresh_token_expires_at', { mode: 'timestamp_ms' }),
	scope: text('scope'),
	password: text('password'),
	createdAt: integer('created_at', { mode: 'timestamp_ms' }).notNull(),
	updatedAt: integer('updated_at', { mode: 'timestamp_ms' }).notNull(),
});

export const verification = sqliteTable('verification', {
	id: text('id').primaryKey(),
	identifier: text('identifier').notNull(),
	value: text('value').notNull(),
	expiresAt: integer('expires_at', { mode: 'timestamp_ms' }).notNull(),
	createdAt: integer('created_at', { mode: 'timestamp_ms' }),
	updatedAt: integer('updated_at', { mode: 'timestamp_ms' }),
});
