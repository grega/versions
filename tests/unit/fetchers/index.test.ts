import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('$env/dynamic/private', () => ({
	env: { GITHUB_TOKEN: '' }
}));

import { fetchPackage } from '$lib/fetchers/index.js';
import type { PackageConfig } from '$lib/types.js';

beforeEach(() => {
	vi.restoreAllMocks();
});

describe('fetchPackage', () => {
	it('returns error for unknown source type', async () => {
		const config: PackageConfig = {
			name: 'Unknown',
			source: 'nonexistent',
			category: 'Tools',
			url: 'https://example.com'
		};

		const result = await fetchPackage(config);

		expect(result.error).toContain('Unknown source');
		expect(result.name).toBe('Unknown');
		expect(result.releases).toHaveLength(0);
		expect(result.latest).toBeNull();
	});

	it('catches fetch errors and returns error field', async () => {
		vi.spyOn(globalThis, 'fetch').mockRejectedValueOnce(new Error('Network error'));

		const config: PackageConfig = {
			name: 'Broken',
			source: 'rubygems',
			gem: 'nonexistent',
			category: 'Tools',
			url: 'https://rubygems.org/gems/nonexistent'
		};

		const result = await fetchPackage(config);

		expect(result.error).toContain('Network error');
		expect(result.releases).toHaveLength(0);
	});
});
