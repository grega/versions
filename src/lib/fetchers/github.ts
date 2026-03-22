import { env } from '$env/dynamic/private';
import type { PackageConfig, PackageInfo, Release } from '../types.js';

function headers(): Record<string, string> {
	const h: Record<string, string> = { Accept: 'application/vnd.github+json' };
	if (env.GITHUB_TOKEN) {
		h['Authorization'] = `Bearer ${env.GITHUB_TOKEN}`;
	}
	return h;
}

function cleanVersion(tag: string, tagReplace?: Record<string, string>): string {
	let version = tag;
	if (tagReplace) {
		for (const [from, to] of Object.entries(tagReplace)) {
			version = version.replaceAll(from, to);
		}
	}
	return version.replace(/^v/, '').replaceAll('_', '.');
}

async function fetchReleases(
	repo: string,
	tagPattern?: string,
	tagReplace?: Record<string, string>
): Promise<Release[]> {
	const url = `https://api.github.com/repos/${repo}/releases?per_page=30`;
	const res = await fetch(url, { headers: headers() });
	if (!res.ok) throw new Error(`GitHub releases API returned ${res.status}`);
	const data = await res.json();

	let filtered = data;
	if (tagPattern) {
		const regex = new RegExp(tagPattern);
		filtered = data.filter((r: Record<string, unknown>) => regex.test(String(r.tag_name)));
	}

	return filtered.slice(0, 15).map((r: Record<string, unknown>) => ({
		version: cleanVersion(String(r.tag_name), tagReplace),
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

	return filtered.slice(0, 15).map((t: Record<string, unknown>) => ({
		version: cleanVersion(String(t.name), tagReplace),
		date: '',
		prerelease: false,
		lts: false,
		url: `https://github.com/${repo}/releases/tag/${t.name}`
	}));
}

export async function fetchGitHub(config: PackageConfig): Promise<PackageInfo> {
	const repo = config.repo!;

	let releases: Release[];
	if (config.tagPattern) {
		// Try releases API first (has dates + prerelease info)
		releases = await fetchReleases(repo, config.tagPattern, config.tagReplace);
		// Fall back to tags API if no releases matched
		if (releases.length === 0) {
			releases = await fetchTags(repo, config.tagPattern, config.tagReplace ?? {});
		}
	} else {
		releases = await fetchReleases(repo);
	}

	const stableReleases = releases.filter((r) => !r.prerelease);

	return {
		name: config.name,
		categories: config.categories,
		sourceUrl: config.url,
		latest: releases[0] ?? null,
		latestStable: stableReleases[0] ?? null,
		releases,
		fetchedAt: new Date().toISOString()
	};
}
