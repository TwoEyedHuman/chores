<script lang="ts">
	import { enhance } from '$app/forms';
	import { goto } from '$app/navigation';
	import type { Chore } from '$lib/types';
	import { formatAbsoluteDate, formatRelativeDate } from '$lib/relativeDate';
	import FrequencyIcon from './FrequencyIcon.svelte';

	let { chore }: { chore: Chore } = $props();

	const accentVar = $derived(`var(--frequency-${chore.frequency.replace(/_/g, '-')})`);
	const assigneeLabel = $derived(chore.assigneeDisplayName ?? 'Either');

	let pending = $state(false);
	let error = $state<string | null>(null);
	let pressing = $state(false);
	let pressGrown = $state(false);
	let pressOriginX = $state(0);
	let pressOriginY = $state(0);

	const LONG_PRESS_MS = 500;
	const MOVE_THRESHOLD_PX = 10;
	let pressTimer: ReturnType<typeof setTimeout> | undefined;
	let growFrame: ReturnType<typeof requestAnimationFrame> | undefined;
	let pressStartX = 0;
	let pressStartY = 0;

	function handlePointerDown(event: PointerEvent) {
		if ((event.target as HTMLElement).closest('form')) {
			return;
		}
		pressStartX = event.clientX;
		pressStartY = event.clientY;
		const rect = (event.currentTarget as HTMLElement).getBoundingClientRect();
		pressOriginX = event.clientX - rect.left;
		pressOriginY = event.clientY - rect.top;
		pressing = true;
		pressGrown = false;
		growFrame = requestAnimationFrame(() => {
			pressGrown = true;
		});
		pressTimer = setTimeout(() => {
			pressing = false;
			pressGrown = false;
			goto(`/chores/${chore.id}/edit`);
		}, LONG_PRESS_MS);
	}

	function cancelPress() {
		clearTimeout(pressTimer);
		if (growFrame) {
			cancelAnimationFrame(growFrame);
		}
		pressing = false;
		pressGrown = false;
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
	class="card relative overflow-hidden"
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
	{#if pressing}
		<span
			class="pointer-events-none absolute top-0 left-0 z-0 rounded-full bg-sage-500/15"
			style="
				width: 1200px;
				height: 1200px;
				left: {pressOriginX}px;
				top: {pressOriginY}px;
				transform: translate(-50%, -50%) scale({pressGrown ? 1 : 0});
				transition: transform {LONG_PRESS_MS * 2}ms linear;
			"
		></span>
	{/if}
	<div class="relative z-10 flex items-start justify-between gap-2">
		<div class="flex min-w-0 items-center gap-2">
			<span
				class="flex h-6 w-6 shrink-0 items-center justify-center rounded-full"
				style="background-color: color-mix(in srgb, {accentVar} 18%, white); color: {accentVar}"
			>
				<FrequencyIcon key={chore.frequency} class="h-3.5 w-3.5" />
			</span>
			<p class="truncate font-medium" class:text-stone-500={!chore.active}>{chore.title}</p>
		</div>
		<a
			href={`/chores/${chore.id}/edit`}
			aria-label={`Edit ${chore.title}`}
			class="shrink-0 rounded-full px-2 py-1 text-xs font-medium text-stone-400 hover:bg-stone-100 hover:text-stone-600"
		>
			Edit
		</a>
	</div>
	<p class="relative z-10 text-sm text-stone-500">{chore.roomName} · {assigneeLabel}</p>
	<p class="relative z-10 mb-3 text-sm text-stone-500">
		{#if chore.lastCompletedAt === null}
			Never
		{:else}
			<span title={formatAbsoluteDate(chore.lastCompletedAt)}>
				{formatRelativeDate(chore.lastCompletedAt)}
			</span>
		{/if}
	</p>
	<form
		class="relative z-10"
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
