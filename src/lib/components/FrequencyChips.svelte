<script lang="ts">
	import type { FrequencyOption } from '$lib/types';
	import ScrollSelector from './ScrollSelector.svelte';

	let {
		frequencies,
		selected,
		onSelect
	}: {
		frequencies: FrequencyOption[];
		selected: string | null;
		onSelect: (key: string | null) => void;
	} = $props();

	const items = $derived([
		{ key: null, label: 'All', accentVar: null, icon: undefined },
		...frequencies.map((f) => ({
			key: f.key,
			label: f.label,
			accentVar: `var(--frequency-${f.key.replace(/_/g, '-')})`,
			icon: f.key
		}))
	]);
</script>

<ScrollSelector {items} {selected} {onSelect} />
