<script lang="ts">
	import type { FrequencyOption } from '$lib/types';

	let {
		frequencies,
		selected,
		onSelect
	}: {
		frequencies: FrequencyOption[];
		selected: string | null;
		onSelect: (key: string | null) => void;
	} = $props();
</script>

<div class="scrollbar-hide flex gap-2 overflow-x-auto pb-1">
	<button
		type="button"
		class="shrink-0 rounded-full border px-3 py-1 text-sm font-medium whitespace-nowrap"
		class:bg-gray-900={selected === null}
		class:text-white={selected === null}
		class:border-gray-900={selected === null}
		class:border-gray-300={selected !== null}
		class:text-gray-700={selected !== null}
		onclick={() => onSelect(null)}
	>
		All
	</button>
	{#each frequencies as freq (freq.key)}
		{@const isSelected = selected === freq.key}
		{@const accentVar = `var(--frequency-${freq.key.replace(/_/g, '-')})`}
		<button
			type="button"
			class="shrink-0 rounded-full border px-3 py-1 text-sm font-medium whitespace-nowrap"
			class:text-white={isSelected}
			class:border-gray-300={!isSelected}
			class:text-gray-700={!isSelected}
			style={isSelected ? `background-color: ${accentVar}; border-color: ${accentVar};` : ''}
			onclick={() => onSelect(freq.key)}
		>
			{freq.label}
		</button>
	{/each}
</div>
