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
	<header class="sticky top-0 z-10 bg-white/90 backdrop-blur">
		<div class="page-container flex items-center justify-between px-4 py-3">
			<div class="flex items-center gap-2">
				<img src={favicon} alt="" class="h-7 w-7" />
				<span class="font-medium">{data.user.displayName}</span>
			</div>
			<form method="POST" action="/logout">
				<button type="submit" class="btn-ghost px-3 py-1.5">Log out</button>
			</form>
		</div>
		<svg viewBox="0 0 200 8" preserveAspectRatio="none" class="block h-2 w-full text-sage-200" aria-hidden="true">
			<path
				d="M0 4 Q 12.5 0 25 4 T 50 4 T 75 4 T 100 4 T 125 4 T 150 4 T 175 4 T 200 4 V8 H0 Z"
				fill="currentColor"
			/>
		</svg>
	</header>

	<a
		href="/chores/new"
		aria-label="Add chore"
		class="fixed right-4 z-40 flex h-14 w-14 items-center justify-center rounded-full bg-sage-600 text-white shadow-lg transition-colors hover:bg-sage-700"
		style="bottom: calc(env(safe-area-inset-bottom) + 1.25rem)"
	>
		<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" class="h-6 w-6">
			<path d="M12 5v14M5 12h14" />
		</svg>
	</a>
{/if}

{@render children()}

<Toast />
