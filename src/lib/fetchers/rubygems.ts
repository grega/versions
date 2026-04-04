import { highestVersion, type PackageConfig, type PackageInfo, type Release } from '../types.js';

export async function fetchRubyGems(config: PackageConfig): Promise<PackageInfo> {
	const gem = config.gem ?? config.name.toLowerCase();

	const versionsRes = await fetch(`https://rubygems.org/api/v1/versions/${gem}.json`);
	if (!versionsRes.ok) throw new Error(`RubyGems API returned ${versionsRes.status}`);

	const data = await versionsRes.json();

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
		categories: config.categories,
		sourceUrl: config.url,
		latest: highestVersion(releases),
		latestStable: highestVersion(stableReleases),
		releases,
		fetchedAt: new Date().toISOString()
	};
}
