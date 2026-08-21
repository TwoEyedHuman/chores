<script lang="ts">
	import { applyAction, enhance } from '$app/forms';
	import { goto } from '$app/navigation';
	import ChoreForm from '$lib/components/ChoreForm.svelte';
	import { formatDateInput } from '$lib/relativeDate';
	import { toast } from '$lib/stores/toast';
	import type { ActionData, PageProps } from './$types';

	let { data, form }: PageProps & { form: ActionData } = $props();

	const values = $derived({
		title: form?.title ?? data.chore.title,
		roomId: form?.roomId ?? data.chore.roomId,
		assigneeUserId: form?.assigneeUserId ?? (data.chore.assigneeUserId ?? ''),
		frequency: form?.frequency ?? data.chore.frequency,
		lastPerformedAt:
			form?.lastPerformedAt ??
			(data.chore.lastCompletedAt !== null ? formatDateInput(data.chore.lastCompletedAt) : '')
	});

	let deleting = $state(false);
</script>

<div class="mx-auto max-w-md p-4">
	<h1 class="mb-4 text-lg font-semibold">Edit chore</h1>

	<ChoreForm
		action="?/update"
		rooms={data.rooms}
		users={data.users}
		frequencies={data.frequencies}
		{values}
		error={form?.error}
	>
		<button type="submit" class="btn-primary w-full">Save</button>
	</ChoreForm>

	<form
		method="POST"
		action="?/delete"
		class="mt-8 border-t border-gray-200 pt-4"
		use:enhance={() => {
			deleting = true;
			return async ({ result }) => {
				if (result.type === 'redirect') {
					toast.show({
						message: `"${data.chore.title}" deleted`,
						actionLabel: 'Undo',
						action: data.chore.id,
						timeoutMs: 6000
					});
					goto(result.location);
				} else {
					deleting = false;
					await applyAction(result);
				}
			};
		}}
	>
		<button type="submit" disabled={deleting} class="btn-danger w-full">
			{deleting ? 'Deleting…' : 'Delete chore'}
		</button>
	</form>
</div>
