import { describe, it, expect } from 'vitest';
import { parseFilterParams, buildFilterParams } from '$lib/url.js';

describe('parseFilterParams', () => {
	it('returns defaults when no params present', () => {
		const params = new URLSearchParams();
		expect(parseFilterParams(params)).toEqual({ search: '', category: 'All' });
	});

	it('reads q param as search', () => {
		const params = new URLSearchParams('q=react');
		expect(parseFilterParams(params)).toEqual({ search: 'react', category: 'All' });
	});

	it('reads cat param as category', () => {
		const params = new URLSearchParams('cat=Ruby');
		expect(parseFilterParams(params)).toEqual({ search: '', category: 'Ruby' });
	});

	it('reads both q and cat params', () => {
		const params = new URLSearchParams('q=rails&cat=Frameworks');
		expect(parseFilterParams(params)).toEqual({ search: 'rails', category: 'Frameworks' });
	});

	it('resets to defaults when navigating from filtered URL to /', () => {
		// Simulate: user is at ?q=react&cat=Frameworks, then navigates to /
		const filtered = new URLSearchParams('q=react&cat=Frameworks');
		expect(parseFilterParams(filtered)).toEqual({ search: 'react', category: 'Frameworks' });

		// After navigating to /, searchParams are empty
		const reset = new URLSearchParams();
		expect(parseFilterParams(reset)).toEqual({ search: '', category: 'All' });
	});
});

describe('buildFilterParams', () => {
	it('returns / when no filters active', () => {
		expect(buildFilterParams({ search: '', category: 'All' })).toBe('/');
	});

	it('returns / for empty category', () => {
		expect(buildFilterParams({ search: '', category: '' })).toBe('/');
	});

	it('builds q param for search', () => {
		expect(buildFilterParams({ search: 'react', category: 'All' })).toBe('?q=react');
	});

	it('builds cat param for category', () => {
		expect(buildFilterParams({ search: '', category: 'Ruby' })).toBe('?cat=Ruby');
	});

	it('builds both params together', () => {
		const result = buildFilterParams({ search: 'rails', category: 'Frameworks' });
		const params = new URLSearchParams(result.slice(1));
		expect(params.get('q')).toBe('rails');
		expect(params.get('cat')).toBe('Frameworks');
	});

	it('encodes special characters in search', () => {
		const result = buildFilterParams({ search: 'c++', category: 'All' });
		expect(result).toContain('q=');
		const params = new URLSearchParams(result.slice(1));
		expect(params.get('q')).toBe('c++');
	});

	it('roundtrips through parse', () => {
		const state = { search: 'next.js', category: 'Node.js' };
		const url = buildFilterParams(state);
		const parsed = parseFilterParams(new URLSearchParams(url.slice(1)));
		expect(parsed).toEqual(state);
	});

	it('reset state builds to / which parses back to defaults', () => {
		const resetState = { search: '', category: 'All' };
		const url = buildFilterParams(resetState);
		expect(url).toBe('/');

		// Parsing / (empty params) gives back the reset state
		const parsed = parseFilterParams(new URLSearchParams());
		expect(parsed).toEqual(resetState);
	});
});
