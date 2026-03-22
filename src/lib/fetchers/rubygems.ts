import type { PackageConfig, PackageInfo, Release } from '../types.js';

export async function fetchRubyGems(config: PackageConfig): Promise<PackageInfo> {
	const gem = config.gem ?? config.name.toLowerCase();

	const [versionsRes, gemRes] = await Promise.all([
		fetch(`https://rubygems.org/api/v1/versions/${gem}.json`),
		fetch(`https://rubygems.org/api/v1/gems/${gem}.json`)
	]);
	if (!versionsRes.ok) throw new Error(`RubyGems API returned ${versionsRes.status}`);
	if (!gemRes.ok) throw new Error(`RubyGems API returned ${gemRes.status}`);

	const data = await versionsRes.json();
	const gemData = await gemRes.json();
	const latestVersion = gemData.version ?? '';

	const releases: Release[] = data.slice(0, 15).map((v: Record<string, unknown>) => ({
		version: String(v.number),
		date: String(v.created_at).split('T')[0],
		prerelease: Boolean(v.prerelease),
		lts: false,
		url: `https://rubygems.org/gems/${gem}/versions/${v.number}`
	}));

	const latestStable = releases.find((r) => r.version === latestVersion)
		?? releases.find((r) => !r.prerelease)
		?? null;

	return {
		name: config.name,
		categories: config.categories,
		sourceUrl: config.url,
		latest: releases[0] ?? null,
		latestStable,
		releases,
		fetchedAt: new Date().toISOString()
	};
}
