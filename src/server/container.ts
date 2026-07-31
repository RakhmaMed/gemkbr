import { getDb } from './db/client';
import { getEnv } from '../lib/env';
import { LocalFilesystemStorage } from './storage/storage';
import { SqliteCartRepository } from './repositories/sqlite-cart-repository';
import { SqliteCatalogRepository } from './repositories/sqlite-catalog-repository';
import { SqliteDesignRepository } from './repositories/sqlite-design-repository';
import { SqliteOrderRepository } from './repositories/sqlite-order-repository';
import { CartService } from '../application/cart/cart-service';
import { DesignService } from '../application/designs/design-service';
import { OrderService } from '../application/orders/order-service';

export function createServices() {
	const db = getDb();
	const catalog = new SqliteCatalogRepository(db);
	const designsRepo = new SqliteDesignRepository(db);
	const cartsRepo = new SqliteCartRepository(db);
	const ordersRepo = new SqliteOrderRepository(db);
	const designs = new DesignService(catalog, designsRepo);
	const carts = new CartService(cartsRepo, catalog, designs);
	const orders = new OrderService(cartsRepo, catalog, ordersRepo, designs);
	const storage = new LocalFilesystemStorage(getEnv().PREVIEWS_DIR);

	return {
		db,
		catalog,
		designsRepo,
		cartsRepo,
		ordersRepo,
		designs,
		carts,
		orders,
		storage,
	};
}
