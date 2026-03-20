import { describe, it, expect } from 'vitest';
import { loadPackages } from '$lib/config.js';

describe('loadPackages', () => {
	it('loads and parses packages.yml', () => {
		const packages = loadPackages();

		expect(packages.length).toBeGreaterThan(0);
		expect(packages.every((p) => p.name && p.source && p.category && p.url)).toBe(true);
	});

	it('has unique package names', () => {
		const packages = loadPackages();
		const names = packages.map((p) => p.name);
		const unique = new Set(names);

		expect(names.length).toBe(unique.size);
	});

	it('only uses known source types', () => {
		const validSources = ['github', 'rubygems', 'npm', 'pypi', 'nodejs', 'endoflife'];
		const packages = loadPackages();

		for (const pkg of packages) {
			expect(validSources).toContain(pkg.source);
		}
	});

	it('github source packages have repo field', () => {
		const packages = loadPackages();
		const githubPkgs = packages.filter((p) => p.source === 'github');

		for (const pkg of githubPkgs) {
			expect(pkg.repo, `${pkg.name} missing repo`).toBeTruthy();
		}
	});
});
