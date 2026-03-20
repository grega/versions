import { describe, it, expect, vi, beforeEach } from 'vitest';
import fixture from '../../fixtures/rubygems-versions.json';
import { fetchRubyGems } from '$lib/fetchers/rubygems.js';
import type { PackageConfig } from '$lib/types.js';

const config: PackageConfig = {
	name: 'Rails',
	source: 'rubygems',
	gem: 'rails',
	category: 'Frameworks',
	url: 'https://rubygems.org/gems/rails'
};

beforeEach(() => {
	vi.restoreAllMocks();
});

describe('fetchRubyGems', () => {
	it('parses versions and identifies prereleases', async () => {
		vi.spyOn(globalThis, 'fetch').mockResolvedValueOnce(
			new Response(JSON.stringify(fixture), { status: 200 })
		);

		const result = await fetchRubyGems(config);

		expect(result.name).toBe('Rails');
		expect(result.error).toBeUndefined();
		expect(result.releases).toHaveLength(5);

		expect(result.latestStable?.version).toBe('8.1.2');
		expect(result.latestStable?.date).toBe('2026-01-08');

		const rc = result.releases.find((r) => r.version === '8.1.0.rc1');
		expect(rc?.prerelease).toBe(true);

		const stable = result.releases.filter((r) => !r.prerelease);
		expect(stable).toHaveLength(4);
	});

	it('builds correct rubygems URLs', async () => {
		vi.spyOn(globalThis, 'fetch').mockResolvedValueOnce(
			new Response(JSON.stringify(fixture), { status: 200 })
		);

		const result = await fetchRubyGems(config);
		expect(result.releases[0].url).toBe('https://rubygems.org/gems/rails/versions/8.1.2');
	});

	it('returns error on API failure', async () => {
		vi.spyOn(globalThis, 'fetch').mockResolvedValueOnce(
			new Response('', { status: 404 })
		);

		await expect(fetchRubyGems(config)).rejects.toThrow('404');
	});
});
