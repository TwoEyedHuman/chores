import { fail, redirect } from '@sveltejs/kit';
import { createChore, frequencyOptions, getRooms, getUsers } from '$lib/server/chores';
import { FREQUENCIES, type Frequency } from '$lib/server/frequency';
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
		const data = await request.formData();
		const title = String(data.get('title') ?? '').trim();
		const roomId = String(data.get('roomId') ?? '');
		const assigneeUserId = String(data.get('assigneeUserId') ?? '');
		const frequency = String(data.get('frequency') ?? '');
		const lastPerformedAt = String(data.get('lastPerformedAt') ?? '').trim();

		const values = { title, roomId, assigneeUserId, frequency, lastPerformedAt };

		if (!title) {
			return fail(400, { ...values, error: 'Title is required.' });
		}
		if (!roomId) {
			return fail(400, { ...values, error: 'Room is required.' });
		}
		if (!(frequency in FREQUENCIES)) {
			return fail(400, { ...values, error: 'Frequency is required.' });
		}

		let lastPerformedTimestamp: number | null = null;
		if (lastPerformedAt) {
			const today = new Date().toISOString().slice(0, 10);
			if (lastPerformedAt > today) {
				return fail(400, { ...values, error: 'Date last performed cannot be in the future.' });
			}
			lastPerformedTimestamp = new Date(`${lastPerformedAt}T00:00:00.000Z`).getTime();
		}

		createChore({
			title,
			roomId,
			assigneeUserId: assigneeUserId || null,
			frequency: frequency as Frequency,
			lastPerformedAt: lastPerformedTimestamp
		});

		redirect(303, '/');
	}
};
