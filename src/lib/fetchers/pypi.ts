import type { PackageConfig, PackageInfo, Release } from '../types.js';

export async function fetchPyPI(config: PackageConfig): Promise<PackageInfo> {
	const pkg = config.package ?? config.name.toLowerCase();
	const url = `https://pypi.org/pypi/${pkg}/json`;
	const res = await fetch(url);
	if (!res.ok) throw new Error(`PyPI API returned ${res.status}`);
	const data = await res.json();

	const releasesObj = data.releases ?? {};
	const versions = Object.keys(releasesObj)
		.filter((v) => releasesObj[v].length > 0)
		.sort((a, b) => {
			// Sort by upload date of first file in release
			const dateA = releasesObj[a][0]?.upload_time ?? '';
			const dateB = releasesObj[b][0]?.upload_time ?? '';
			return dateB.localeCompare(dateA);
		})
		.slice(0, 15);

	const releases: Release[] = versions.map((v) => {
		const files = releasesObj[v];
		const uploadDate = files[0]?.upload_time?.split('T')[0] ?? '';
		const isPrerelease = /[a-zA-Z]/.test(v.replace(/^\d+\.\d+\.\d+/, ''));
		return {
			version: v,
			date: uploadDate,
			prerelease: isPrerelease,
			lts: false,
			url: `https://pypi.org/project/${pkg}/${v}/`
		};
	});

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
