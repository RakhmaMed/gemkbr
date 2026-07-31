export interface WishlistRepository {
	list(userId: string): Promise<Array<{ id: string; productVariantId: string | null; designId: string | null }>>;
	toggleProduct(userId: string, productVariantId: string): Promise<{ added: boolean }>;
}
