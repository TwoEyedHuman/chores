import '$lib/server/db';
import { redirect, type Handle } from '@sveltejs/kit';
import { validateSession } from '$lib/server/auth';

const SESSION_COOKIE = 'session';
const PUBLIC_PATHS = new Set(['/login']);

function isPublicPath(pathname: string): boolean {
	return PUBLIC_PATHS.has(pathname) || pathname.startsWith('/_app/');
}

export const handle: Handle = async ({ event, resolve }) => {
	const token = event.cookies.get(SESSION_COOKIE);
	event.locals.user = null;

	if (token) {
		const result = await validateSession(token);
		if (result) {
			event.locals.user = result.user;
			event.cookies.set(SESSION_COOKIE, token, {
				path: '/',
				httpOnly: true,
				sameSite: 'lax',
				secure: process.env.NODE_ENV === 'production',
				expires: result.expiresAt
			});
		} else {
			event.cookies.delete(SESSION_COOKIE, { path: '/' });
		}
	}

	if (!event.locals.user && !isPublicPath(event.url.pathname)) {
		throw redirect(302, '/login');
	}

	return resolve(event);
};
