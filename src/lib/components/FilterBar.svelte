<script lang="ts">
	import { goto } from '$app/navigation';
	import { page } from '$app/state';
	import type { Filters, FrequencyOption, Person, Room } from '$lib/types';
	import FrequencyChips from './FrequencyChips.svelte';

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
</script>

<div class="mb-4 space-y-2">
	<FrequencyChips
		{frequencies}
		selected={filters.frequency ?? null}
		onSelect={(key) => setParam('frequency', key)}
	/>

	<div class="flex flex-wrap items-center gap-2">
		<select
			class="rounded border border-gray-300 bg-white px-2 py-1 text-sm"
			value={filters.roomId ?? ''}
			onchange={(e) => setParam('room', e.currentTarget.value || null)}
		>
			<option value="">All rooms</option>
			{#each rooms as room (room.id)}
				<option value={room.id}>{room.name}</option>
			{/each}
		</select>

		<select
			class="rounded border border-gray-300 bg-white px-2 py-1 text-sm"
			value={filters.assignee ?? ''}
			onchange={(e) => setParam('assignee', e.currentTarget.value || null)}
		>
			<option value="">Everyone</option>
			{#each users as user (user.id)}
				<option value={user.id}>{user.displayName}</option>
			{/each}
		</select>

		{#if hasActiveFilters}
			<button
				type="button"
				class="text-sm font-medium text-emerald-700 underline"
				onclick={clearFilters}
			>
				Clear filters
			</button>
		{/if}
	</div>
</div>
