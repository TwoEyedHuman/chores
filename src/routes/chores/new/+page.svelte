<script lang="ts">
	import ChoreForm from '$lib/components/ChoreForm.svelte';
	import type { ActionData, PageProps } from './$types';

	let { data, form }: PageProps & { form: ActionData } = $props();

	const values = $derived({
		title: form?.title ?? '',
		roomId: form?.roomId ?? '',
		assigneeUserId: form?.assigneeUserId ?? '',
		frequency: form?.frequency ?? '',
		lastPerformedAt: form?.lastPerformedAt ?? ''
	});
</script>

<div class="mx-auto max-w-md p-4">
	<h1 class="mb-4 text-lg font-semibold">Add chore</h1>

	<ChoreForm
		action="?/create"
		rooms={data.rooms}
		users={data.users}
		frequencies={data.frequencies}
		{values}
		error={form?.error}
	>
		<button type="submit" class="btn-primary w-full">Add chore</button>
	</ChoreForm>
</div>
