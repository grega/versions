import { describe, it, expect, vi, beforeEach } from 'vitest';
import fixture from '../../fixtures/endoflife-python.json';
import { fetchEndOfLife } from '$lib/fetchers/endoflife.js';
import type { PackageConfig } from '$lib/types.js';

const config: PackageConfig = {
	name: 'Python',
	source: 'endoflife',
	product: 'python',
	categories: ['Languages'],
	url: 'https://www.python.org/downloads/'
};

beforeEach(() => {
	vi.restoreAllMocks();
});

describe('fetchEndOfLife', () => {
	it('returns latest patch version per cycle', async () => {
		vi.spyOn(globalThis, 'fetch').mockResolvedValueOnce(
			new Response(JSON.stringify(fixture), { status: 200 })
		);

		const result = await fetchEndOfLife(config);

		expect(result.latest?.version).toBe('3.14.3');
		expect(result.latest?.date).toBe('2026-02-03');
		expect(result.releases).toHaveLength(3);
	});

	it('uses latestReleaseDate for each cycle', async () => {
		vi.spyOn(globalThis, 'fetch').mockResolvedValueOnce(
			new Response(JSON.stringify(fixture), { status: 200 })
		);

		const result = await fetchEndOfLife(config);

		expect(result.releases[2].version).toBe('3.12.13');
		expect(result.releases[2].date).toBe('2026-03-03');
	});

	it('returns error on API failure', async () => {
		vi.spyOn(globalThis, 'fetch').mockResolvedValueOnce(
			new Response('', { status: 404 })
		);

		await expect(fetchEndOfLife(config)).rejects.toThrow('404');
	});
});
