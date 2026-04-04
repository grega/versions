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

	// Filter out dev/nightly/canary/experimental builds, keep stable + normal prereleases (alpha, beta, rc)
	const allVersions = Object.keys(data.versions ?? {})
		.filter((v) => !v.includes('dev.') && !v.includes('nightly') && !v.includes('canary') && !v.includes('experimental'))
		.sort((a, b) => {
			const dateA = String(time[a] ?? '').split('T')[0];
			const dateB = String(time[b] ?? '').split('T')[0];
			const dateCmp = dateB.localeCompare(dateA);
			if (dateCmp !== 0) return dateCmp;
			return b.localeCompare(a, undefined, { numeric: true });
		})
		.slice(0, 20);

	// Ensure dist-tags.latest is always included
	if (latestVersion && !allVersions.includes(latestVersion)) {
		allVersions.unshift(latestVersion);
	}

	const releases: Release[] = allVersions.map((v) => ({
		version: v,
		date: time[v] ? String(time[v]).split('T')[0] : '',
		prerelease: v.includes('-'),
		lts: false,
		url: `https://www.npmjs.com/package/${pkg}/v/${v}`
	}));

	const latestRelease =
		releases.find((r) => r.version === latestVersion) ?? releases[0] ?? null;
	const latestStable = latestRelease && !latestRelease.prerelease
		? latestRelease
		: releases.find((r) => !r.prerelease) ?? null;

	return {
		name: config.name,
		categories: config.categories,
		sourceUrl: config.url,
		latest: latestRelease,
		latestStable,
		releases,
		fetchedAt: new Date().toISOString()
	};
}
