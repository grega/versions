import { readFileSync } from 'fs';
import { resolve } from 'path';
import yaml from 'js-yaml';
import type { PackageConfig } from './types.js';

interface PackagesYaml {
	packages: PackageConfig[];
}

export function loadPackages(): PackageConfig[] {
	const filePath = resolve(process.cwd(), 'packages.yml');
	const content = readFileSync(filePath, 'utf-8');
	const data = yaml.load(content) as PackagesYaml;
	return data.packages;
}
