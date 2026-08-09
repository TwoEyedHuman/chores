import { redirect } from '@sveltejs/kit';
import { destroySession } from '$lib/server/auth';
import type { RequestHandler } from './$types';

export const POST: RequestHandler = async ({ cookies }) => {
	const token = cookies.get('session');
	if (token) {
		destroySession(token);
		cookies.delete('session', { path: '/' });
	}

	throw redirect(302, '/login');
};
