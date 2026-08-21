<script lang="ts">
	import { enhance } from '$app/forms';
	import { invalidateAll } from '$app/navigation';
	import { toast } from '$lib/stores/toast';

	let timer: ReturnType<typeof setTimeout> | undefined;
	let remainingMs = 0;
	let startedAt = 0;

	function startTimer() {
		clearTimeout(timer);
		startedAt = Date.now();
		timer = setTimeout(() => toast.dismiss(), remainingMs);
	}

	function pause() {
		clearTimeout(timer);
		remainingMs -= Date.now() - startedAt;
	}

	function resume() {
		if (remainingMs > 0) {
			startTimer();
		}
	}

	$effect(() => {
		const current = $toast;
		clearTimeout(timer);
		if (current) {
			remainingMs = current.timeoutMs;
			startTimer();
		}
	});
</script>

{#if $toast}
	<div
		role="status"
		aria-live="polite"
		class="fixed inset-x-0 bottom-0 z-50 flex justify-center px-4 pb-[calc(env(safe-area-inset-bottom)+1rem)]"
		onmouseenter={pause}
		onmouseleave={resume}
		onfocusin={pause}
		onfocusout={resume}
	>
		<div class="flex items-center gap-3 rounded-lg bg-gray-900 px-4 py-3 text-sm text-white shadow-lg">
			<span>{$toast.message}</span>
			<form
				method="POST"
				action="/?/restore"
				use:enhance={() => {
					return async ({ result }) => {
						if (result.type === 'success') {
							toast.dismiss();
							await invalidateAll();
						}
					};
				}}
			>
				<input type="hidden" name="choreId" value={$toast.action} />
				<button type="submit" class="font-medium text-emerald-300 underline">
					{$toast.actionLabel}
				</button>
			</form>
		</div>
	</div>
{/if}
