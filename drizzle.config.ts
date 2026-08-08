import { defineConfig } from 'drizzle-kit';

const databasePath = process.env.DATABASE_PATH ?? './data/chores.db';

export default defineConfig({
	schema: './src/lib/server/db/schema.ts',
	out: './drizzle',
	dialect: 'sqlite',
	dbCredentials: {
		url: databasePath
	}
});
