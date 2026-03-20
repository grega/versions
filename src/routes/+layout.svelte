<script>
	let { data, children } = $props();
</script>

<svelte:head>
	{#if data.plausibleDomain}
		<script defer data-domain={data.plausibleDomain} src="https://plausible.io/js/script.js"></script>
	{/if}
</svelte:head>

{@render children()}
