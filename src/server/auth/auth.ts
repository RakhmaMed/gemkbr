import { betterAuth } from 'better-auth';
import { drizzleAdapter } from 'better-auth/adapters/drizzle';
import { getDb } from '../db/client';
import { getEnv } from '../../lib/env';
import * as schema from '../db/schema';

export function createAuth() {
	const env = getEnv();
	return betterAuth({
		database: drizzleAdapter(getDb(), {
			provider: 'sqlite',
			schema: {
				user: schema.user,
				session: schema.session,
				account: schema.account,
				verification: schema.verification,
			},
		}),
		secret: env.BETTER_AUTH_SECRET,
		baseURL: env.BETTER_AUTH_URL,
		emailAndPassword: {
			enabled: true,
			requireEmailVerification: false,
		},
		trustedOrigins: [env.PUBLIC_SITE_URL, `https://${env.DOMAIN}`, `https://www.${env.DOMAIN}`],
	});
}

export type Auth = ReturnType<typeof createAuth>;

let authSingleton: Auth | null = null;

export function getAuth(): Auth {
	if (!authSingleton) authSingleton = createAuth();
	return authSingleton;
}
