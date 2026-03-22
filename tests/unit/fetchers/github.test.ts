import { describe, it, expect, vi, beforeEach } from 'vitest';
import releasesFixture from '../../fixtures/github-releases.json';
import tagsFixture from '../../fixtures/github-tags.json';

vi.mock('$env/dynamic/private', () => ({
	env: { GITHUB_TOKEN: '' }
}));

import { fetchGitHub } from '$lib/fetchers/github.js';
import type { PackageConfig } from '$lib/types.js';

const baseConfig: PackageConfig = {
	name: 'TestPkg',
	source: 'github',
	repo: 'example/repo',
	categories: ['Tools'],
	url: 'https://github.com/example/repo/releases'
};

beforeEach(() => {
	vi.restoreAllMocks();
});

describe('fetchGitHub', () => {
	it('parses releases and identifies stable vs prerelease', async () => {
		vi.spyOn(globalThis, 'fetch').mockResolvedValueOnce(
			new Response(JSON.stringify(releasesFixture), { status: 200 })
		);

		const result = await fetchGitHub(baseConfig);

		expect(result.name).toBe('TestPkg');
		expect(result.categories).toEqual(['Tools']);
		expect(result.error).toBeUndefined();
		expect(result.releases).toHaveLength(4);

		// Latest is first in list (v2.0.1, stable)
		expect(result.latest?.version).toBe('2.0.1');
		expect(result.latest?.prerelease).toBe(false);
		expect(result.latest?.date).toBe('2026-03-01');

		// Latest stable skips the prerelease
		expect(result.latestStable?.version).toBe('2.0.1');

		// Prerelease is identified
		const beta = result.releases.find((r) => r.version === '2.1.0-beta1');
		expect(beta?.prerelease).toBe(true);
	});

	it('strips v prefix and converts underscores to dots', async () => {
		const releases = [
			{
				tag_name: 'v3_4_9',
				published_at: '2026-03-11T12:00:00Z',
				prerelease: false,
				html_url: 'https://github.com/ruby/ruby/releases/tag/v3_4_9'
			}
		];
		vi.spyOn(globalThis, 'fetch').mockResolvedValueOnce(
			new Response(JSON.stringify(releases), { status: 200 })
		);

		const result = await fetchGitHub(baseConfig);
		expect(result.latest?.version).toBe('3.4.9');
	});

	it('filters releases by tagPattern and applies tagReplace', async () => {
		const dockerReleases = [
			{
				tag_name: 'docker-v29.3.0',
				published_at: '2026-03-15T12:00:00Z',
				prerelease: false,
				html_url: 'https://github.com/moby/moby/releases/tag/docker-v29.3.0'
			},
			{
				tag_name: 'client/v0.3.0',
				published_at: '2026-03-14T12:00:00Z',
				prerelease: false,
				html_url: 'https://github.com/moby/moby/releases/tag/client/v0.3.0'
			},
			{
				tag_name: 'docker-v29.2.0',
				published_at: '2026-02-01T12:00:00Z',
				prerelease: false,
				html_url: 'https://github.com/moby/moby/releases/tag/docker-v29.2.0'
			}
		];
		vi.spyOn(globalThis, 'fetch').mockResolvedValueOnce(
			new Response(JSON.stringify(dockerReleases), { status: 200 })
		);

		const config: PackageConfig = {
			...baseConfig,
			tagPattern: '^docker-v',
			tagReplace: { 'docker-v': '' }
		};
		const result = await fetchGitHub(config);

		expect(result.releases).toHaveLength(2);
		expect(result.latest?.version).toBe('29.3.0');
		expect(result.releases[1].version).toBe('29.2.0');
	});

	it('falls back to tags API when releases API returns no matches', async () => {
		// Releases API returns empty after filtering
		vi.spyOn(globalThis, 'fetch')
			.mockResolvedValueOnce(new Response(JSON.stringify([]), { status: 200 }))
			.mockResolvedValueOnce(new Response(JSON.stringify(tagsFixture), { status: 200 }));

		const config: PackageConfig = {
			...baseConfig,
			tagPattern: '^REL_\\d+_\\d+$',
			tagReplace: { REL_: '', _: '.' }
		};
		const result = await fetchGitHub(config);

		expect(result.releases).toHaveLength(5);
		expect(result.latest?.version).toBe('16.2');
		expect(result.releases[2].version).toBe('15.6');
	});

	it('returns error on API failure', async () => {
		vi.spyOn(globalThis, 'fetch').mockResolvedValueOnce(
			new Response('', { status: 403 })
		);

		await expect(fetchGitHub(baseConfig)).rejects.toThrow('403');
	});
});
