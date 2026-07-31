import type { BraceletDesign } from '../../domain/bracelet';

export type CartItemRecord = {
	id: string;
	cartId: string;
	kind: 'product' | 'custom_bracelet';
	productVariantId: string | null;
	designId: string | null;
	design: BraceletDesign | null;
	previewKey: string | null;
	title: string;
	qty: number;
	unitPriceMinor: number;
	createdAt: Date;
};

export type CartRecord = {
	id: string;
	userId: string | null;
	guestToken: string | null;
	updatedAt: Date;
	items: CartItemRecord[];
};

export interface CartRepository {
	getById(id: string): Promise<CartRecord | null>;
	getByGuestToken(token: string): Promise<CartRecord | null>;
	getByUserId(userId: string): Promise<CartRecord | null>;
	saveCart(cart: Omit<CartRecord, 'items'>): Promise<void>;
	replaceItems(cartId: string, items: CartItemRecord[]): Promise<void>;
	clearItems(cartId: string): Promise<void>;
}
