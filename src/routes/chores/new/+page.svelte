<script lang="ts">
	import type { ActionData, PageProps } from './$types';

	let { data, form }: PageProps & { form: ActionData } = $props();
</script>

<div class="mx-auto max-w-md p-4">
	<h1 class="mb-4 text-lg font-semibold">Add chore</h1>

	{#if form?.error}
		<p class="mb-4 rounded bg-red-50 p-2 text-sm text-red-600">{form.error}</p>
	{/if}

	<form method="POST" action="?/create" class="space-y-4">
		<div>
			<label for="title" class="block text-sm font-medium text-gray-700">Title</label>
			<input
				id="title"
				name="title"
				type="text"
				required
				value={form?.title ?? ''}
				class="mt-1 w-full rounded border border-gray-300 px-2 py-1.5 text-sm"
			/>
		</div>

		<div>
			<label for="roomId" class="block text-sm font-medium text-gray-700">Room</label>
			<select
				id="roomId"
				name="roomId"
				required
				value={form?.roomId ?? ''}
				class="mt-1 w-full rounded border border-gray-300 bg-white px-2 py-1.5 text-sm"
			>
				<option value="" disabled>Select a room</option>
				{#each data.rooms as room (room.id)}
					<option value={room.id}>{room.name}</option>
				{/each}
			</select>
		</div>

		<div>
			<label for="assigneeUserId" class="block text-sm font-medium text-gray-700">Person</label>
			<select
				id="assigneeUserId"
				name="assigneeUserId"
				value={form?.assigneeUserId ?? ''}
				class="mt-1 w-full rounded border border-gray-300 bg-white px-2 py-1.5 text-sm"
			>
				{#each data.users as user (user.id)}
					<option value={user.id}>{user.displayName}</option>
				{/each}
				<option value="">Either</option>
			</select>
		</div>

		<div>
			<label for="frequency" class="block text-sm font-medium text-gray-700">Frequency</label>
			<select
				id="frequency"
				name="frequency"
				required
				value={form?.frequency ?? ''}
				class="mt-1 w-full rounded border border-gray-300 bg-white px-2 py-1.5 text-sm"
			>
				<option value="" disabled>Select a frequency</option>
				{#each data.frequencies as frequency (frequency.key)}
					<option value={frequency.key}>{frequency.label}</option>
				{/each}
			</select>
		</div>

		<div>
			<label for="lastPerformedAt" class="block text-sm font-medium text-gray-700">
				Date last performed
			</label>
			<input
				id="lastPerformedAt"
				name="lastPerformedAt"
				type="date"
				value={form?.lastPerformedAt ?? ''}
				class="mt-1 w-full rounded border border-gray-300 px-2 py-1.5 text-sm"
			/>
		</div>

		<button
			type="submit"
			class="w-full rounded bg-emerald-600 px-3 py-2 text-sm font-medium text-white"
		>
			Add chore
		</button>
	</form>
</div>
