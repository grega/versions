import { describe, it, expect, vi, beforeEach } from 'vitest';
import fixture from '../../fixtures/npm-registry.json';
import { fetchNpm } from '$lib/fetchers/npm.js';
import type { PackageConfig } from '$lib/types.js';

const config: PackageConfig = {
	name: 'TypeScript',
	source: 'npm',
	package: 'typescript',
	categories: ['Tools'],
	url: 'https://github.com/microsoft/TypeScript/releases'
};

beforeEach(() => {
	vi.restoreAllMocks();
});

describe('fetchNpm', () => {
	it('filters out dev/nightly builds', async () => {
		vi.spyOn(globalThis, 'fetch').mockResolvedValueOnce(
			new Response(JSON.stringify(fixture), { status: 200 })
		);

		const result = await fetchNpm(config);

		const devVersions = result.releases.filter((r) => r.version.includes('dev.'));
		expect(devVersions).toHaveLength(0);
	});

	it('identifies latest from dist-tags', async () => {
		vi.spyOn(globalThis, 'fetch').mockResolvedValueOnce(
			new Response(JSON.stringify(fixture), { status: 200 })
		);

		const result = await fetchNpm(config);

		expect(result.latest?.version).toBe('5.9.3');
		expect(result.latest?.prerelease).toBe(false);
	});

	it('identifies stable vs prerelease correctly', async () => {
		vi.spyOn(globalThis, 'fetch').mockResolvedValueOnce(
			new Response(JSON.stringify(fixture), { status: 200 })
		);

		const result = await fetchNpm(config);

		const beta = result.releases.find((r) => r.version === '5.9.0-beta');
		expect(beta?.prerelease).toBe(true);

		const stable = result.releases.filter((r) => !r.prerelease);
		expect(stable.length).toBeGreaterThan(0);
		expect(result.latestStable?.version).toBe('5.9.3');
	});

	it('includes dates from time field', async () => {
		vi.spyOn(globalThis, 'fetch').mockResolvedValueOnce(
			new Response(JSON.stringify(fixture), { status: 200 })
		);

		const result = await fetchNpm(config);
		expect(result.latest?.date).toBe('2026-03-01');
	});

	it('returns error on API failure', async () => {
		vi.spyOn(globalThis, 'fetch').mockResolvedValueOnce(
			new Response('', { status: 500 })
		);

		await expect(fetchNpm(config)).rejects.toThrow('500');
	});
});
