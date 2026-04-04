import { describe, it, expect, vi, beforeEach } from 'vitest';
import releasesFixture from '../../fixtures/github-releases.json';
import tagsFixture from '../../fixtures/github-tags.json';

vi.mock('$env/dynamic/private', () => ({
	env: { GITHUB_TOKEN: 'test-token' }
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

		// Latest is highest version (v2.1.0-beta1, prerelease)
		expect(result.latest?.version).toBe('2.1.0-beta1');
		expect(result.latest?.prerelease).toBe(true);
		expect(result.latest?.date).toBe('2026-03-10');

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
		const commitDate = (date: string) =>
			new Response(JSON.stringify({ committer: { date: `${date}T12:00:00Z` } }), {
				status: 200
			});

		// Releases API returns empty after filtering, then tags API, then per-tag commits
		vi.spyOn(globalThis, 'fetch')
			.mockResolvedValueOnce(new Response(JSON.stringify([]), { status: 200 }))
			.mockResolvedValueOnce(new Response(JSON.stringify(tagsFixture), { status: 200 }))
			.mockResolvedValueOnce(commitDate('2026-03-10'))
			.mockResolvedValueOnce(commitDate('2026-03-05'))
			.mockResolvedValueOnce(commitDate('2026-02-20'))
			.mockResolvedValueOnce(commitDate('2026-02-10'))
			.mockResolvedValueOnce(commitDate('2026-01-15'));

		const config: PackageConfig = {
			...baseConfig,
			tagPattern: '^REL_\\d+_\\d+$',
			tagReplace: { REL_: '', _: '.' }
		};
		const result = await fetchGitHub(config);

		expect(result.releases).toHaveLength(5);
		expect(result.latest?.version).toBe('16.2');
		expect(result.latest?.date).toBe('2026-03-10');
		expect(result.releases[2].version).toBe('15.6');
		expect(result.releases[2].date).toBe('2026-02-20');
	});

	it('filters monorepo releases by tagPattern (e.g. Astro)', async () => {
		const monorepoReleases = [
			{
				tag_name: 'astro@6.0.8',
				published_at: '2026-03-20T12:00:00Z',
				prerelease: false,
				html_url: 'https://github.com/withastro/astro/releases/tag/astro@6.0.8'
			},
			{
				tag_name: '@astrojs/underscore-redirects@1.0.2',
				published_at: '2026-03-19T12:00:00Z',
				prerelease: false,
				html_url:
					'https://github.com/withastro/astro/releases/tag/@astrojs/underscore-redirects@1.0.2'
			},
			{
				tag_name: '@astrojs/node@10.0.3',
				published_at: '2026-03-18T12:00:00Z',
				prerelease: false,
				html_url: 'https://github.com/withastro/astro/releases/tag/@astrojs/node@10.0.3'
			},
			{
				tag_name: 'astro@6.0.7',
				published_at: '2026-03-15T12:00:00Z',
				prerelease: false,
				html_url: 'https://github.com/withastro/astro/releases/tag/astro@6.0.7'
			}
		];
		vi.spyOn(globalThis, 'fetch').mockResolvedValueOnce(
			new Response(JSON.stringify(monorepoReleases), { status: 200 })
		);

		const config: PackageConfig = {
			...baseConfig,
			repo: 'withastro/astro',
			tagPattern: '^astro@\\d',
			tagReplace: { 'astro@': '' }
		};
		const result = await fetchGitHub(config);

		expect(result.releases).toHaveLength(2);
		expect(result.latest?.version).toBe('6.0.8');
		expect(result.releases[1].version).toBe('6.0.7');
	});

	it('paginates to collect enough filtered releases from monorepos', async () => {
		const makeRelease = (tag: string, date: string) => ({
			tag_name: tag,
			published_at: `${date}T12:00:00Z`,
			prerelease: false,
			html_url: `https://github.com/withastro/astro/releases/tag/${tag}`
		});

		// Build a full page of 30 releases with only a few astro matches
		const filler = (n: number) =>
			Array.from({ length: n }, (_, i) => makeRelease(`@astrojs/pkg-${i}@1.0.0`, '2026-03-01'));

		// Page 1: 2 astro releases padded to 30
		const page1 = [
			makeRelease('astro@6.0.8', '2026-03-20'),
			...filler(14),
			makeRelease('astro@6.0.7', '2026-03-17'),
			...filler(14)
		];
		// Page 2: 3 astro releases among 20 (< 30, so last page)
		const page2 = [
			makeRelease('astro@6.0.6', '2026-03-15'),
			...filler(6),
			makeRelease('astro@6.0.5', '2026-03-13'),
			...filler(6),
			makeRelease('astro@6.0.4', '2026-03-11'),
			...filler(5)
		];

		vi.spyOn(globalThis, 'fetch')
			.mockResolvedValueOnce(new Response(JSON.stringify(page1), { status: 200 }))
			.mockResolvedValueOnce(new Response(JSON.stringify(page2), { status: 200 }));

		const config: PackageConfig = {
			...baseConfig,
			repo: 'withastro/astro',
			tagPattern: '^astro@\\d',
			tagReplace: { 'astro@': '' }
		};
		const result = await fetchGitHub(config);

		expect(result.releases).toHaveLength(5);
		expect(result.releases.map((r) => r.version)).toEqual([
			'6.0.8',
			'6.0.7',
			'6.0.6',
			'6.0.5',
			'6.0.4'
		]);
		expect(fetch).toHaveBeenCalledTimes(2);
	});

	it('retries without auth on 403 from org token policy', async () => {
		vi.spyOn(globalThis, 'fetch')
			.mockResolvedValueOnce(new Response('', { status: 403 }))
			.mockResolvedValueOnce(
				new Response(JSON.stringify(releasesFixture), { status: 200 })
			);

		const result = await fetchGitHub(baseConfig);

		expect(fetch).toHaveBeenCalledTimes(2);
		// Second call should not include Authorization header
		const secondCall = vi.mocked(fetch).mock.calls[1];
		const secondHeaders = (secondCall[1]?.headers as Record<string, string>) ?? {};
		expect(secondHeaders['Authorization']).toBeUndefined();
		expect(result.latest?.version).toBe('2.1.0-beta1');
	});

	it('picks highest version as latest, not most recent by date', async () => {
		const rubyLikeReleases = [
			{
				tag_name: 'v3.2.11',
				published_at: '2026-03-27T12:00:00Z',
				prerelease: false,
				html_url: 'https://github.com/ruby/ruby/releases/tag/v3.2.11'
			},
			{
				tag_name: 'v3.3.11',
				published_at: '2026-03-26T12:00:00Z',
				prerelease: false,
				html_url: 'https://github.com/ruby/ruby/releases/tag/v3.3.11'
			},
			{
				tag_name: 'v4.0.2',
				published_at: '2026-03-16T12:00:00Z',
				prerelease: false,
				html_url: 'https://github.com/ruby/ruby/releases/tag/v4.0.2'
			},
			{
				tag_name: 'v3.4.9',
				published_at: '2026-03-11T12:00:00Z',
				prerelease: false,
				html_url: 'https://github.com/ruby/ruby/releases/tag/v3.4.9'
			}
		];
		vi.spyOn(globalThis, 'fetch').mockResolvedValueOnce(
			new Response(JSON.stringify(rubyLikeReleases), { status: 200 })
		);

		const result = await fetchGitHub({ ...baseConfig, repo: 'ruby/ruby' });

		expect(result.latest?.version).toBe('4.0.2');
		expect(result.latestStable?.version).toBe('4.0.2');
		// releases list preserves date order from GitHub
		expect(result.releases[0].version).toBe('3.2.11');
	});

	it('throws when both auth and no-auth requests fail', async () => {
		vi.spyOn(globalThis, 'fetch')
			.mockResolvedValueOnce(new Response('', { status: 403 }))
			.mockResolvedValueOnce(new Response('', { status: 403 }));

		await expect(fetchGitHub(baseConfig)).rejects.toThrow('403');
	});
});
