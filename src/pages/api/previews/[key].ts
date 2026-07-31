export const prerender = false;

import type { APIRoute } from 'astro';
import { createServices } from '../../../server/container';

const KEY_RE = /^[a-zA-Z0-9._-]+\.webp$/;

export const GET: APIRoute = async ({ params }) => {
	const key = params.key ?? '';
	if (!KEY_RE.test(key)) {
		return new Response('Not found', { status: 404 });
	}

	const { storage } = createServices();
	const data = await storage.get(key);
	if (!data) {
		return new Response('Not found', { status: 404 });
	}

	return new Response(new Uint8Array(data), {
		status: 200,
		headers: {
			'Content-Type': 'image/webp',
			'Cache-Control': 'private, max-age=3600',
		},
	});
};
