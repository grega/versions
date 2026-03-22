import type { PackageConfig, PackageInfo, Release } from '../types.js';

interface NodeRelease {
	version: string;
	date: string;
	lts: false | string;
}

export async function fetchNodejs(config: PackageConfig): Promise<PackageInfo> {
	const url = 'https://nodejs.org/dist/index.json';
	const res = await fetch(url);
	if (!res.ok) throw new Error(`Node.js dist API returned ${res.status}`);
	const data: NodeRelease[] = await res.json();

	const releases: Release[] = data.slice(0, 15).map((r) => ({
		version: r.version.replace(/^v/, ''),
		date: r.date,
		prerelease: false,
		lts: r.lts,
		url: `https://nodejs.org/en/blog/release/${r.version}`
	}));

	const ltsReleases = releases.filter((r) => r.lts !== false);

	return {
		name: config.name,
		categories: config.categories,
		sourceUrl: config.url,
		latest: releases[0] ?? null,
		latestStable: ltsReleases[0] ?? releases[0] ?? null,
		releases,
		fetchedAt: new Date().toISOString()
	};
}
