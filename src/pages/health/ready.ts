export const prerender = false;

export async function GET() {
	try {
		const { pingDb } = await import('../../server/db/client');
		const ok = pingDb();
		if (!ok) {
			return new Response(JSON.stringify({ status: 'not_ready' }), {
				status: 503,
				headers: { 'content-type': 'application/json' },
			});
		}
		return new Response(JSON.stringify({ status: 'ready' }), {
			status: 200,
			headers: { 'content-type': 'application/json' },
		});
	} catch {
		return new Response(JSON.stringify({ status: 'not_ready' }), {
			status: 503,
			headers: { 'content-type': 'application/json' },
		});
	}
}
