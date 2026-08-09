import { randomUUID } from 'node:crypto';
import { createInterface } from 'node:readline';
import { eq } from 'drizzle-orm';
import { db } from '../src/lib/server/db';
import { users } from '../src/lib/server/db/schema';
import { hashPassword } from '../src/lib/server/auth';

const [username, displayName] = process.argv.slice(2);

if (!username || !displayName) {
	console.error('Usage: tsx scripts/seed-users.ts <username> <display-name>');
	process.exit(1);
}

function promptPassword(question: string): Promise<string> {
	return new Promise((resolve) => {
		const rl = createInterface({ input: process.stdin, output: process.stdout });
		// @ts-expect-error - readline internal used to suppress echo of the password
		const originalWriteToOutput = rl._writeToOutput.bind(rl);
		// @ts-expect-error - see above
		rl._writeToOutput = (chunk: string) => {
			if (chunk.trim() === question.trim() || chunk.includes('\n')) {
				originalWriteToOutput(chunk);
			}
		};
		rl.question(question, (answer) => {
			rl.close();
			process.stdout.write('\n');
			resolve(answer);
		});
	});
}

const password = await promptPassword('Password: ');

if (!password) {
	console.error('Password must not be empty.');
	process.exit(1);
}

const passwordHash = await hashPassword(password);
const existing = db.select().from(users).where(eq(users.username, username)).get();

if (existing) {
	db.update(users).set({ passwordHash, displayName }).where(eq(users.id, existing.id)).run();
	console.log(`Updated password for user "${username}".`);
} else {
	db.insert(users).values({ id: randomUUID(), username, passwordHash, displayName }).run();
	console.log(`Created user "${username}".`);
}
