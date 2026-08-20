import { getChores } from '$lib/server/chores';
import type { PageServerLoad } from './$types';

export const load: PageServerLoad = () => {
	return { groups: getChores() };
};
