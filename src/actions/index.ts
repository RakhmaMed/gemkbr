import { defineAction } from 'astro:actions';
import { z } from 'astro:schema';
import { createServices } from '../server/container';
import { getAuth } from '../server/auth/auth';
import { createId } from '../lib/id';
import type { BraceletDesign } from '../domain/bracelet';

const designSchema = z.object({
	schemaVersion: z.literal(1),
	templateId: z.string().min(1),
	targetWristMm: z.number().int().positive(),
	items: z.array(
		z.object({
			id: z.string().min(1),
			variantId: z.string().min(1),
		}),
	),
});

async function sessionUserId(request: Request): Promise<string | null> {
	const session = await getAuth().api.getSession({ headers: request.headers });
	return session?.user?.id ?? null;
}

function getGuestToken(cookies: { get: (name: string) => { value: string } | undefined; set: (name: string, value: string, opts: object) => void }) {
	const existing = cookies.get('cart_token')?.value;
	if (existing) return existing;
	const token = createId();
	cookies.set('cart_token', token, {
		path: '/',
		httpOnly: true,
		sameSite: 'lax',
		secure: import.meta.env.PROD,
		maxAge: 60 * 60 * 24 * 30,
	});
	return token;
}

export const server = {
	saveDesign: defineAction({
		input: z.object({
			design: designSchema,
			designId: z.string().optional(),
			previewDataUrl: z.string().optional(),
		}),
		async handler(input, context) {
			const services = createServices();
			const userId = await sessionUserId(context.request);
			let previewKey: string | null = null;
			if (input.previewDataUrl?.startsWith('data:image/')) {
				const sharp = (await import('sharp')).default;
				const base64 = input.previewDataUrl.split(',')[1];
				if (base64) {
					const buffer = Buffer.from(base64, 'base64');
					if (buffer.byteLength > 2_000_000) {
						throw new Error('Preview too large');
					}
					const webp = await sharp(buffer).webp({ quality: 80 }).toBuffer();
					previewKey = `design-${createId()}.webp`;
					await services.storage.put(previewKey, webp, 'image/webp');
				}
			}
			return services.designs.saveDesign({
				design: input.design as BraceletDesign,
				userId,
				designId: input.designId,
				previewKey,
			});
		},
	}),

	addToCart: defineAction({
		input: z.object({
			kind: z.enum(['product', 'custom_bracelet']),
			productVariantId: z.string().optional(),
			design: designSchema.optional(),
			previewDataUrl: z.string().optional(),
		}),
		async handler(input, context) {
			const services = createServices();
			const userId = await sessionUserId(context.request);
			const guestToken = getGuestToken(context.cookies);
			const cart = userId
				? await services.carts.getOrCreateUserCart(userId)
				: await services.carts.getOrCreateGuestCart(guestToken);

			if (input.kind === 'product') {
				if (!input.productVariantId) throw new Error('productVariantId required');
				const updated = await services.carts.addProduct(cart.id, input.productVariantId, 1);
				return { ok: true, cart: updated };
			}

			if (!input.design) throw new Error('design required');
			let previewKey: string | null = null;
			if (input.previewDataUrl?.startsWith('data:image/')) {
				const sharp = (await import('sharp')).default;
				const base64 = input.previewDataUrl.split(',')[1];
				if (base64) {
					const buffer = Buffer.from(base64, 'base64');
					const webp = await sharp(buffer).webp({ quality: 80 }).toBuffer();
					previewKey = `cart-${createId()}.webp`;
					await services.storage.put(previewKey, webp, 'image/webp');
				}
			}
			return services.carts.addCustomBracelet(cart.id, input.design as BraceletDesign, previewKey);
		},
	}),

	removeFromCart: defineAction({
		input: z.object({ itemId: z.string() }),
		async handler(input, context) {
			const services = createServices();
			const userId = await sessionUserId(context.request);
			const guestToken = context.cookies.get('cart_token')?.value;
			const cart = userId
				? await services.cartsRepo.getByUserId(userId)
				: guestToken
					? await services.cartsRepo.getByGuestToken(guestToken)
					: null;
			if (!cart) return { ok: false, error: 'Cart not found' };
			const updated = await services.carts.removeItem(cart.id, input.itemId);
			return { ok: true, cart: updated };
		},
	}),

	createOrder: defineAction({
		input: z.object({
			customerName: z.string().min(2).max(120),
			customerPhone: z.string().min(6).max(32),
			consent: z.boolean(),
		}),
		async handler(input, context) {
			const services = createServices();
			const userId = await sessionUserId(context.request);
			const guestToken = context.cookies.get('cart_token')?.value;
			const cart = userId
				? await services.cartsRepo.getByUserId(userId)
				: guestToken
					? await services.cartsRepo.getByGuestToken(guestToken)
					: null;
			if (!cart) return { ok: false, error: 'Корзина не найдена' };
			return services.orders.createOrder({
				cartId: cart.id,
				userId,
				customerName: input.customerName,
				customerPhone: input.customerPhone,
				consent: input.consent,
			});
		},
	}),
};
