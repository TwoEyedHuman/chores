<script lang="ts">
	let { key, class: className = 'h-4 w-4' }: { key: string; class?: string } = $props();
</script>

{#if key === 'daily'}
	<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class={className}>
		<path d="M12 3c3.2 4.2 6 7.8 6 11.2a6 6 0 1 1-12 0C6 10.8 8.8 7.2 12 3z" />
	</svg>
{:else if key === 'weekly'}
	<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class={className}>
		<path d="M5 19c8.5 0 14-5.5 14-15-9.5 0-15 5.5-15 15z" />
		<path d="M5.5 18.5c2.8-3 5.6-5.8 9-9" />
	</svg>
{:else if key === 'monthly'}
	<svg viewBox="0 0 24 24" fill="currentColor" class={className}>
		<path d="M15.5 3.5a9 9 0 1 0 5 15.6 7.2 7.2 0 0 1-5-15.6z" />
	</svg>
{:else if key === 'quarterly'}
	<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" class={className}>
		<circle cx="12" cy="12" r="4" />
		<path d="M12 2.5v2.5M12 19v2.5M21.5 12H19M5 12H2.5M18.4 5.6l-1.8 1.8M7.4 16.6l-1.8 1.8M18.4 18.4l-1.8-1.8M7.4 7.4 5.6 5.6" />
	</svg>
{:else if key === 'biannual'}
	<svg viewBox="0 0 24 24" fill="currentColor" class={className}>
		<circle cx="12" cy="7.2" r="2.6" />
		<circle cx="16.8" cy="12" r="2.6" />
		<circle cx="12" cy="16.8" r="2.6" />
		<circle cx="7.2" cy="12" r="2.6" />
		<circle cx="12" cy="12" r="2" opacity="0.55" />
	</svg>
{:else if key === 'annual'}
	<svg viewBox="0 0 24 24" fill="currentColor" class={className}>
		<path d="M12 2.5l2.6 5.9 6.4.6-4.8 4.3 1.4 6.3L12 16.7l-5.6 2.9 1.4-6.3-4.8-4.3 6.4-.6z" />
	</svg>
{:else if key === 'one_off'}
	<svg viewBox="0 0 24 24" fill="currentColor" class={className}>
		<path d="M12 2l1.8 6.2L20 10l-6.2 1.8L12 18l-1.8-6.2L4 10l6.2-1.8z" />
	</svg>
{:else}
	<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class={className}>
		<circle cx="12" cy="12" r="8.5" />
		<path d="M8.5 12.5l2.2 2.2 4.8-4.8" />
	</svg>
{/if}
