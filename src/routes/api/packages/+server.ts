import { json } from '@sveltejs/kit';
import { loadPackages } from '$lib/config.js';
import { fetchAllPackages } from '$lib/fetchers/index.js';

export async function GET() {
	const configs = loadPackages();
	const packages = await fetchAllPackages(configs);
	return json(packages);
}

export const prerender = true
