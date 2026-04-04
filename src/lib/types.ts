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

/** Strip prerelease suffix (e.g. "2.1.0-beta1" → "2.1.0") and return numeric segments. */
function versionSegments(v: string): number[] {
	return v.replace(/-.*$/, '').split('.').map(Number);
}

/** Compare two version strings. Returns negative if a < b, positive if a > b, 0 if equal.
 *  Prerelease versions sort below their release counterpart (e.g. 2.1.0-beta1 < 2.1.0). */
export function compareVersions(a: string, b: string): number {
	const pa = versionSegments(a);
	const pb = versionSegments(b);
	const len = Math.max(pa.length, pb.length);
	for (let i = 0; i < len; i++) {
		const diff = (pa[i] ?? 0) - (pb[i] ?? 0);
		if (diff !== 0) return diff;
	}
	const aIsPrerelease = a.includes('-');
	const bIsPrerelease = b.includes('-');
	if (aIsPrerelease && !bIsPrerelease) return -1;
	if (!aIsPrerelease && bIsPrerelease) return 1;
	return 0;
}

/** Return the release with the highest version number, or null if empty. */
export function highestVersion(releases: Release[]): Release | null {
	if (releases.length === 0) return null;
	return releases.reduce((best, r) => (compareVersions(r.version, best.version) > 0 ? r : best));
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
