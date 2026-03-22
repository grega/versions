import type { PackageConfig, PackageInfo, Release } from '../types.js';

interface EolCycle {
	cycle: string;
	latest: string;
	latestReleaseDate: string;
	releaseDate: string;
	eol: boolean | string;
	lts: boolean | string;
}

export async function fetchEndOfLife(config: PackageConfig): Promise<PackageInfo> {
	const product = config.product ?? config.name.toLowerCase();
	const url = `https://endoflife.date/api/${product}.json`;
	const res = await fetch(url);
	if (!res.ok) throw new Error(`endoflife.date API returned ${res.status}`);
	const data: EolCycle[] = await res.json();

	const releases: Release[] = data.slice(0, 15).map((cycle) => ({
		version: cycle.latest || cycle.cycle,
		date: cycle.latestReleaseDate || cycle.releaseDate,
		prerelease: false,
		lts: cycle.lts,
		url: `https://endoflife.date/${product}`
	}));

	return {
		name: config.name,
		categories: config.categories,
		sourceUrl: config.url,
		latest: releases[0] ?? null,
		latestStable: releases[0] ?? null,
		releases,
		fetchedAt: new Date().toISOString()
	};
}
