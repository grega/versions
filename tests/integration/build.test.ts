import { describe, it, expect } from 'vitest';
import { execSync } from 'child_process';
import { existsSync, readFileSync } from 'fs';
import { resolve } from 'path';

const root = resolve(import.meta.dirname, '../..');

describe('static build', () => {
	it('produces build output', () => {
		expect(existsSync(resolve(root, 'build/index.html'))).toBe(true);
	});

	it('index.html contains expected structure', () => {
		const html = readFileSync(resolve(root, 'build/index.html'), 'utf-8');

		expect(html).toContain('Versions');
		expect(html).toContain('Search packages');
	});

	it('data file contains package data', () => {
		const dataPath = resolve(root, 'build/__data.json');
		expect(existsSync(dataPath)).toBe(true);

		const data = JSON.parse(readFileSync(dataPath, 'utf-8'));
		expect(data.type).toBe('data');
		expect(data.nodes).toBeDefined();
	});
});
