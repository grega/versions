import type { PackageConfig, PackageInfo, Release } from '../types.js';

export async function fetchRubyGems(config: PackageConfig): Promise<PackageInfo> {
	const gem = config.gem ?? config.name.toLowerCase();
	const url = `https://rubygems.org/api/v1/versions/${gem}.json`;
	const res = await fetch(url);
	if (!res.ok) throw new Error(`RubyGems API returned ${res.status}`);
	const data = await res.json();

	const releases: Release[] = data.slice(0, 15).map((v: Record<string, unknown>) => ({
		version: String(v.number),
		date: String(v.created_at).split('T')[0],
		prerelease: Boolean(v.prerelease),
		lts: false,
		url: `https://rubygems.org/gems/${gem}/versions/${v.number}`
	}));

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
