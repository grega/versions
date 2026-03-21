<script lang="ts">
	import type { PackageInfo } from '$lib/types.js';

	let { data } = $props();
	let search = $state('');
	let activeCategory = $state('All');
	let expanded = $state<Record<string, boolean>>({});

	const categories = $derived(() => {
		const cats = new Set(data.packages.map((p: PackageInfo) => p.category));
		return ['All', ...Array.from(cats).sort()];
	});

	const filtered = $derived(() => {
		const q = search.toLowerCase();
		return data.packages.filter((p: PackageInfo) => {
			const matchesSearch = !q || p.name.toLowerCase().includes(q);
			const matchesCategory = activeCategory === 'All' || p.category === activeCategory;
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
		const diff = Date.now() - new Date(date).getTime();
		const days = Math.floor(diff / (1000 * 60 * 60 * 24));
		if (days === 0) return 'today';
		if (days === 1) return '1 day ago';
		if (days < 30) return `${days} days ago`;
		const months = Math.floor(days / 30);
		if (months === 1) return '1 month ago';
		if (months < 12) return `${months} months ago`;
		const years = Math.floor(months / 12);
		return years === 1 ? '1 year ago' : `${years} years ago`;
	}
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

<svelte:window onkeydown={handleKeydown} />

<div class="container">
	<header>
		<div class="header-top">
			<h1>Versions</h1>
			<p class="tagline">Release information for a selection of languages, frameworks, and tools</p>
			<span class="built-at">
				Updated {timeSince(data.builtAt)} &middot; {new Date(data.builtAt).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })}
			</span>
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
						<span class="badge">{pkg.category}</span>
					</div>

					{#if pkg.error}
						<p class="error-msg">Failed to fetch: {pkg.error}</p>
					{:else}
						<div class="version-info">
							{#if pkg.latestStable}
								<div class="version-row">
									<span class="label stable">stable</span>
									<button class="version copy-btn" onclick={() => copyVersion(pkg.latestStable.version)} title="Copy version">
										{pkg.latestStable.version}
										{@render copyIcon(pkg.latestStable.version)}
									</button>
									{#if pkg.latestStable.date}
										<span class="date" title={pkg.latestStable.date}>{timeSince(pkg.latestStable.date)}</span>
									{/if}
									{#if pkg.latestStable.lts && pkg.latestStable.lts !== false}
										<span class="lts-badge">LTS</span>
									{/if}
								</div>
							{/if}

							{#if pkg.latest && pkg.latest.prerelease && pkg.latest.version !== pkg.latestStable?.version}
								<div class="version-row">
									<span class="label prerelease">pre</span>
									<button class="version copy-btn" onclick={() => copyVersion(pkg.latest.version)} title="Copy version">
										{pkg.latest.version}
										{@render copyIcon(pkg.latest.version)}
									</button>
									{#if pkg.latest.date}
										<span class="date" title={pkg.latest.date}>{timeSince(pkg.latest.date)}</span>
									{/if}
								</div>
							{/if}
						</div>

						<div class="card-actions">
							<button class="expand-btn" onclick={() => toggleExpand(pkg.name)}>
								{expanded[pkg.name] ? '▼ Hide releases' : '▶ Show releases'}
							</button>
							<a href={pkg.sourceUrl} target="_blank" rel="noopener" class="source-link">Source ↗</a>
						</div>

						{#if expanded[pkg.name]}
							<div class="releases">
								<table>
									<tbody>
										{#each pkg.releases as release}
											<tr>
												<td>
													{#if release.url}
														<a href={release.url} target="_blank" rel="noopener">{release.version}</a>
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
													{#if release.lts && release.lts !== false}
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
	:global(body) {
		margin: 0;
		font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
		background: #f5f5f5;
		color: #1a1a1a;
	}

	.container {
		max-width: 1100px;
		margin: 0 auto;
		padding: 1.5rem;
	}

	header {
		margin-bottom: 1.5rem;
	}

	.header-top {
		display: flex;
		align-items: baseline;
		gap: 1rem;
		margin-bottom: 1rem;
	}

	h1 {
		margin: 0;
		font-size: 1.75rem;
		font-weight: 700;
	}

	.tagline {
		margin: 0;
		color: #666;
		font-size: 0.9rem;
	}

	.built-at {
		color: #999;
		font-size: 0.8rem;
		margin-left: auto;
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
		border: 1px solid #ddd;
		border-radius: 6px;
		font-size: 0.95rem;
		background: white;
		box-sizing: border-box;
		transition: border-color 0.15s, box-shadow 0.15s;
	}

	.search:focus {
		outline: none;
		border-color: #4a90d9;
		box-shadow: 0 0 0 3px rgba(74, 144, 217, 0.3);
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
		color: #999;
		cursor: pointer;
		font-size: 0.85rem;
		padding: 0.2rem 0.3rem;
		line-height: 1;
		border-radius: 3px;
	}

	.search-clear:hover {
		color: #333;
		background: #eee;
	}

	.search-kbd {
		font-size: 0.75rem;
		font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
		font-weight: 500;
		color: #999;
		background: #f5f5f5;
		border: 1px solid #ddd;
		border-radius: 4px;
		padding: 0.1rem 0.4rem;
		line-height: 1.4;
		pointer-events: none;
		box-shadow: 0 1px 0 #ccc;
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
		border: 1px solid #ddd;
		border-radius: 20px;
		background: white;
		font-size: 0.8rem;
		cursor: pointer;
		transition: all 0.15s;
	}

	.chip:hover {
		border-color: #999;
	}

	.chip.active {
		background: #1a1a1a;
		color: white;
		border-color: #1a1a1a;
	}

	.grid {
		display: grid;
		grid-template-columns: repeat(auto-fill, minmax(320px, 1fr));
		gap: 1rem;
	}

	.card {
		background: white;
		border-radius: 8px;
		padding: 1.1rem;
		border: 1px solid #e0e0e0;
		transition: box-shadow 0.15s;
	}

	.card:hover {
		box-shadow: 0 2px 8px rgba(0, 0, 0, 0.08);
	}

	.card.error {
		border-color: #e8c4c4;
		background: #fdf5f5;
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

	.badge {
		font-size: 0.7rem;
		padding: 0.15rem 0.5rem;
		border-radius: 12px;
		background: #eef2f7;
		color: #555;
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
		background: #e6f4ea;
		color: #1a7f37;
	}

	.label.prerelease {
		background: #fff3e0;
		color: #b35c00;
	}

	.lts-badge {
		font-size: 0.65rem;
		padding: 0.1rem 0.35rem;
		border-radius: 3px;
		background: #e3f2fd;
		color: #1565c0;
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
		color: #777;
		display: inline-flex;
		align-items: center;
		vertical-align: middle;
		transition: color 0.15s;
	}

	.copy-btn:hover .copy-icon {
		color: #4a90d9;
	}

	.date {
		color: #888;
		font-size: 0.8rem;
		margin-left: auto;
	}

	.error-msg {
		color: #c33;
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
		color: #4a90d9;
		cursor: pointer;
		padding: 0.2rem 0;
	}

	.expand-btn:hover {
		color: #2a6cb9;
	}

	.source-link {
		font-size: 0.8rem;
		color: #666;
		text-decoration: none;
	}

	.source-link:hover {
		color: #333;
		text-decoration: underline;
	}

	.releases {
		margin-top: 0.75rem;
		border-top: 1px solid #eee;
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
		color: #4a90d9;
		text-decoration: none;
	}

	.releases a:hover {
		text-decoration: underline;
	}

	.empty {
		text-align: center;
		color: #888;
		padding: 3rem;
	}

	@media (max-width: 600px) {
		.grid {
			grid-template-columns: 1fr;
		}

		.header-top {
			flex-direction: column;
			gap: 0.3rem;
		}
	}
</style>
