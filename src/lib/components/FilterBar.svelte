<script lang="ts">
	import { goto } from '$app/navigation';
	import { page } from '$app/state';
	import { fade, fly } from 'svelte/transition';
	import type { Filters, FrequencyOption, Person, Room } from '$lib/types';
	import FrequencyChips from './FrequencyChips.svelte';
	import ScrollSelector from './ScrollSelector.svelte';

	let {
		frequencies,
		rooms,
		users,
		filters
	}: {
		frequencies: FrequencyOption[];
		rooms: Room[];
		users: Person[];
		filters: Filters;
	} = $props();

	const hasActiveFilters = $derived(
		Boolean(filters.frequency || filters.roomId || filters.assignee)
	);

	let open = $state(false);

	function setParam(key: string, value: string | null) {
		const params = new URLSearchParams(page.url.searchParams);
		if (value) {
			params.set(key, value);
		} else {
			params.delete(key);
		}
		const query = params.toString();
		goto(query ? `?${query}` : '?', { keepFocus: true, noScroll: true, replaceState: true });
	}

	function clearFilters() {
		goto('?', { keepFocus: true, noScroll: true, replaceState: true });
	}

	const roomItems = $derived([
		{ key: null, label: 'All rooms', accentVar: null },
		...rooms.map((room) => ({ key: room.id, label: room.name, accentVar: null }))
	]);

	const personItems = $derived([
		{ key: null, label: 'Everyone', accentVar: null },
		...users.map((user) => ({ key: user.id, label: user.displayName, accentVar: null }))
	]);
</script>

<button
	type="button"
	class="fixed top-[20%] left-0 z-30 -translate-y-1/2 rounded-r-lg bg-gray-500 py-3 pr-2.5 pl-2 text-white shadow-lg"
	onclick={() => (open = true)}
	aria-label="Filters"
>
	<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" class="h-5 w-5">
		<path stroke-linecap="round" stroke-linejoin="round" d="M4 6h16M7 12h10M10 18h4" />
	</svg>
	{#if hasActiveFilters}
		<span class="absolute top-1 right-1 h-1.5 w-1.5 rounded-full bg-emerald-400"></span>
	{/if}
</button>

{#if open}
	<div
		class="fixed inset-0 z-40 bg-black/30"
		onclick={() => (open = false)}
		transition:fade={{ duration: 150 }}
		role="presentation"
	></div>

	<div
		class="fixed top-0 bottom-0 left-0 z-50 w-[85%] max-w-xs overflow-y-auto bg-white p-4 shadow-xl"
		transition:fly={{ x: -300, duration: 200 }}
	>
		<div class="mb-4 flex items-center justify-between">
			<h2 class="text-base font-semibold">Filters</h2>
			<button
				type="button"
				class="p-1 text-gray-400"
				onclick={() => (open = false)}
				aria-label="Close"
			>
				<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" class="h-5 w-5">
					<path stroke-linecap="round" stroke-linejoin="round" d="M6 6l12 12M18 6l-12 12" />
				</svg>
			</button>
		</div>

		<div class="space-y-4">
			<div>
				<p class="mb-1 px-1 text-xs font-medium tracking-wide text-gray-500 uppercase">
					Frequency
				</p>
				<FrequencyChips
					{frequencies}
					selected={filters.frequency ?? null}
					onSelect={(key) => setParam('frequency', key)}
				/>
			</div>

			<div>
				<p class="mb-1 px-1 text-xs font-medium tracking-wide text-gray-500 uppercase">Room</p>
				<ScrollSelector
					items={roomItems}
					selected={filters.roomId ?? null}
					onSelect={(key) => setParam('room', key)}
				/>
			</div>

			<div>
				<p class="mb-1 px-1 text-xs font-medium tracking-wide text-gray-500 uppercase">Person</p>
				<ScrollSelector
					items={personItems}
					selected={filters.assignee ?? null}
					onSelect={(key) => setParam('assignee', key)}
				/>
			</div>

			{#if hasActiveFilters}
				<button type="button" class="btn-ghost w-full" onclick={clearFilters}>
					Clear filters
				</button>
			{/if}
		</div>
	</div>
{/if}
