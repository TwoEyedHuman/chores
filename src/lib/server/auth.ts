import { hash, verify } from '@node-rs/argon2';

export function hashPassword(plain: string): Promise<string> {
	return hash(plain);
}

export function verifyPassword(hashedPassword: string, plain: string): Promise<boolean> {
	return verify(hashedPassword, plain);
}
