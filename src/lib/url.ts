export interface FilterState {
	search: string;
	category: string;
}

export function parseFilterParams(searchParams: URLSearchParams): FilterState {
	return {
		search: searchParams.get('q') ?? '',
		category: searchParams.get('cat') ?? 'All'
	};
}

export function buildFilterParams(state: FilterState): string {
	const params = new URLSearchParams();
	if (state.search) params.set('q', state.search);
	if (state.category && state.category !== 'All') params.set('cat', state.category);
	const qs = params.toString();
	return qs ? `?${qs}` : '/';
}
