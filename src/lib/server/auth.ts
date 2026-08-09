import { hash, verify } from '@node-rs/argon2';
import { createHmac, randomBytes } from 'node:crypto';
import { eq } from 'drizzle-orm';
import { db } from './db';
import { sessions, users } from './db/schema';

export function hashPassword(plain: string): Promise<string> {
	return hash(plain);
}

export function verifyPassword(hashedPassword: string, plain: string): Promise<boolean> {
	return verify(hashedPassword, plain);
}

const SESSION_DURATION_MS = 1000 * 60 * 60 * 24 * 30; // 30 days

type SessionUser = { id: string; username: string; displayName: string };

// Only the HMAC hash of the token is stored in the DB, so a database leak alone
// does not hand out usable session tokens.
function hashSessionToken(token: string): string {
	const secret = process.env.SESSION_SECRET;
	if (!secret) {
		throw new Error('SESSION_SECRET is not set');
	}
	return createHmac('sha256', secret).update(token).digest('hex');
}

export async function createSession(
	userId: string
): Promise<{ token: string; expiresAt: Date }> {
	const token = randomBytes(32).toString('hex');
	const id = hashSessionToken(token);
	const expiresAt = new Date(Date.now() + SESSION_DURATION_MS);

	db.insert(sessions).values({ id, userId, expiresAt: expiresAt.getTime() }).run();

	return { token, expiresAt };
}

export async function validateSession(
	token: string
): Promise<{ user: SessionUser; expiresAt: Date } | null> {
	const id = hashSessionToken(token);
	const result = db
		.select({
			expiresAt: sessions.expiresAt,
			user: { id: users.id, username: users.username, displayName: users.displayName }
		})
		.from(sessions)
		.innerJoin(users, eq(users.id, sessions.userId))
		.where(eq(sessions.id, id))
		.get();

	if (!result) {
		return null;
	}

	if (Date.now() >= result.expiresAt) {
		db.delete(sessions).where(eq(sessions.id, id)).run();
		return null;
	}

	const expiresAt = new Date(Date.now() + SESSION_DURATION_MS);
	db.update(sessions).set({ expiresAt: expiresAt.getTime() }).where(eq(sessions.id, id)).run();

	return { user: result.user, expiresAt };
}

export function destroySession(token: string): void {
	const id = hashSessionToken(token);
	db.delete(sessions).where(eq(sessions.id, id)).run();
}
