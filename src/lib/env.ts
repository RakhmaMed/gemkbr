import { z } from 'zod';

const envSchema = z.object({
	NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
	HOST: z.string().default('0.0.0.0'),
	PORT: z.coerce.number().default(4321),
	DOMAIN: z.string().default('gemkbr.ru'),
	PUBLIC_SITE_URL: z.string().url().default('http://localhost:4321'),
	DATABASE_PATH: z.string().default('./data/app.db'),
	DATA_DIR: z.string().default('./data'),
	PREVIEWS_DIR: z.string().default('./data/previews'),
	BETTER_AUTH_SECRET: z.string().min(16).default('dev-only-change-me-to-a-long-random-string'),
	BETTER_AUTH_URL: z.string().url().default('http://localhost:4321'),
	ORDER_NOTIFIER_MODE: z.enum(['console', 'pii_safe', 'full']).default('console'),
});

export type AppEnv = z.infer<typeof envSchema>;

let cached: AppEnv | null = null;

export function getEnv(): AppEnv {
	if (cached) return cached;
	cached = envSchema.parse(process.env);
	return cached;
}
