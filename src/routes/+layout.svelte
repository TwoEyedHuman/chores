<script lang="ts">
	import favicon from '$lib/assets/favicon.svg';
	import '../app.css';
	import type { LayoutProps } from './$types';

	let { children, data }: LayoutProps = $props();
</script>

<svelte:head>
	<link rel="icon" href={favicon} />
</svelte:head>

{#if data.user}
	<header class="flex items-center justify-between border-b p-4">
		<span class="font-medium">{data.user.displayName}</span>
		<form method="POST" action="/logout">
			<button type="submit" class="text-sm text-blue-600 underline">Log out</button>
		</form>
	</header>
{/if}

{@render children()}
