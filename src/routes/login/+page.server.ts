import { eq } from 'drizzle-orm';
import { fail, redirect } from '@sveltejs/kit';
import { db } from '$lib/server/db';
import { users } from '$lib/server/db/schema';
import { createSession, hashPassword, verifyPassword } from '$lib/server/auth';
import type { Actions, PageServerLoad } from './$types';

const INVALID_CREDENTIALS_ERROR = 'Invalid username or password';

// Hashed once and reused when the username doesn't exist, so the response
// time doesn't leak whether the username was valid.
const dummyPasswordHash = hashPassword(randomHex());

function randomHex(): string {
	return Array.from({ length: 32 }, () => Math.floor(Math.random() * 16).toString(16)).join('');
}

export const load: PageServerLoad = ({ locals }) => {
	if (locals.user) {
		throw redirect(302, '/');
	}
};

export const actions: Actions = {
	default: async ({ request, cookies }) => {
		const data = await request.formData();
		const username = data.get('username');
		const password = data.get('password');

		if (typeof username !== 'string' || typeof password !== 'string' || !username || !password) {
			return fail(400, { error: INVALID_CREDENTIALS_ERROR });
		}

		const user = db.select().from(users).where(eq(users.username, username)).get();
		const validPassword = await verifyPassword(user?.passwordHash ?? (await dummyPasswordHash), password);

		if (!user || !validPassword) {
			return fail(400, { error: INVALID_CREDENTIALS_ERROR });
		}

		const { token, expiresAt } = await createSession(user.id);
		cookies.set('session', token, {
			path: '/',
			httpOnly: true,
			sameSite: 'lax',
			secure: process.env.NODE_ENV === 'production',
			expires: expiresAt
		});

		throw redirect(302, '/');
	}
};
