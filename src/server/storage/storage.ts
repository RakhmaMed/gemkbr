export interface Storage {
	put(key: string, data: Buffer, contentType: string): Promise<string>;
	get(key: string): Promise<Buffer | null>;
	exists(key: string): Promise<boolean>;
}

export class LocalFilesystemStorage implements Storage {
	constructor(private readonly rootDir: string) {}

	private pathFor(key: string): string {
		const safe = key.replace(/[^a-zA-Z0-9._/-]/g, '_');
		return `${this.rootDir}/${safe}`;
	}

	async put(key: string, data: Buffer, _contentType: string): Promise<string> {
		const fs = await import('node:fs/promises');
		const path = await import('node:path');
		const full = this.pathFor(key);
		await fs.mkdir(path.dirname(full), { recursive: true });
		await fs.writeFile(full, data);
		return key;
	}

	async get(key: string): Promise<Buffer | null> {
		const fs = await import('node:fs/promises');
		try {
			return await fs.readFile(this.pathFor(key));
		} catch {
			return null;
		}
	}

	async exists(key: string): Promise<boolean> {
		const fs = await import('node:fs/promises');
		try {
			await fs.access(this.pathFor(key));
			return true;
		} catch {
			return false;
		}
	}
}
