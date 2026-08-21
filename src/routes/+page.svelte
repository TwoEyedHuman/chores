<script lang="ts">
	import ChoreCard from '$lib/components/ChoreCard.svelte';
	import FilterBar from '$lib/components/FilterBar.svelte';
	import type { PageProps } from './$types';

	let { data }: PageProps = $props();

	const hasChores = $derived(data.groups.some((group) => group.chores.length > 0));
	const hasActiveFilters = $derived(
		Boolean(data.filters.frequency || data.filters.roomId || data.filters.assignee)
	);
</script>

<div class="p-4">
	<FilterBar frequencies={data.frequencies} rooms={data.rooms} users={data.users} filters={data.filters} />

	{#if !hasChores}
		<p class="text-gray-500">
			{hasActiveFilters ? 'No chores match your filters.' : 'No chores yet. Add one to get started.'}
		</p>
	{:else}
		<div class="space-y-6">
			{#each data.groups as group (group.key)}
				<section>
					<h2 class="mb-2 text-sm font-semibold tracking-wide text-gray-500 uppercase">
						{group.label}
					</h2>
					<div class="grid grid-cols-1 gap-3 md:grid-cols-2">
						{#each group.chores as chore (chore.id)}
							<ChoreCard {chore} />
						{/each}
					</div>
				</section>
			{/each}
		</div>
	{/if}
</div>
