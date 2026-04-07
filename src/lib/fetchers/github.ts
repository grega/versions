import { env } from '$env/dynamic/private';
import { highestVersion, type PackageConfig, type PackageInfo, type Release } from '../types.js';

function headers(auth = true): Record<string, string> {
	const h: Record<string, string> = { Accept: 'application/vnd.github+json' };
	if (auth && env.GITHUB_TOKEN) {
		h['Authorization'] = `Bearer ${env.GITHUB_TOKEN}`;
	}
	return h;
}

async function githubFetch(url: string): Promise<Response> {
	const res = await fetch(url, { headers: headers() });
	if (res.status === 403 && env.GITHUB_TOKEN) {
		// Some orgs reject tokens based on lifetime policy; retry without auth for public data
		return fetch(url, { headers: headers(false) });
	}
	return res;
}

function cleanVersion(tag: string, tagReplace?: Record<string, string>): string {
	let version = tag;
	if (tagReplace) {
		for (const [from, to] of Object.entries(tagReplace)) {
			version = version.replaceAll(from, to);
		}
	}
	return version.replace(/^v/, '').replaceAll('_', '.');
}

const TARGET_COUNT = 20;
const MAX_PAGES = 3;

async function fetchReleases(
	repo: string,
	tagPattern?: string,
	tagReplace?: Record<string, string>
): Promise<Release[]> {
	const regex = tagPattern ? new RegExp(tagPattern) : null;
	const collected: Release[] = [];

	for (let page = 1; page <= MAX_PAGES; page++) {
		const url = `https://api.github.com/repos/${repo}/releases?per_page=30&page=${page}`;
		const res = await githubFetch(url);
		if (!res.ok) throw new Error(`GitHub releases API returned ${res.status}`);
		const data = await res.json();

		if (data.length === 0) break;

		const filtered = regex
			? data.filter((r: Record<string, unknown>) => regex.test(String(r.tag_name)))
			: data;

		for (const r of filtered) {
			collected.push({
				version: cleanVersion(String(r.tag_name), tagReplace),
				date: String(r.published_at).split('T')[0],
				prerelease: Boolean(r.prerelease),
				lts: false,
				url: String(r.html_url)
			});
			if (collected.length >= TARGET_COUNT) return collected;
		}

		if (!regex || data.length < 30) break; // no filtering or last page
	}

	return collected;
}

async function fetchTags(
	repo: string,
	tagPattern: string,
	tagReplace: Record<string, string>
): Promise<Release[]> {
	const url = `https://api.github.com/repos/${repo}/tags?per_page=50`;
	const res = await githubFetch(url);
	if (!res.ok) throw new Error(`GitHub tags API returned ${res.status}`);
	const data = await res.json();

	const regex = new RegExp(tagPattern);
	const filtered = data.filter((t: Record<string, unknown>) => regex.test(String(t.name)));
	const tags = filtered.slice(0, TARGET_COUNT);

	const dates = await Promise.all(
		tags.map(async (t: Record<string, unknown>) => {
			const sha = (t.commit as Record<string, unknown>)?.sha;
			if (!sha) return '';
			const commitUrl = `https://api.github.com/repos/${repo}/git/commits/${sha}`;
			const commitRes = await githubFetch(commitUrl);
			if (!commitRes.ok) return '';
			const commit = await commitRes.json();
			const dateStr = commit.committer?.date ?? commit.author?.date ?? '';
			return String(dateStr).split('T')[0];
		})
	);

	return tags.map((t: Record<string, unknown>, i: number) => ({
		version: cleanVersion(String(t.name), tagReplace),
		date: dates[i],
		prerelease: false,
		lts: false,
		url: `https://github.com/${repo}/releases/tag/${t.name}`
	}));
}

export async function fetchGitHub(config: PackageConfig): Promise<PackageInfo> {
	const repo = config.repo!;
	let usedTags = false;

	let releases: Release[];
	if (config.tagPattern) {
		// Try releases API first (has dates + prerelease info)
		releases = await fetchReleases(repo, config.tagPattern, config.tagReplace);
		// Fall back to tags API if no releases matched
		if (releases.length === 0) {
			releases = await fetchTags(repo, config.tagPattern, config.tagReplace ?? {});
			usedTags = true;
		}
	} else {
		releases = await fetchReleases(repo);
	}

	const stableReleases = releases.filter((r) => !r.prerelease);

	let sourceUrl = config.url;
	if (usedTags && sourceUrl.endsWith('/releases')) {
		sourceUrl = sourceUrl.slice(0, -'/releases'.length) + '/tags';
	}

	return {
		name: config.name,
		categories: config.categories,
		sourceUrl,
		latest: highestVersion(releases),
		latestStable: highestVersion(stableReleases),
		releases,
		fetchedAt: new Date().toISOString()
	};
}
