const site = 'https://gemkbr.ru';

export async function GET() {
	const urls = ['/', '/catalog', '/designer/bracelet', '/cart', '/account'];
	const body = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${urls
	.map(
		(path) => `  <url><loc>${site}${path}</loc><changefreq>weekly</changefreq></url>`,
	)
	.join('\n')}
</urlset>`;
	return new Response(body, {
		headers: { 'content-type': 'application/xml; charset=utf-8' },
	});
}
