<script>
	let { data, children } = $props();
</script>

<svelte:head>
	{#if data.plausibleDomain}
		<script defer data-domain={data.plausibleDomain} src="{data.plausibleEndpoint}/js/script.file-downloads.hash.outbound-links.js"></script>
		<script>window.plausible = window.plausible || function() { (window.plausible.q = window.plausible.q || []).push(arguments) }</script>
	{/if}
</svelte:head>

{@render children()}
