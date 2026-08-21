import { error, fail, redirect } from '@sveltejs/kit';
import {
	ChoreNotFoundError,
	deleteChore,
	frequencyOptions,
	getChoreById,
	getRooms,
	getUsers,
	updateChore
} from '$lib/server/chores';
import { parseChoreForm } from '$lib/server/choreForm';
import type { Frequency } from '$lib/server/frequency';
import type { Actions, PageServerLoad } from './$types';

export const load: PageServerLoad = ({ params }) => {
	const chore = getChoreById(params.id);

	if (!chore) {
		error(404, 'Chore not found');
	}

	return {
		chore,
		rooms: getRooms(),
		users: getUsers(),
		frequencies: frequencyOptions()
	};
};

export const actions: Actions = {
	update: async ({ params, request }) => {
		const result = parseChoreForm(await request.formData());

		if (!result.ok) {
			return fail(400, { ...result.values, error: result.error });
		}

		try {
			updateChore(params.id, {
				title: result.values.title,
				roomId: result.values.roomId,
				assigneeUserId: result.values.assigneeUserId || null,
				frequency: result.values.frequency as Frequency,
				lastPerformedAt: result.lastPerformedAtTimestamp
			});
		} catch (err) {
			if (err instanceof ChoreNotFoundError) {
				return fail(404, { ...result.values, error: 'Chore not found' });
			}
			throw err;
		}

		redirect(303, '/');
	},

	delete: async ({ params }) => {
		try {
			deleteChore(params.id);
		} catch (err) {
			if (err instanceof ChoreNotFoundError) {
				return fail(404, { error: 'Chore not found' });
			}
			throw err;
		}

		redirect(303, '/');
	}
};
