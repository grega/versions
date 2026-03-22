import type { PackageConfig, PackageInfo, Release } from '../types.js';

export async function fetchNpm(config: PackageConfig): Promise<PackageInfo> {
	const pkg = config.package ?? config.name.toLowerCase();
	const res = await fetch(`https://registry.npmjs.org/${pkg}`, {
		headers: { Accept: 'application/json' }
	});
	if (!res.ok) throw new Error(`npm registry returned ${res.status}`);
	const data = await res.json();

	const distTags = data['dist-tags'] ?? {};
	const latestVersion = distTags.latest ?? '';
	const time = data.time ?? {};

	// Filter out dev/nightly/canary builds, keep stable + normal prereleases (alpha, beta, rc)
	const allVersions = Object.keys(data.versions ?? {})
		.filter((v) => !v.includes('dev.') && !v.includes('nightly') && !v.includes('canary'))
		.reverse()
		.slice(0, 15);

	const releases: Release[] = allVersions.map((v) => ({
		version: v,
		date: time[v] ? String(time[v]).split('T')[0] : '',
		prerelease: v.includes('-'),
		lts: false,
		url: `https://www.npmjs.com/package/${pkg}/v/${v}`
	}));

	const stableReleases = releases.filter((r) => !r.prerelease);
	const latestRelease =
		releases.find((r) => r.version === latestVersion) ?? releases[0] ?? null;

	return {
		name: config.name,
		categories: config.categories,
		sourceUrl: config.url,
		latest: latestRelease,
		latestStable: stableReleases[0] ?? null,
		releases,
		fetchedAt: new Date().toISOString()
	};
}
