<script lang="ts">
	import { onMount } from 'svelte';
	import favicon from '$lib/assets/favicon.svg';
	import Toast from '$lib/components/Toast.svelte';
	import '../app.css';
	import type { LayoutProps } from './$types';

	let { children, data }: LayoutProps = $props();

	let headerHidden = $state(false);

	onMount(() => {
		let lastY = window.scrollY;

		function onScroll() {
			const y = window.scrollY;
			headerHidden = y > lastY && y > 80;
			lastY = y;
		}

		window.addEventListener('scroll', onScroll, { passive: true });
		return () => window.removeEventListener('scroll', onScroll);
	});
</script>

<svelte:head>
	<link rel="icon" href={favicon} />
</svelte:head>

{#if data.user}
	<header
		class="sticky top-0 z-20 bg-white shadow-sm transition-transform duration-200 sm:translate-y-0 {headerHidden
			? '-translate-y-full'
			: 'translate-y-0'}"
	>
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
		class="fixed right-5 z-40 h-16 w-14 drop-shadow-lg transition-transform hover:scale-105"
		style="bottom: calc(env(safe-area-inset-bottom) + 1.25rem)"
	>
		<svg viewBox="0 0 28 34" class="h-full w-full">
			<g stroke-linecap="round">
				<path d="M22 6.5l2.2-1.6" stroke="var(--color-sage-400)" stroke-width="1.6" />
				<path d="M23 9.5h2.6" stroke="var(--color-sage-400)" stroke-width="1.6" />
				<path d="M22 12.5l2.2 1.6" stroke="var(--color-sage-400)" stroke-width="1.6" />
			</g>
			<rect x="18" y="8" width="4.5" height="2.6" rx="1" fill="var(--color-sage-700)" />
			<path
				d="M10 4h6a3 3 0 0 1 3 3v2a1 1 0 0 1-1 1h-7a1 1 0 0 1-1-1V4z"
				fill="var(--color-sage-700)"
			/>
			<path
				d="M13 3c0-1.2 1-2 2.4-2"
				stroke="var(--color-sage-700)"
				stroke-width="1.6"
				fill="none"
				stroke-linecap="round"
			/>
			<rect x="11" y="10" width="6" height="4" fill="var(--color-sage-600)" />
			<rect x="5" y="13" width="18" height="19" rx="4" fill="var(--color-sage-600)" />
			<rect x="9" y="19" width="10" height="8" rx="2" fill="white" />
			<path
				d="M14 21v4M12 23h4"
				stroke="var(--color-sage-700)"
				stroke-width="1.8"
				stroke-linecap="round"
			/>
		</svg>
	</a>
{/if}

{@render children()}

<Toast />
