<script lang="ts">
	import type { Chore } from '$lib/types';
	import { formatAbsoluteDate, formatRelativeDate } from '$lib/relativeDate';

	let { chore }: { chore: Chore } = $props();

	const accentVar = $derived(`var(--frequency-${chore.frequency.replace(/_/g, '-')})`);
	const assigneeLabel = $derived(chore.assigneeDisplayName ?? 'Either');
</script>

<div
	class="rounded-md border-l-4 bg-white p-3 shadow-sm"
	class:opacity-60={!chore.active}
	style="border-left-color: {accentVar}"
>
	<p class="font-medium" class:text-gray-500={!chore.active}>{chore.title}</p>
	<p class="text-sm text-gray-500">{chore.roomName} · {assigneeLabel}</p>
	<p class="text-sm text-gray-500">
		{#if chore.lastCompletedAt === null}
			Never
		{:else}
			<span title={formatAbsoluteDate(chore.lastCompletedAt)}>
				{formatRelativeDate(chore.lastCompletedAt)}
			</span>
		{/if}
	</p>
</div>
