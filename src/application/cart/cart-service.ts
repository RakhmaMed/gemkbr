import type { BraceletDesign } from '../../domain/bracelet';
import { createId } from '../../lib/id';
import type { CartItemRecord, CartRepository } from '../../server/repositories/cart-repository';
import type { CatalogRepository } from '../../server/repositories/catalog-repository';
import { DesignService } from '../designs/design-service';

export class CartService {
	constructor(
		private readonly carts: CartRepository,
		private readonly catalog: CatalogRepository,
		private readonly designs: DesignService,
	) {}

	async getOrCreateGuestCart(guestToken: string) {
		const existing = await this.carts.getByGuestToken(guestToken);
		if (existing) return existing;
		const cart = {
			id: createId(),
			userId: null,
			guestToken,
			updatedAt: new Date(),
		};
		await this.carts.saveCart(cart);
		return { ...cart, items: [] as CartItemRecord[] };
	}

	async getOrCreateUserCart(userId: string) {
		const existing = await this.carts.getByUserId(userId);
		if (existing) return existing;
		const cart = {
			id: createId(),
			userId,
			guestToken: null,
			updatedAt: new Date(),
		};
		await this.carts.saveCart(cart);
		return { ...cart, items: [] as CartItemRecord[] };
	}

	async mergeGuestIntoUser(guestToken: string, userId: string) {
		const guest = await this.carts.getByGuestToken(guestToken);
		const userCart = await this.getOrCreateUserCart(userId);
		if (!guest || guest.items.length === 0) return userCart;
		const merged = [...userCart.items, ...guest.items.map((item) => ({ ...item, cartId: userCart.id, id: createId() }))];
		await this.carts.replaceItems(userCart.id, merged);
		await this.carts.clearItems(guest.id);
		return (await this.carts.getById(userCart.id))!;
	}

	async addProduct(cartId: string, productVariantId: string, qty = 1) {
		const cart = await this.carts.getById(cartId);
		if (!cart) throw new Error('Cart not found');
		const products = await this.catalog.listActiveProducts();
		const variant = products.flatMap((p) => p.variants.map((v) => ({ product: p, variant: v }))).find(
			(entry) => entry.variant.id === productVariantId,
		);
		if (!variant || !variant.variant.active) throw new Error('Product variant unavailable');

		const items = [...cart.items];
		const existing = items.find(
			(item) => item.kind === 'product' && item.productVariantId === productVariantId,
		);
		if (existing) {
			existing.qty += qty;
		} else {
			items.push({
				id: createId(),
				cartId,
				kind: 'product',
				productVariantId,
				designId: null,
				design: null,
				previewKey: null,
				title: variant.product.name,
				qty,
				unitPriceMinor: variant.variant.priceMinor,
				createdAt: new Date(),
			});
		}
		await this.carts.replaceItems(cartId, items);
		await this.carts.saveCart({
			id: cart.id,
			userId: cart.userId,
			guestToken: cart.guestToken,
			updatedAt: new Date(),
		});
		return this.carts.getById(cartId);
	}

	async addCustomBracelet(cartId: string, design: BraceletDesign, previewKey?: string | null) {
		const priced = await this.designs.priceAndValidate(design);
		if (!priced.validation.ok) {
			return { ok: false as const, issues: priced.validation.issues };
		}
		const cart = await this.carts.getById(cartId);
		if (!cart) throw new Error('Cart not found');
		const items = [
			...cart.items,
			{
				id: createId(),
				cartId,
				kind: 'custom_bracelet' as const,
				productVariantId: null,
				designId: null,
				design,
				previewKey: previewKey ?? null,
				title: `Браслет на ${design.targetWristMm} мм`,
				qty: 1,
				unitPriceMinor: priced.priceMinor,
				createdAt: new Date(),
			},
		];
		await this.carts.replaceItems(cartId, items);
		await this.carts.saveCart({
			id: cart.id,
			userId: cart.userId,
			guestToken: cart.guestToken,
			updatedAt: new Date(),
		});
		return { ok: true as const, cart: await this.carts.getById(cartId), priceMinor: priced.priceMinor };
	}

	async removeItem(cartId: string, itemId: string) {
		const cart = await this.carts.getById(cartId);
		if (!cart) throw new Error('Cart not found');
		await this.carts.replaceItems(
			cartId,
			cart.items.filter((item) => item.id !== itemId),
		);
		return this.carts.getById(cartId);
	}
}
