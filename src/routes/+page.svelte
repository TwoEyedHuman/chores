<script lang="ts">
	import ChoreCard from '$lib/components/ChoreCard.svelte';
	import FilterBar from '$lib/components/FilterBar.svelte';
	import FrequencyIcon from '$lib/components/FrequencyIcon.svelte';
	import type { PageProps } from './$types';

	let { data }: PageProps = $props();

	const hasChores = $derived(data.groups.some((group) => group.chores.length > 0));
	const hasActiveFilters = $derived(
		Boolean(data.filters.frequency || data.filters.roomId || data.filters.assignee)
	);
</script>

<div class="page-container p-4">
	<FilterBar frequencies={data.frequencies} rooms={data.rooms} users={data.users} filters={data.filters} />

	{#if !hasChores}
		<div class="flex flex-col items-center gap-3 py-12 text-center">
			<svg
				viewBox="0 0 64 64"
				fill="none"
				class="h-14 w-14 text-sage-300"
				aria-hidden="true"
			>
				<path
					d="M24 40c0-9 4-14 4-22 0 8 8 11 8 20a8 8 0 0 1-16 0c0-2 1-4 4-6"
					stroke="currentColor"
					stroke-width="2.5"
					stroke-linecap="round"
					stroke-linejoin="round"
				/>
				<path
					d="M46 14l1.6 4.4L52 20l-4.4 1.6L46 26l-1.6-4.4L40 20l4.4-1.6L46 14z"
					fill="currentColor"
				/>
				<circle cx="16" cy="22" r="2" fill="currentColor" />
			</svg>
			<p class="text-stone-500">
				{hasActiveFilters ? 'No chores match your filters.' : 'No chores yet. Add one to get started.'}
			</p>
		</div>
	{:else}
		<div class="space-y-6">
			{#each data.groups as group (group.key)}
				<section>
					<h2
						class="mb-2 flex items-center gap-1.5 text-sm font-semibold tracking-wide text-stone-500 uppercase"
					>
						<FrequencyIcon key={group.key} class="h-3.5 w-3.5 opacity-70" />
						{group.label}
					</h2>
					<div class="grid grid-cols-1 gap-3 sm:grid-cols-2">
						{#each group.chores as chore (chore.id)}
							<ChoreCard {chore} />
						{/each}
					</div>
				</section>
			{/each}
		</div>
	{/if}
</div>
