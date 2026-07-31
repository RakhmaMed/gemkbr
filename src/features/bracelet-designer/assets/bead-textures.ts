import { SRGBColorSpace, Texture, TextureLoader } from 'three';

const loader = new TextureLoader();
const cache = new Map<string, Promise<Texture>>();

export function loadBeadTexture(url: string): Promise<Texture> {
	const existing = cache.get(url);
	if (existing) return existing;

	const promise = new Promise<Texture>((resolve, reject) => {
		loader.load(
			url,
			(texture) => {
				texture.colorSpace = SRGBColorSpace;
				texture.anisotropy = 8;
				texture.needsUpdate = true;
				resolve(texture);
			},
			undefined,
			(error) => {
				cache.delete(url);
				reject(error);
			},
		);
	});

	cache.set(url, promise);
	return promise;
}
