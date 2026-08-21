<script lang="ts">
	import FrequencyIcon from './FrequencyIcon.svelte';

	type Item = { key: string | null; label: string; accentVar: string | null; icon?: string };

	let {
		items,
		selected,
		onSelect
	}: {
		items: Item[];
		selected: string | null;
		onSelect: (key: string | null) => void;
	} = $props();

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
	class="scrollbar-hide flex snap-x snap-mandatory gap-4 overflow-x-auto rounded-lg bg-stone-100 px-[50%] py-2.5"
>
	{#each items as item, i (item.key ?? 'all')}
		{@const isSelected = selected === item.key}
		{@const dist = distances[i] ?? (isSelected ? 0 : 1)}
		<button
			bind:this={chipEls[i]}
			type="button"
			class="flex shrink-0 snap-center items-center gap-1.5 rounded whitespace-nowrap text-sm font-medium transition-[transform,filter,opacity,color] duration-150"
			class:text-stone-900={isSelected && !item.accentVar}
			class:text-stone-500={!isSelected}
			style="
				{item.accentVar && isSelected ? `color: ${item.accentVar};` : ''}
				opacity: {1 - dist * 0.6};
				filter: grayscale({dist});
				transform: scale({1 - dist * 0.08});
			"
			onclick={() => onSelect(item.key)}
		>
			{#if item.icon}
				<FrequencyIcon key={item.icon} class="h-3.5 w-3.5" />
			{/if}
			{item.label}
		</button>
	{/each}
</div>
