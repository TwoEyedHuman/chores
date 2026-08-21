import { fail } from '@sveltejs/kit';
import { getChores, recordCompletion, ChoreNotFoundError } from '$lib/server/chores';
import type { Actions, PageServerLoad } from './$types';

export const load: PageServerLoad = () => {
	return { groups: getChores() };
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
