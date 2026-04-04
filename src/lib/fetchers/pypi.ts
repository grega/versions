import { highestVersion, type PackageConfig, type PackageInfo, type Release } from '../types.js';

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
			const dateA = releasesObj[a][0]?.upload_time ?? '';
			const dateB = releasesObj[b][0]?.upload_time ?? '';
			if (dateA !== dateB) return dateB.localeCompare(dateA);
			// Same date: prefer higher version number
			return b.localeCompare(a, undefined, { numeric: true });
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
		categories: config.categories,
		sourceUrl: config.url,
		latest: highestVersion(releases),
		latestStable: highestVersion(stableReleases),
		releases,
		fetchedAt: new Date().toISOString()
	};
}
