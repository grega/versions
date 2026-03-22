export interface Release {
	version: string;
	date: string;
	prerelease: boolean;
	lts: boolean | string;
	url: string;
}

export interface PackageInfo {
	name: string;
	categories: string[];
	sourceUrl: string;
	latest: Release | null;
	latestStable: Release | null;
	releases: Release[];
	fetchedAt: string;
	error?: string;
}

export interface PackageConfig {
	name: string;
	source: string;
	categories: string[];
	url: string;
	repo?: string;
	gem?: string;
	package?: string;
	tagPattern?: string;
	tagReplace?: Record<string, string>;
	product?: string;
}
