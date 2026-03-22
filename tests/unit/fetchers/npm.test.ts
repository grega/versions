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

	it('filters out experimental builds', async () => {
		const experimentalFixture = {
			'dist-tags': { latest: '19.2.4' },
			versions: {
				'19.2.4': {},
				'0.0.0-experimental-abc-20260320': {},
				'0.0.0-experimental-def-20260319': {}
			},
			time: {
				'19.2.4': '2026-01-26T12:00:00Z',
				'0.0.0-experimental-abc-20260320': '2026-03-20T12:00:00Z',
				'0.0.0-experimental-def-20260319': '2026-03-19T12:00:00Z'
			}
		};
		vi.spyOn(globalThis, 'fetch').mockResolvedValueOnce(
			new Response(JSON.stringify(experimentalFixture), { status: 200 })
		);

		const result = await fetchNpm(config);

		expect(result.releases).toHaveLength(1);
		expect(result.releases[0].version).toBe('19.2.4');
	});

	it('always includes dist-tags.latest even when outside top 15', async () => {
		const versions: Record<string, object> = {};
		const time: Record<string, string> = {};
		// Create 16 versions with newer dates to push dist-tags.latest out of the top 15
		for (let i = 0; i < 16; i++) {
			const v = `1.0.${i}`;
			versions[v] = {};
			time[v] = `2026-03-${String(i + 1).padStart(2, '0')}T12:00:00Z`;
		}
		// dist-tags.latest is an older version not in the top 15
		versions['2.0.0'] = {};
		time['2.0.0'] = '2025-01-01T12:00:00Z';

		const missingLatestFixture = {
			'dist-tags': { latest: '2.0.0' },
			versions,
			time
		};
		vi.spyOn(globalThis, 'fetch').mockResolvedValueOnce(
			new Response(JSON.stringify(missingLatestFixture), { status: 200 })
		);

		const result = await fetchNpm(config);

		expect(result.releases.find((r) => r.version === '2.0.0')).toBeTruthy();
		expect(result.latest?.version).toBe('2.0.0');
	});

	it('sorts same-day releases by version number descending', async () => {
		const sameDayFixture = {
			'dist-tags': { latest: '19.2.4' },
			versions: { '19.0.4': {}, '19.1.5': {}, '19.2.4': {} },
			time: {
				'19.0.4': '2026-01-26T10:00:00Z',
				'19.1.5': '2026-01-26T11:00:00Z',
				'19.2.4': '2026-01-26T12:00:00Z'
			}
		};
		vi.spyOn(globalThis, 'fetch').mockResolvedValueOnce(
			new Response(JSON.stringify(sameDayFixture), { status: 200 })
		);

		const result = await fetchNpm(config);

		expect(result.releases[0].version).toBe('19.2.4');
		expect(result.releases[1].version).toBe('19.1.5');
		expect(result.releases[2].version).toBe('19.0.4');
	});

	it('uses dist-tags.latest as latestStable when it is stable', async () => {
		const sameDayFixture = {
			'dist-tags': { latest: '19.2.4' },
			versions: { '19.0.4': {}, '19.1.5': {}, '19.2.4': {} },
			time: {
				'19.0.4': '2026-01-26T10:00:00Z',
				'19.1.5': '2026-01-26T11:00:00Z',
				'19.2.4': '2026-01-26T12:00:00Z'
			}
		};
		vi.spyOn(globalThis, 'fetch').mockResolvedValueOnce(
			new Response(JSON.stringify(sameDayFixture), { status: 200 })
		);

		const result = await fetchNpm(config);

		expect(result.latestStable?.version).toBe('19.2.4');
	});

	it('returns error on API failure', async () => {
		vi.spyOn(globalThis, 'fetch').mockResolvedValueOnce(
			new Response('', { status: 500 })
		);

		await expect(fetchNpm(config)).rejects.toThrow('500');
	});
});
