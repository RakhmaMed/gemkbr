import { defineMiddleware } from 'astro:middleware';
import { createId } from './lib/id';
import { logger } from './server/logging/logger';

export const onRequest = defineMiddleware(async (context, next) => {
	const requestId = createId();
	const started = Date.now();
	context.locals.requestId = requestId;

	try {
		const response = await next();
		logger.info({
			requestId,
			route: context.url.pathname,
			status: response.status,
			duration: Date.now() - started,
		});
		response.headers.set('x-request-id', requestId);
		return response;
	} catch (error) {
		logger.error({
			requestId,
			route: context.url.pathname,
			duration: Date.now() - started,
			err: error instanceof Error ? error.message : 'unknown',
		});
		throw error;
	}
});

declare global {
	namespace App {
		interface Locals {
			requestId: string;
		}
	}
}
