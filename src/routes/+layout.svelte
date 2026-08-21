<script lang="ts">
	import favicon from '$lib/assets/favicon.svg';
	import Toast from '$lib/components/Toast.svelte';
	import '../app.css';
	import type { LayoutProps } from './$types';

	let { children, data }: LayoutProps = $props();
</script>

<svelte:head>
	<link rel="icon" href={favicon} />
</svelte:head>

{#if data.user}
	<header class="sticky top-0 z-10 border-b border-gray-200 bg-white/90 backdrop-blur">
		<div class="page-container flex items-center justify-between px-4 py-3">
			<span class="font-medium">{data.user.displayName}</span>
			<div class="flex items-center gap-2">
				<a href="/chores/new" class="btn-primary px-3 py-1.5">Add chore</a>
				<form method="POST" action="/logout">
					<button type="submit" class="btn-ghost px-3 py-1.5">Log out</button>
				</form>
			</div>
		</div>
	</header>
{/if}

{@render children()}

<Toast />
