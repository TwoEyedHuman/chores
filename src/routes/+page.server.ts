import { fail } from '@sveltejs/kit';
import {
	ChoreNotFoundError,
	frequencyOptions,
	getChores,
	getRooms,
	getUsers,
	recordCompletion
} from '$lib/server/chores';
import { FREQUENCIES, type Frequency } from '$lib/server/frequency';
import type { Filters } from '$lib/types';
import type { Actions, PageServerLoad } from './$types';

export const load: PageServerLoad = ({ url }) => {
	const filters: Filters = {};

	const frequency = url.searchParams.get('frequency');
	if (frequency && frequency in FREQUENCIES) {
		filters.frequency = frequency as Frequency;
	}

	const roomId = url.searchParams.get('room');
	if (roomId) {
		filters.roomId = roomId;
	}

	const assignee = url.searchParams.get('assignee');
	if (assignee) {
		filters.assignee = assignee;
	}

	return {
		groups: getChores(filters),
		frequencies: frequencyOptions(),
		rooms: getRooms(),
		users: getUsers(),
		filters
	};
};

export const actions: Actions = {
	markPerformed: async ({ request, locals }) => {
		const data = await request.formData();
		const choreId = data.get('choreId');

		if (typeof choreId !== 'string' || !choreId) {
			return fail(400, { error: 'Missing chore id' });
		}

		try {
			recordCompletion(choreId, locals.user!.id);
		} catch (error) {
			if (error instanceof ChoreNotFoundError) {
				return fail(404, { error: 'Chore not found' });
			}
			throw error;
		}

		return { success: true };
	}
};
