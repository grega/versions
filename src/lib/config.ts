import { readFileSync } from 'fs';
import { resolve } from 'path';
import yaml from 'js-yaml';
import type { PackageConfig } from './types.js';

interface RawPackageConfig {
	name: string;
	source: string;
	url: string;
	category?: string;
	categories?: string | string[];
	[key: string]: unknown;
}

interface PackagesYaml {
	packages: RawPackageConfig[];
}

export function loadPackages(): PackageConfig[] {
	const filePath = resolve(process.cwd(), 'packages.yml');
	const content = readFileSync(filePath, 'utf-8');
	const data = yaml.load(content) as PackagesYaml;
	return data.packages.map((pkg) => {
		const raw = pkg.categories ?? pkg.category;
		const categories = Array.isArray(raw) ? raw : typeof raw === 'string' ? [raw] : [];
		return { ...pkg, categories };
	});
}
