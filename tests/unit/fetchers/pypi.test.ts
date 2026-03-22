import { describe, it, expect, vi, beforeEach } from 'vitest';
import fixture from '../../fixtures/pypi-package.json';
import { fetchPyPI } from '$lib/fetchers/pypi.js';
import type { PackageConfig } from '$lib/types.js';

const config: PackageConfig = {
	name: 'Django',
	source: 'pypi',
	package: 'django',
	categories: ['Frameworks'],
	url: 'https://pypi.org/project/Django/'
};

beforeEach(() => {
	vi.restoreAllMocks();
});

describe('fetchPyPI', () => {
	it('sorts versions by upload date descending', async () => {
		vi.spyOn(globalThis, 'fetch').mockResolvedValueOnce(
			new Response(JSON.stringify(fixture), { status: 200 })
		);

		const result = await fetchPyPI(config);

		expect(result.releases[0].version).toBe('4.2.0');
		expect(result.releases[0].date).toBe('2026-03-01');
	});

	it('detects prereleases from version string', async () => {
		vi.spyOn(globalThis, 'fetch').mockResolvedValueOnce(
			new Response(JSON.stringify(fixture), { status: 200 })
		);

		const result = await fetchPyPI(config);

		const alpha = result.releases.find((r) => r.version === '4.2.0a1');
		expect(alpha?.prerelease).toBe(true);

		const stable = result.releases.find((r) => r.version === '4.2.0');
		expect(stable?.prerelease).toBe(false);
	});

	it('sets latestStable to first non-prerelease', async () => {
		vi.spyOn(globalThis, 'fetch').mockResolvedValueOnce(
			new Response(JSON.stringify(fixture), { status: 200 })
		);

		const result = await fetchPyPI(config);
		expect(result.latestStable?.version).toBe('4.2.0');
	});

	it('returns error on API failure', async () => {
		vi.spyOn(globalThis, 'fetch').mockResolvedValueOnce(
			new Response('', { status: 404 })
		);

		await expect(fetchPyPI(config)).rejects.toThrow('404');
	});
});
