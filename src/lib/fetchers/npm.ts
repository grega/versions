import type { PackageConfig, PackageInfo, Release } from '../types.js';

export async function fetchNpm(config: PackageConfig): Promise<PackageInfo> {
	const pkg = config.package ?? config.name.toLowerCase();
	const url = `https://registry.npmjs.org/${pkg}`;
	const res = await fetch(url, {
		headers: { Accept: 'application/vnd.npm.install-v1+json' }
	});
	if (!res.ok) throw new Error(`npm registry returned ${res.status}`);
	const data = await res.json();

	const distTags = data['dist-tags'] ?? {};
	const latestVersion = distTags.latest ?? '';

	// Get all version keys and sort by semver descending (simple string sort works for most cases)
	const allVersions = Object.keys(data.versions ?? {});
	const recentVersions = allVersions.reverse().slice(0, 15);

	const releases: Release[] = recentVersions.map((v: string) => {
		const isPrerelease = v.includes('-');
		return {
			version: v,
			date: '',
			prerelease: isPrerelease,
			lts: false,
			url: `https://www.npmjs.com/package/${pkg}/v/${v}`
		};
	});

	// Try to get dates from the full registry (time field)
	const fullRes = await fetch(`https://registry.npmjs.org/${pkg}`, {
		headers: { Accept: 'application/json' }
	});
	if (fullRes.ok) {
		const fullData = await fullRes.json();
		const time = fullData.time ?? {};
		for (const release of releases) {
			if (time[release.version]) {
				release.date = String(time[release.version]).split('T')[0];
			}
		}
	}

	const stableReleases = releases.filter((r) => !r.prerelease);
	const latestRelease =
		releases.find((r) => r.version === latestVersion) ?? releases[0] ?? null;

	return {
		name: config.name,
		category: config.category,
		sourceUrl: config.url,
		latest: latestRelease,
		latestStable: stableReleases[0] ?? null,
		releases,
		fetchedAt: new Date().toISOString()
	};
}
