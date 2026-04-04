<script lang="ts">
	import type { PackageInfo } from '$lib/types.js';
	import { parseFilterParams, buildFilterParams } from '$lib/url.js';
	import { browser } from '$app/environment';
	import { goto, afterNavigate } from '$app/navigation';
	import { onMount } from 'svelte';

	type ThemePreference = 'system' | 'light' | 'dark';

	const themeOrder: ThemePreference[] = ['system', 'light', 'dark'];

	function isThemePreference(value: string | null): value is ThemePreference {
		return value === 'system' || value === 'light' || value === 'dark';
	}

	// Max releases to display per package on the website (API returns more)
	const MAX_DISPLAY_RELEASES = 15;

	let { data } = $props();
	let search = $state('');
	let activeCategory = $state('All');
	let expanded = $state<Record<string, boolean>>({});
	let themePreference = $state<ThemePreference>('system');
	let systemPrefersDark = $state(false);

	if (browser) {
		const initialFilter = parseFilterParams(new URLSearchParams(window.location.search));
		search = initialFilter.search;
		activeCategory = initialFilter.category;
		const initialTheme = document.documentElement.dataset.themePreference ?? null;
		if (isThemePreference(initialTheme)) {
			themePreference = initialTheme;
		}
		systemPrefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
	}

	afterNavigate(({ from, to }) => {
		if (from?.url?.toString() !== to?.url?.toString()) {
			const state = parseFilterParams(to?.url?.searchParams ?? new URLSearchParams());
			search = state.search;
			activeCategory = state.category;
		}
	});

	function updateUrl() {
		if (!browser) return;
		goto(buildFilterParams({ search, category: activeCategory }), { replaceState: true, keepFocus: true, noScroll: true });
	}

	$effect(() => {
		search;
		activeCategory;
		updateUrl();
	});

	const categories = $derived(() => {
		const cats = new Set(data.packages.flatMap((p: PackageInfo) => p.categories));
		return ['All', ...Array.from(cats).sort()];
	});

	const filtered = $derived(() => {
		const q = search.toLowerCase();
		return data.packages.filter((p: PackageInfo) => {
			const matchesSearch = !q || p.name.toLowerCase().includes(q);
			const matchesCategory = activeCategory === 'All' || p.categories.includes(activeCategory);
			return matchesSearch && matchesCategory;
		});
	});

	function toggleExpand(name: string) {
		expanded[name] = !expanded[name];
	}

	function formatDate(date: string): string {
		if (!date) return '';
		return date;
	}

	const resolvedTheme = $derived(
		themePreference === 'system' ? (systemPrefersDark ? 'dark' : 'light') : themePreference
	);

	onMount(() => {
		const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
		const storedPreference = window.localStorage.getItem('theme-preference');

		systemPrefersDark = mediaQuery.matches;
		if (isThemePreference(storedPreference)) {
			themePreference = storedPreference;
		}

		const handleChange = (event: MediaQueryListEvent) => {
			systemPrefersDark = event.matches;
		};

		mediaQuery.addEventListener('change', handleChange);

		return () => mediaQuery.removeEventListener('change', handleChange);
	});

	$effect(() => {
		if (!browser) return;

		const root = document.documentElement;
		const appliedTheme = resolvedTheme;

		root.dataset.themePreference = themePreference;
		root.dataset.theme = appliedTheme;
		root.style.colorScheme = appliedTheme;
		window.localStorage.setItem('theme-preference', themePreference);
	});

	let searchInput: HTMLInputElement;

	function handleKeydown(e: KeyboardEvent) {
		if (e.key === 'Escape') {
			search = '';
			activeCategory = 'All';
			searchInput.blur();
			return;
		}
		if (e.key === 'f' && !e.metaKey && !e.ctrlKey && !e.altKey && !(e.target instanceof HTMLInputElement)) {
			e.preventDefault();
			searchInput.focus();
			searchInput.select();
		}
	}

	let copied = $state('');

	async function copyVersion(version: string) {
		await navigator.clipboard.writeText(version);
		copied = version;
		setTimeout(() => { if (copied === version) copied = ''; }, 1500);
	}

	function timeSince(date: string): string {
		if (!date) return '';
		const now = new Date();
		const then = new Date(date);
		const todayUTC = Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate());
		const thenUTC = Date.UTC(then.getUTCFullYear(), then.getUTCMonth(), then.getUTCDate());
		const days = Math.floor((todayUTC - thenUTC) / (1000 * 60 * 60 * 24));
		if (days === 0) return 'today';
		if (days === 1) return '1 day ago';
		if (days < 30) return `${days} days ago`;
		const months = Math.floor(days / 30);
		if (months === 1) return '1 month ago';
		if (months < 12) return `${months} months ago`;
		const years = Math.floor(months / 12);
		return years === 1 ? '1 year ago' : `${years} years ago`;
	}

	function cycleThemePreference() {
		const currentIndex = themeOrder.indexOf(themePreference);
		const nextIndex = (currentIndex + 1) % themeOrder.length;
		themePreference = themeOrder[nextIndex];
	}

	function themeLabel(theme: ThemePreference): string {
		if (theme === 'system') return 'Auto';
		if (theme === 'light') return 'Light';
		return 'Dark';
	}

	const nextThemePreference = $derived(themeOrder[(themeOrder.indexOf(themePreference) + 1) % themeOrder.length]);
	const themeButtonLabel = $derived(`Theme: ${themeLabel(themePreference)}. Switch to ${themeLabel(nextThemePreference)}.`);
</script>

{#snippet copyIcon(version: string)}
	<span class="copy-icon">
		{#if copied === version}
			✓
		{:else}
			<svg width="12" height="12" viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round">
				<rect x="5.5" y="5.5" width="9" height="9" rx="1.5"/>
				<path d="M10.5 5.5V3a1.5 1.5 0 0 0-1.5-1.5H3A1.5 1.5 0 0 0 1.5 3v6A1.5 1.5 0 0 0 3 10.5h2.5"/>
			</svg>
		{/if}
	</span>
{/snippet}

{#snippet themeIcon(theme: ThemePreference)}
	{#if theme === 'system'}
		<svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.4" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
			<rect x="2.25" y="2.5" width="11.5" height="8" rx="1.75"/>
			<path d="M6 13.5h4"/>
			<path d="M8 10.5v3"/>
		</svg>
	{:else if theme === 'light'}
		<svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.4" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
			<circle cx="8" cy="8" r="3"/>
			<path d="M8 1.5v1.75M8 12.75V14.5M3.4 3.4l1.25 1.25M11.35 11.35l1.25 1.25M1.5 8h1.75M12.75 8h1.75M3.4 12.6l1.25-1.25M11.35 4.65l1.25-1.25"/>
		</svg>
	{:else}
		<svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.4" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
			<path d="M10.95 1.8a5.9 5.9 0 1 0 3.25 10.75A6.35 6.35 0 0 1 10.95 1.8Z"/>
		</svg>
	{/if}
{/snippet}

<svelte:window onkeydown={handleKeydown} />

<div class="container">
	<header>
		<div class="header-top">
			<h1><a href="/">Versions</a></h1>
			<p class="tagline">Release information for an (opinionated) selection of languages, frameworks, and tools</p>
			<div class="header-meta">
				<span class="built-at">
					<button
						type="button"
						class="theme-btn"
						onclick={cycleThemePreference}
						aria-label={themeButtonLabel}
						title={themeButtonLabel}
					>
						{@render themeIcon(themePreference)}
						<span class="theme-value">{themeLabel(themePreference)}</span>
					</button>
					Updated <time datetime={data.builtAt}>{new Date(data.builtAt).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })}</time>
					&middot; <a href="https://github.com/grega/versions/tree/main/cli" rel="noopener" class="cli-link">CLI</a>
					&middot; <a href="https://github.com/grega/versions" rel="noopener" class="github-link">GitHub</a>
				</span>
			</div>
		</div>
		<div class="controls">
			<div class="search-wrapper">
				<input
					type="search"
					placeholder="Search..."
					bind:value={search}
					bind:this={searchInput}
					class="search"
				/>
				{#if search}
					<span class="search-actions">
						<span class="search-kbd">Esc</span>
						<button class="search-clear" onclick={() => { search = ''; searchInput.focus(); }} title="Clear (Esc)">✕</button>
					</span>
				{:else}
					<span class="search-kbd">F</span>
				{/if}
			</div>
			<div class="categories">
				{#each categories() as cat}
					<button
						class="chip"
						class:active={activeCategory === cat}
						onclick={() => (activeCategory = cat)}
					>
						{cat}
					</button>
				{/each}
			</div>
		</div>
	</header>

	<main>
		{#if filtered().length === 0}
			<p class="empty">Nothing matches your search</p>
		{/if}

		<div class="grid">
			{#each filtered() as pkg (pkg.name)}
				<div class="card" class:error={!!pkg.error}>
					<div class="card-header">
						<h2>{pkg.name}</h2>
						<div class="badges">
							{#each pkg.categories as cat}
								<span class="badge">{cat}</span>
							{/each}
						</div>
					</div>

					{#if pkg.error}
						<p class="error-msg">Failed to fetch: {pkg.error}</p>
					{:else}
						<div class="version-info">
							{#if pkg.latestStable}
								{@const stable = pkg.latestStable}
								<div class="version-row">
											<span class="label stable">stable</span>
											<button class="version copy-btn" onclick={() => copyVersion(stable.version)} title="Copy version">
												{stable.version}
												{@render copyIcon(stable.version)}
									</button>
											{#if stable.date}
												<span class="date" title={stable.date}>{timeSince(stable.date)}</span>
									{/if}
											{#if stable.lts}
										<span class="lts-badge">LTS</span>
									{/if}
								</div>
							{/if}

							{#if pkg.latest && pkg.latest.prerelease && pkg.latest.version !== pkg.latestStable?.version}
										{@const latest = pkg.latest}
								<div class="version-row">
									<span class="label prerelease">pre</span>
											<button class="version copy-btn" onclick={() => copyVersion(latest.version)} title="Copy version">
												{latest.version}
												{@render copyIcon(latest.version)}
									</button>
											{#if latest.date}
												<span class="date" title={latest.date}>{timeSince(latest.date)}</span>
									{/if}
								</div>
							{/if}
						</div>

						<div class="card-actions">
							<button class="expand-btn" onclick={() => toggleExpand(pkg.name)}>
								{expanded[pkg.name] ? '▼ Hide releases' : '▶ Show releases'}
							</button>
							<a href={pkg.sourceUrl} rel="noopener" class="source-link">Source ↗</a>
						</div>

						{#if expanded[pkg.name]}
							<div class="releases">
								<table>
									<tbody>
										{#each pkg.releases.slice(0, MAX_DISPLAY_RELEASES) as release}
											<tr>
												<td>
													{#if release.url}
														<a href={release.url} rel="noopener">{release.version}</a>
													{:else}
														{release.version}
													{/if}
													<button class="copy-btn" onclick={() => copyVersion(release.version)} title="Copy version">
														{@render copyIcon(release.version)}
													</button>
												</td>
												<td class="date">{formatDate(release.date)}</td>
												<td>
													{#if release.prerelease}
														<span class="label prerelease">pre</span>
													{:else}
														<span class="label stable">stable</span>
													{/if}
													{#if release.lts}
														<span class="lts-badge">LTS</span>
													{/if}
												</td>
											</tr>
										{/each}
									</tbody>
								</table>
							</div>
						{/if}
					{/if}
				</div>
			{/each}
		</div>
	</main>
</div>

<style>
	:global(:root) {
		--bg: #f5f5f5;
		--text: #1a1f28;
		--muted: #5e6774;
		--muted-soft: #808996;
		--border: #d7dbe3;
		--border-strong: #bcc4cf;
		--surface: rgba(255, 255, 255, 0.92);
		--surface-strong: #ffffff;
		--surface-muted: rgba(248, 249, 251, 0.96);
		--shadow: 0 18px 48px rgba(42, 51, 63, 0.08);
		--card-shadow: none;
		--card-shadow-hover: 0 2px 8px rgba(0, 0, 0, 0.08);
		--accent: #2e6fae;
		--accent-strong: #164f85;
		--accent-soft: rgba(46, 111, 174, 0.18);
		--badge-bg: #e9eef5;
		--badge-text: #4f5d6f;
		--stable-bg: #e5f4ea;
		--stable-text: #1f7a3b;
		--pre-bg: #fff1dd;
		--pre-text: #a55a07;
		--lts-bg: #e2eefb;
		--lts-text: #155a9a;
		--error-bg: #fbefef;
		--error-border: #e4bbbb;
		--error-text: #b74040;
		--active-bg: #202a36;
		--active-text: #f8fafc;
		--kbd-bg: #f3f4f7;
		--kbd-shadow: #cfd5df;
	}

	:global(html) {
		color-scheme: light;
	}

	:global(html[data-theme='dark']) {
		color-scheme: dark;
		--bg: #111418;
		--text: #edf2f7;
		--muted: #a4aebb;
		--muted-soft: #8190a1;
		--border: #2c3845;
		--border-strong: #415063;
		--surface: rgba(19, 26, 34, 0.92);
		--surface-strong: #18212b;
		--surface-muted: rgba(24, 33, 43, 0.96);
		--shadow: 0 22px 52px rgba(0, 0, 0, 0.34);
		--card-shadow: none;
		--card-shadow-hover: 0 8px 20px rgba(0, 0, 0, 0.34);
		--accent: #81bcff;
		--accent-strong: #b8daff;
		--accent-soft: rgba(129, 188, 255, 0.2);
		--badge-bg: #22303f;
		--badge-text: #c0cfdd;
		--stable-bg: #193728;
		--stable-text: #8fe0a6;
		--pre-bg: #442f14;
		--pre-text: #ffc987;
		--lts-bg: #19354e;
		--lts-text: #8cc6ff;
		--error-bg: #311c20;
		--error-border: #6f3b43;
		--error-text: #ffb8bf;
		--active-bg: #f1f5f9;
		--active-text: #111a22;
		--kbd-bg: #18212b;
		--kbd-shadow: #0d131a;
	}

	@media (prefers-color-scheme: dark) {
		:global(html:not([data-theme='light'])) {
			color-scheme: dark;
			--bg: #111418;
			--text: #edf2f7;
			--muted: #a4aebb;
			--muted-soft: #8190a1;
			--border: #2c3845;
			--border-strong: #415063;
			--surface: rgba(19, 26, 34, 0.92);
			--surface-strong: #18212b;
			--surface-muted: rgba(24, 33, 43, 0.96);
			--shadow: 0 22px 52px rgba(0, 0, 0, 0.34);
			--card-shadow: none;
			--card-shadow-hover: 0 8px 20px rgba(0, 0, 0, 0.34);
			--accent: #81bcff;
			--accent-strong: #b8daff;
			--accent-soft: rgba(129, 188, 255, 0.2);
			--badge-bg: #22303f;
			--badge-text: #c0cfdd;
			--stable-bg: #193728;
			--stable-text: #8fe0a6;
			--pre-bg: #442f14;
			--pre-text: #ffc987;
			--lts-bg: #19354e;
			--lts-text: #8cc6ff;
			--error-bg: #311c20;
			--error-border: #6f3b43;
			--error-text: #ffb8bf;
			--active-bg: #f1f5f9;
			--active-text: #111a22;
			--kbd-bg: #18212b;
			--kbd-shadow: #0d131a;
		}
	}

	:global(body) {
		margin: 0;
		font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
		background: var(--bg);
		color: var(--text);
		transition: background 0.2s ease, color 0.2s ease;
	}

	.container {
		max-width: 1100px;
		margin: 0 auto;
		padding: 1.25rem 1.5rem 2rem;
	}

	header {
		margin-bottom: 1.5rem;
	}

	.theme-btn {
		display: inline-flex;
		align-items: center;
		gap: 0.45rem;
		border: none;
		background: transparent;
		color: var(--muted);
		font-size: inherit;
		font-weight: 600;
		padding: 0;
		padding-right: 0.55rem;
		margin-right: 0.1rem;
		border-radius: 0;
		border-right: 1px solid var(--border);
		cursor: pointer;
		transition: background-color 0.15s ease, color 0.15s ease;
	}

	.theme-btn:hover {
		color: var(--text);
	}

	.theme-btn svg {
		flex-shrink: 0;
	}

	.theme-value {
		line-height: 1;
	}

	.theme-btn:focus-visible,
	.search-clear:focus-visible,
	.chip:focus-visible,
	.expand-btn:focus-visible,
	.source-link:focus-visible,
	.copy-btn:focus-visible,
	.releases a:focus-visible,
	.cli-link:focus-visible,
	.github-link:focus-visible,
	h1 a:focus-visible {
		outline: 2px solid var(--accent);
		outline-offset: 3px;
	}

	.header-top {
		display: flex;
		align-items: baseline;
		gap: 1rem;
		margin-bottom: 1rem;
	}

	.header-meta {
		display: flex;
		align-items: center;
		margin-left: auto;
	}

	h1 {
		margin: 0;
		font-size: 1.75rem;
		font-weight: 700;
	}

	h1 a {
		color: inherit;
		text-decoration: none;
	}

	.tagline {
		margin: 0;
		color: var(--muted);
		font-size: 0.9rem;
	}

	.built-at {
		display: inline-flex;
		align-items: center;
		gap: 0.45rem;
		flex-wrap: wrap;
		color: var(--muted-soft);
		font-size: 0.8rem;
	}

	.cli-link, .github-link {
		color: var(--muted-soft);
		text-decoration: underline;
	}

	.cli-link:hover, .github-link:hover {
		color: var(--text);
	}

	.controls {
		display: flex;
		flex-direction: column;
		gap: 0.75rem;
	}

	.search-wrapper {
		position: relative;
	}

	.search {
		width: 100%;
		padding: 0.6rem 0.9rem;
		padding-right: 2rem;
		border: 1px solid var(--border);
		border-radius: 6px;
		font-size: 0.95rem;
		background: var(--surface);
		color: var(--text);
		box-sizing: border-box;
		transition: border-color 0.15s, box-shadow 0.15s;
	}

	.search::placeholder {
		color: var(--muted-soft);
	}

	.search:focus {
		outline: none;
		border-color: var(--accent);
		box-shadow: 0 0 0 4px var(--accent-soft);
		background: var(--surface-strong);
	}

	.search-actions {
		position: absolute;
		right: 0.5rem;
		top: 50%;
		transform: translateY(-50%);
		display: flex;
		align-items: center;
		gap: 0.35rem;
	}

	.search-clear {
		background: none;
		border: none;
		color: var(--muted-soft);
		cursor: pointer;
		font-size: 0.85rem;
		padding: 0.2rem 0.3rem;
		line-height: 1;
		border-radius: 3px;
	}

	.search-clear:hover {
		color: var(--text);
		background: var(--surface-muted);
	}

	.search-kbd {
		font-size: 0.75rem;
		font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
		font-weight: 500;
		color: var(--muted-soft);
		background: var(--kbd-bg);
		border: 1px solid var(--border);
		border-radius: 4px;
		padding: 0.1rem 0.4rem;
		line-height: 1.4;
		pointer-events: none;
		box-shadow: 0 1px 0 var(--kbd-shadow);
	}

	.search-wrapper > .search-kbd {
		position: absolute;
		right: 0.5rem;
		top: 50%;
		transform: translateY(-50%);
	}

	.categories {
		display: flex;
		flex-wrap: wrap;
		gap: 0.4rem;
	}

	.chip {
		padding: 0.3rem 0.7rem;
		border: 1px solid var(--border);
		border-radius: 20px;
		background: var(--surface);
		color: var(--text);
		font-size: 0.8rem;
		cursor: pointer;
		transition: all 0.15s;
	}

	.chip:hover {
		border-color: var(--border-strong);
	}

	.chip.active {
		background: var(--active-bg);
		color: var(--active-text);
		border-color: var(--active-bg);
	}

	.grid {
		display: grid;
		grid-template-columns: repeat(auto-fill, minmax(320px, 1fr));
		gap: 1rem;
	}

	.card {
		background: var(--surface);
		border-radius: 8px;
		padding: 1.1rem;
		border: 1px solid var(--border);
		transition: box-shadow 0.15s, border-color 0.15s;
		box-shadow: var(--card-shadow);
		backdrop-filter: blur(14px);
	}

	.card:hover {
		box-shadow: var(--card-shadow-hover);
	}

	.card.error {
		border-color: var(--error-border);
		background: var(--error-bg);
	}

	.card-header {
		display: flex;
		justify-content: space-between;
		align-items: center;
		margin-bottom: 0.75rem;
	}

	.card-header h2 {
		margin: 0;
		font-size: 1.1rem;
		font-weight: 600;
	}

	.badges {
		display: flex;
		gap: 0.3rem;
		flex-wrap: wrap;
	}

	.badge {
		font-size: 0.7rem;
		padding: 0.15rem 0.5rem;
		border-radius: 12px;
		background: var(--badge-bg);
		color: var(--badge-text);
		text-transform: uppercase;
		letter-spacing: 0.03em;
		font-weight: 500;
	}

	.version-info {
		display: flex;
		flex-direction: column;
		gap: 0.4rem;
		margin-bottom: 0.75rem;
	}

	.version-row {
		display: flex;
		align-items: center;
		gap: 0.5rem;
	}

	.label {
		font-size: 0.65rem;
		padding: 0.1rem 0.4rem;
		border-radius: 3px;
		font-weight: 600;
		text-transform: uppercase;
		letter-spacing: 0.03em;
		flex-shrink: 0;
	}

	.label.stable {
		background: var(--stable-bg);
		color: var(--stable-text);
	}

	.label.prerelease {
		background: var(--pre-bg);
		color: var(--pre-text);
	}

	.lts-badge {
		font-size: 0.65rem;
		padding: 0.1rem 0.35rem;
		border-radius: 3px;
		background: var(--lts-bg);
		color: var(--lts-text);
		font-weight: 600;
	}

	.version {
		font-family: 'SF Mono', Monaco, 'Cascadia Code', monospace;
		font-size: 0.95rem;
		font-weight: 600;
	}

	.copy-btn {
		background: none;
		border: none;
		cursor: pointer;
		padding: 0;
		margin-right: 0.4rem;
		color: inherit;
		display: inline-flex;
		align-items: center;
		gap: 0.35rem;
	}

	.copy-icon {
		color: var(--muted);
		display: inline-flex;
		align-items: center;
		vertical-align: middle;
		transition: color 0.15s;
	}

	.copy-btn:hover .copy-icon {
		color: var(--accent);
	}

	.date {
		color: var(--muted-soft);
		font-size: 0.8rem;
		margin-left: auto;
	}

	.error-msg {
		color: var(--error-text);
		font-size: 0.85rem;
		margin: 0;
	}

	.card-actions {
		display: flex;
		justify-content: space-between;
		align-items: center;
	}

	.expand-btn {
		background: none;
		border: none;
		font-size: 0.8rem;
		color: var(--accent);
		cursor: pointer;
		padding: 0.2rem 0;
	}

	.expand-btn:hover {
		color: var(--accent-strong);
	}

	.source-link {
		font-size: 0.8rem;
		color: var(--muted);
		text-decoration: none;
	}

	.source-link:hover {
		color: var(--text);
		text-decoration: underline;
	}

	.releases {
		margin-top: 0.75rem;
		border-top: 1px solid var(--border);
		padding-top: 0.5rem;
	}

	.releases table {
		width: 100%;
		border-collapse: collapse;
		font-size: 0.875rem;
	}

	.releases td {
		padding: 0.3rem 0.4rem;
	}

	.releases a {
		font-family: 'SF Mono', Monaco, 'Cascadia Code', monospace;
		color: var(--accent);
		text-decoration: none;
	}

	.releases a:hover {
		color: var(--accent-strong);
		text-decoration: underline;
	}

	.empty {
		text-align: center;
		color: var(--muted-soft);
		padding: 3rem;
	}

	@media (max-width: 600px) {
		.container {
			padding-inline: 1rem;
		}

		.theme-btn {
			justify-content: flex-start;
		}

		.grid {
			grid-template-columns: 1fr;
		}

		.header-top {
			flex-direction: column;
			gap: 0.5rem;
		}

		h1 {
			margin-bottom: 0.2rem;
		}

		.tagline {
			margin-bottom: 0.2rem;
		}

		.header-meta {
			width: 100%;
			align-items: stretch;
			margin-left: 0;
		}
	}
</style>
