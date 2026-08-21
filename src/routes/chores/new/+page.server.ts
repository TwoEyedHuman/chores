import { fail, redirect } from '@sveltejs/kit';
import { createChore, frequencyOptions, getRooms, getUsers } from '$lib/server/chores';
import { parseChoreForm } from '$lib/server/choreForm';
import type { Frequency } from '$lib/server/frequency';
import type { Actions, PageServerLoad } from './$types';

export const load: PageServerLoad = () => {
	return {
		rooms: getRooms(),
		users: getUsers(),
		frequencies: frequencyOptions()
	};
};

export const actions: Actions = {
	create: async ({ request }) => {
		const result = parseChoreForm(await request.formData());

		if (!result.ok) {
			return fail(400, { ...result.values, error: result.error });
		}

		createChore({
			title: result.values.title,
			roomId: result.values.roomId,
			assigneeUserId: result.values.assigneeUserId || null,
			frequency: result.values.frequency as Frequency,
			lastPerformedAt: result.lastPerformedAtTimestamp
		});

		redirect(303, '/');
	}
};
