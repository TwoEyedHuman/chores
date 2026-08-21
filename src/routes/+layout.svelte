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
		<div class="flex items-center gap-4">
			<a href="/chores/new" class="text-sm text-blue-600 underline">Add chore</a>
			<form method="POST" action="/logout">
				<button type="submit" class="text-sm text-blue-600 underline">Log out</button>
			</form>
		</div>
	</header>
{/if}

{@render children()}
