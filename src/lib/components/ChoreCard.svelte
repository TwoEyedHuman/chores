<script lang="ts">
	import { enhance } from '$app/forms';
	import type { Chore } from '$lib/types';
	import { formatAbsoluteDate, formatRelativeDate } from '$lib/relativeDate';

	let { chore }: { chore: Chore } = $props();

	const accentVar = $derived(`var(--frequency-${chore.frequency.replace(/_/g, '-')})`);
	const assigneeLabel = $derived(chore.assigneeDisplayName ?? 'Either');

	let pending = $state(false);
	let error = $state<string | null>(null);
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
	<form
		method="POST"
		action="?/markPerformed"
		use:enhance={() => {
			pending = true;
			error = null;
			return async ({ update, result }) => {
				await update();
				pending = false;
				if (result.type === 'failure') {
					error = (result.data?.error as string) ?? 'Something went wrong';
				}
			};
		}}
	>
		<input type="hidden" name="choreId" value={chore.id} />
		<button
			type="submit"
			disabled={pending}
			class="mt-2 rounded bg-emerald-600 px-3 py-1.5 text-sm font-medium text-white disabled:opacity-50"
		>
			{pending ? 'Saving…' : 'Mark performed'}
		</button>
	</form>
	{#if error}
		<p class="mt-1 text-sm text-red-600">{error}</p>
	{/if}
</div>
