import { describe, it, expect, vi, beforeEach } from 'vitest';
import fixture from '../../fixtures/nodejs-dist.json';
import { fetchNodejs } from '$lib/fetchers/nodejs.js';
import type { PackageConfig } from '$lib/types.js';

const config: PackageConfig = {
	name: 'Node.js',
	source: 'nodejs',
	category: 'Languages',
	url: 'https://nodejs.org/en/about/previous-releases'
};

beforeEach(() => {
	vi.restoreAllMocks();
});

describe('fetchNodejs', () => {
	it('strips v prefix from versions', async () => {
		vi.spyOn(globalThis, 'fetch').mockResolvedValueOnce(
			new Response(JSON.stringify(fixture), { status: 200 })
		);

		const result = await fetchNodejs(config);

		expect(result.latest?.version).toBe('25.8.1');
		expect(result.releases.every((r) => !r.version.startsWith('v'))).toBe(true);
	});

	it('identifies LTS releases', async () => {
		vi.spyOn(globalThis, 'fetch').mockResolvedValueOnce(
			new Response(JSON.stringify(fixture), { status: 200 })
		);

		const result = await fetchNodejs(config);

		const lts = result.releases.filter((r) => r.lts !== false);
		expect(lts).toHaveLength(3);
		expect(lts[0].lts).toBe('Krypton');
	});

	it('sets latestStable to first LTS release', async () => {
		vi.spyOn(globalThis, 'fetch').mockResolvedValueOnce(
			new Response(JSON.stringify(fixture), { status: 200 })
		);

		const result = await fetchNodejs(config);
		expect(result.latestStable?.version).toBe('24.14.0');
		expect(result.latestStable?.lts).toBe('Krypton');
	});

	it('returns error on API failure', async () => {
		vi.spyOn(globalThis, 'fetch').mockResolvedValueOnce(
			new Response('', { status: 500 })
		);

		await expect(fetchNodejs(config)).rejects.toThrow('500');
	});
});
