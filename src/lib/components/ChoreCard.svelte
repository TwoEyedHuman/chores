<script lang="ts">
	import { enhance } from '$app/forms';
	import { goto } from '$app/navigation';
	import type { Chore } from '$lib/types';
	import { formatAbsoluteDate, formatRelativeDate } from '$lib/relativeDate';

	let { chore }: { chore: Chore } = $props();

	const accentVar = $derived(`var(--frequency-${chore.frequency.replace(/_/g, '-')})`);
	const assigneeLabel = $derived(chore.assigneeDisplayName ?? 'Either');

	let pending = $state(false);
	let error = $state<string | null>(null);
	let pressing = $state(false);

	const LONG_PRESS_MS = 500;
	const MOVE_THRESHOLD_PX = 10;
	let pressTimer: ReturnType<typeof setTimeout> | undefined;
	let pressStartX = 0;
	let pressStartY = 0;

	function handlePointerDown(event: PointerEvent) {
		if ((event.target as HTMLElement).closest('form')) {
			return;
		}
		pressStartX = event.clientX;
		pressStartY = event.clientY;
		pressing = true;
		pressTimer = setTimeout(() => {
			pressing = false;
			goto(`/chores/${chore.id}/edit`);
		}, LONG_PRESS_MS);
	}

	function cancelPress() {
		clearTimeout(pressTimer);
		pressing = false;
	}

	function handlePointerMove(event: PointerEvent) {
		if (!pressTimer) {
			return;
		}
		const dx = event.clientX - pressStartX;
		const dy = event.clientY - pressStartY;
		if (Math.hypot(dx, dy) > MOVE_THRESHOLD_PX) {
			cancelPress();
		}
	}
</script>

<!-- svelte-ignore a11y_no_static_element_interactions -- pointer-only long-press shortcut; the Edit link below is the accessible route -->
<div
	class="card"
	class:opacity-60={!chore.active}
	class:scale-[0.98]={pressing}
	style="border-left-color: {accentVar}"
	onpointerdown={handlePointerDown}
	onpointerup={cancelPress}
	onpointercancel={cancelPress}
	onpointerleave={cancelPress}
	onpointermove={handlePointerMove}
	oncontextmenu={(e) => e.preventDefault()}
>
	<div class="flex items-start justify-between gap-2">
		<p class="font-medium" class:text-gray-500={!chore.active}>{chore.title}</p>
		<a
			href={`/chores/${chore.id}/edit`}
			aria-label={`Edit ${chore.title}`}
			class="shrink-0 rounded-full px-2 py-1 text-xs font-medium text-gray-400 hover:bg-gray-100 hover:text-gray-600"
		>
			Edit
		</a>
	</div>
	<p class="text-sm text-gray-500">{chore.roomName} · {assigneeLabel}</p>
	<p class="mb-3 text-sm text-gray-500">
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
		<button type="submit" disabled={pending} class="btn-primary w-full">
			{pending ? 'Saving…' : 'Mark performed'}
		</button>
	</form>
	{#if error}
		<p class="mt-1 text-sm text-red-600">{error}</p>
	{/if}
</div>
