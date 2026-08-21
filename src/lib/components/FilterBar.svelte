<script lang="ts">
	import { goto } from '$app/navigation';
	import { page } from '$app/state';
	import { untrack } from 'svelte';
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
	const hasMoreActive = $derived(Boolean(filters.roomId || filters.assignee));

	let expanded = $state(untrack(() => Boolean(filters.roomId || filters.assignee)));

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

<div class="mb-4 space-y-2">
	<FrequencyChips
		{frequencies}
		selected={filters.frequency ?? null}
		onSelect={(key) => setParam('frequency', key)}
	/>

	<div class="flex items-center justify-between px-1">
		<button
			type="button"
			class="text-sm font-medium text-gray-500"
			onclick={() => (expanded = !expanded)}
		>
			{expanded ? 'Fewer filters' : 'More filters'}{hasMoreActive && !expanded ? ' •' : ''}
		</button>

		{#if hasActiveFilters}
			<button type="button" class="btn-ghost px-3 py-1.5" onclick={clearFilters}>
				Clear filters
			</button>
		{/if}
	</div>

	{#if expanded}
		<ScrollSelector
			items={roomItems}
			selected={filters.roomId ?? null}
			onSelect={(key) => setParam('room', key)}
		/>

		<ScrollSelector
			items={personItems}
			selected={filters.assignee ?? null}
			onSelect={(key) => setParam('assignee', key)}
		/>
	{/if}
</div>
