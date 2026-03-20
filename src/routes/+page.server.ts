import { loadPackages } from '$lib/config.js';
import { fetchAllPackages } from '$lib/fetchers/index.js';
import type { PackageInfo } from '$lib/types.js';

export async function load(): Promise<{ packages: PackageInfo[]; builtAt: string }> {
	const configs = loadPackages();
	const packages = await fetchAllPackages(configs);
	return {
		packages,
		builtAt: new Date().toISOString()
	};
}
