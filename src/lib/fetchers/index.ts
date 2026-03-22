import type { PackageConfig, PackageInfo } from '../types.js';
import { fetchGitHub } from './github.js';
import { fetchRubyGems } from './rubygems.js';
import { fetchNpm } from './npm.js';
import { fetchPyPI } from './pypi.js';
import { fetchNodejs } from './nodejs.js';
import { fetchEndOfLife } from './endoflife.js';

const fetchers: Record<string, (config: PackageConfig) => Promise<PackageInfo>> = {
	github: fetchGitHub,
	rubygems: fetchRubyGems,
	npm: fetchNpm,
	pypi: fetchPyPI,
	nodejs: fetchNodejs,
	endoflife: fetchEndOfLife
};

export async function fetchPackage(config: PackageConfig): Promise<PackageInfo> {
	const fetcher = fetchers[config.source];
	if (!fetcher) {
		return {
			name: config.name,
			categories: config.categories,
			sourceUrl: config.url,
			latest: null,
			latestStable: null,
			releases: [],
			fetchedAt: new Date().toISOString(),
			error: `Unknown source: ${config.source}`
		};
	}

	try {
		return await fetcher(config);
	} catch (err) {
		return {
			name: config.name,
			categories: config.categories,
			sourceUrl: config.url,
			latest: null,
			latestStable: null,
			releases: [],
			fetchedAt: new Date().toISOString(),
			error: err instanceof Error ? err.message : String(err)
		};
	}
}

export async function fetchAllPackages(configs: PackageConfig[]): Promise<PackageInfo[]> {
	const results = await Promise.all(configs.map(fetchPackage));
	return results.sort((a, b) => a.name.localeCompare(b.name));
}
