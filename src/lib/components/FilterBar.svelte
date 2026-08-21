<script lang="ts">
	import { goto } from '$app/navigation';
	import { page } from '$app/state';
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

	{#if hasActiveFilters}
		<div class="flex justify-end">
			<button type="button" class="btn-ghost px-3 py-1.5" onclick={clearFilters}>
				Clear filters
			</button>
		</div>
	{/if}
</div>
