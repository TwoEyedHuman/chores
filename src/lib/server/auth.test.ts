import { describe, expect, it } from 'vitest';
import { hashPassword, verifyPassword } from './auth';

describe('verifyPassword', () => {
	it('returns true for the correct password', async () => {
		const hash = await hashPassword('correct-horse-battery-staple');
		await expect(verifyPassword(hash, 'correct-horse-battery-staple')).resolves.toBe(true);
	});

	it('returns false for a wrong password', async () => {
		const hash = await hashPassword('correct-horse-battery-staple');
		await expect(verifyPassword(hash, 'wrong-password')).resolves.toBe(false);
	});
});
