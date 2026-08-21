<script lang="ts">
	import type { Snippet } from 'svelte';
	import type { FrequencyOption, Person, Room } from '$lib/types';

	let {
		action,
		rooms,
		users,
		frequencies,
		values,
		error,
		children
	}: {
		action: string;
		rooms: Room[];
		users: Person[];
		frequencies: FrequencyOption[];
		values: {
			title: string;
			roomId: string;
			assigneeUserId: string;
			frequency: string;
			lastPerformedAt: string;
		};
		error?: string | null;
		children?: Snippet;
	} = $props();
</script>

<form method="POST" {action} class="space-y-4">
	{#if error}
		<p class="rounded-lg bg-red-50 p-2 text-sm text-red-600">{error}</p>
	{/if}

	<div>
		<label for="title" class="field-label">Title</label>
		<input id="title" name="title" type="text" required value={values.title} class="field" />
	</div>

	<div>
		<label for="roomId" class="field-label">Room</label>
		<select id="roomId" name="roomId" required value={values.roomId} class="field">
			<option value="" disabled>Select a room</option>
			{#each rooms as room (room.id)}
				<option value={room.id}>{room.name}</option>
			{/each}
		</select>
	</div>

	<div>
		<label for="assigneeUserId" class="field-label">Person</label>
		<select id="assigneeUserId" name="assigneeUserId" value={values.assigneeUserId} class="field">
			{#each users as user (user.id)}
				<option value={user.id}>{user.displayName}</option>
			{/each}
			<option value="">Either</option>
		</select>
	</div>

	<div>
		<label for="frequency" class="field-label">Frequency</label>
		<select id="frequency" name="frequency" required value={values.frequency} class="field">
			<option value="" disabled>Select a frequency</option>
			{#each frequencies as frequency (frequency.key)}
				<option value={frequency.key}>{frequency.label}</option>
			{/each}
		</select>
	</div>

	<div>
		<label for="lastPerformedAt" class="field-label">Date last performed</label>
		<input
			id="lastPerformedAt"
			name="lastPerformedAt"
			type="date"
			value={values.lastPerformedAt}
			class="field"
		/>
	</div>

	{@render children?.()}
</form>
