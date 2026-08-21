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

	type Item = { key: string | null; label: string; accentVar: string | null };

	const items = $derived<Item[]>([
		{ key: null, label: 'All', accentVar: null },
		...frequencies.map((f) => ({
			key: f.key,
			label: f.label,
			accentVar: `var(--frequency-${f.key.replace(/_/g, '-')})`
		}))
	]);

	let scroller: HTMLDivElement | undefined = $state();
	let chipEls: (HTMLButtonElement | undefined)[] = [];
	let distances = $state<number[]>([]);
	let scrollEndTimer: ReturnType<typeof setTimeout> | undefined;
	let programmatic = false;
	let mounted = false;

	function updateDistances() {
		if (!scroller) return;
		const rect = scroller.getBoundingClientRect();
		const center = rect.left + rect.width / 2;
		distances = chipEls.map((el) => {
			if (!el) return 1;
			const r = el.getBoundingClientRect();
			const chipCenter = r.left + r.width / 2;
			return Math.min(1, Math.abs(chipCenter - center) / (rect.width / 2));
		});
	}

	function handleScroll() {
		updateDistances();
		if (programmatic) return;
		clearTimeout(scrollEndTimer);
		scrollEndTimer = setTimeout(settleToCenter, 120);
	}

	function settleToCenter() {
		if (distances.length === 0) return;
		let closestIndex = 0;
		let closestDist = Infinity;
		distances.forEach((d, i) => {
			if (d < closestDist) {
				closestDist = d;
				closestIndex = i;
			}
		});
		const item = items[closestIndex];
		if (item && item.key !== selected) {
			onSelect(item.key);
		}
	}

	function centerOn(index: number, behavior: ScrollBehavior) {
		const el = chipEls[index];
		if (!el) return;
		programmatic = true;
		el.scrollIntoView({ behavior, inline: 'center', block: 'nearest' });
		clearTimeout(scrollEndTimer);
		setTimeout(
			() => {
				programmatic = false;
				updateDistances();
			},
			behavior === 'smooth' ? 350 : 50
		);
	}

	$effect(() => {
		const index = items.findIndex((item) => item.key === selected);
		if (index >= 0) {
			centerOn(index, mounted ? 'smooth' : 'auto');
		}
		mounted = true;
	});
</script>

<div
	bind:this={scroller}
	onscroll={handleScroll}
	class="scrollbar-hide flex snap-x snap-mandatory gap-2 overflow-x-auto px-[50%] py-2"
>
	{#each items as item, i (item.key ?? 'all')}
		{@const isSelected = selected === item.key}
		{@const dist = distances[i] ?? (isSelected ? 0 : 1)}
		<button
			bind:this={chipEls[i]}
			type="button"
			class="shrink-0 snap-center rounded-full border px-4 py-1.5 text-sm font-medium whitespace-nowrap transition-[transform,filter,opacity] duration-150"
			class:bg-gray-900={isSelected}
			class:text-white={isSelected}
			class:border-gray-900={isSelected}
			class:bg-white={!isSelected}
			class:border-gray-200={!isSelected}
			class:text-gray-700={!isSelected}
			style="
				{item.accentVar && isSelected
				? `background-color: ${item.accentVar}; border-color: ${item.accentVar};`
				: ''}
				opacity: {1 - dist * 0.6};
				filter: grayscale({dist});
				transform: scale({1 - dist * 0.12});
			"
			onclick={() => onSelect(item.key)}
		>
			{item.label}
		</button>
	{/each}
</div>
