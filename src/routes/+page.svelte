<script lang="ts">
	import ChoreCard from '$lib/components/ChoreCard.svelte';
	import type { PageProps } from './$types';

	let { data }: PageProps = $props();

	const hasChores = $derived(data.groups.some((group) => group.chores.length > 0));
</script>

<div class="p-4">
	{#if !hasChores}
		<p class="text-gray-500">No chores yet. Add one to get started.</p>
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
