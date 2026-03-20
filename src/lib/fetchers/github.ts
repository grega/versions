import { env } from '$env/dynamic/private';
import type { PackageConfig, PackageInfo, Release } from '../types.js';

function headers(): Record<string, string> {
	const h: Record<string, string> = { Accept: 'application/vnd.github+json' };
	if (env.GITHUB_TOKEN) {
		h['Authorization'] = `Bearer ${env.GITHUB_TOKEN}`;
	}
	return h;
}

async function fetchReleases(repo: string): Promise<Release[]> {
	const url = `https://api.github.com/repos/${repo}/releases?per_page=15`;
	const res = await fetch(url, { headers: headers() });
	if (!res.ok) throw new Error(`GitHub releases API returned ${res.status}`);
	const data = await res.json();

	return data.map((r: Record<string, unknown>) => ({
		version: String(r.tag_name).replace(/^v/, '').replaceAll('_', '.'),
		date: String(r.published_at).split('T')[0],
		prerelease: Boolean(r.prerelease),
		lts: false,
		url: String(r.html_url)
	}));
}

async function fetchTags(
	repo: string,
	tagPattern: string,
	tagReplace: Record<string, string>
): Promise<Release[]> {
	const url = `https://api.github.com/repos/${repo}/tags?per_page=50`;
	const res = await fetch(url, { headers: headers() });
	if (!res.ok) throw new Error(`GitHub tags API returned ${res.status}`);
	const data = await res.json();

	const regex = new RegExp(tagPattern);
	const filtered = data.filter((t: Record<string, unknown>) => regex.test(String(t.name)));

	return filtered.slice(0, 15).map((t: Record<string, unknown>) => {
		let version = String(t.name);
		for (const [from, to] of Object.entries(tagReplace)) {
			version = version.replaceAll(from, to);
		}
		return {
			version,
			date: '',
			prerelease: false,
			lts: false,
			url: `https://github.com/${repo}/releases/tag/${t.name}`
		};
	});
}

export async function fetchGitHub(config: PackageConfig): Promise<PackageInfo> {
	const repo = config.repo!;
	const releases = config.tagPattern
		? await fetchTags(repo, config.tagPattern, config.tagReplace ?? {})
		: await fetchReleases(repo);

	const stableReleases = releases.filter((r) => !r.prerelease);

	return {
		name: config.name,
		category: config.category,
		sourceUrl: config.url,
		latest: releases[0] ?? null,
		latestStable: stableReleases[0] ?? null,
		releases,
		fetchedAt: new Date().toISOString()
	};
}
