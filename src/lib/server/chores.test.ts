import { randomUUID } from 'node:crypto';
import Database from 'better-sqlite3';
import { drizzle } from 'drizzle-orm/better-sqlite3';
import { migrate } from 'drizzle-orm/better-sqlite3/migrator';
import { beforeEach, describe, expect, it } from 'vitest';
import { getChores, isActive } from './chores';
import * as schema from './db/schema';
import { chores, completions, rooms, users } from './db/schema';

function createTestDb() {
	const sqlite = new Database(':memory:');
	sqlite.pragma('foreign_keys = ON');
	const db = drizzle(sqlite, { schema });
	migrate(db, { migrationsFolder: 'drizzle' });
	return db;
}

type Db = ReturnType<typeof createTestDb>;

const DAY_MS = 86_400_000;

function seedRoom(db: Db, name = 'Kitchen') {
	const id = randomUUID();
	db.insert(rooms).values({ id, name, sortOrder: 0 }).run();
	return id;
}

function seedUser(db: Db, username: string) {
	const id = randomUUID();
	db.insert(users).values({ id, username, passwordHash: 'hash', displayName: username }).run();
	return id;
}

function seedChore(
	db: Db,
	roomId: string,
	overrides: Partial<{
		title: string;
		frequency: string;
		assigneeUserId: string | null;
		archived: number;
	}> = {}
) {
	const id = randomUUID();
	db.insert(chores)
		.values({
			id,
			title: overrides.title ?? 'Chore',
			frequency: overrides.frequency ?? 'weekly',
			roomId,
			assigneeUserId: overrides.assigneeUserId ?? null,
			archived: overrides.archived ?? 0,
			createdAt: Date.now()
		})
		.run();
	return id;
}

function seedCompletion(db: Db, choreId: string, completedAt: number, userId: string | null = null) {
	db.insert(completions).values({ id: randomUUID(), choreId, userId, completedAt }).run();
}

describe('isActive', () => {
	it('is active when never completed', () => {
		expect(isActive({ frequency: 'weekly' }, null)).toBe(true);
	});

	it('is inactive when a weekly chore was completed yesterday', () => {
		const yesterday = Date.now() - DAY_MS;
		expect(isActive({ frequency: 'weekly' }, yesterday)).toBe(false);
	});

	it('is active when the same weekly chore was completed 8 days ago', () => {
		const eightDaysAgo = Date.now() - 8 * DAY_MS;
		expect(isActive({ frequency: 'weekly' }, eightDaysAgo)).toBe(true);
	});

	it('is inactive forever once a one_off chore is completed', () => {
		const longAgo = Date.now() - 365 * DAY_MS;
		expect(isActive({ frequency: 'one_off' }, longAgo)).toBe(false);
	});
});

describe('getChores', () => {
	let db: Db;
	let roomId: string;

	beforeEach(() => {
		db = createTestDb();
		roomId = seedRoom(db);
	});

	it('groups active chores by frequency in sortRank order with a final Inactive group', () => {
		const daily = seedChore(db, roomId, { title: 'Dishes', frequency: 'daily' });
		const weeklyInactive = seedChore(db, roomId, { title: 'Vacuum', frequency: 'weekly' });
		seedCompletion(db, weeklyInactive, Date.now() - DAY_MS);
		const monthly = seedChore(db, roomId, { title: 'Filters', frequency: 'monthly' });

		const groups = getChores({}, db);

		expect(groups.map((g) => g.key)).toEqual(['daily', 'monthly', 'inactive']);
		expect(groups.find((g) => g.key === 'daily')?.chores.map((c) => c.id)).toEqual([daily]);
		expect(groups.find((g) => g.key === 'monthly')?.chores.map((c) => c.id)).toEqual([monthly]);
		expect(groups.find((g) => g.key === 'inactive')?.chores.map((c) => c.id)).toEqual([
			weeklyInactive
		]);
	});

	it('sorts chores within a group by title', () => {
		const b = seedChore(db, roomId, { title: 'Bathroom', frequency: 'daily' });
		const a = seedChore(db, roomId, { title: 'Arrange books', frequency: 'daily' });

		const groups = getChores({}, db);

		expect(groups[0].chores.map((c) => c.id)).toEqual([a, b]);
	});

	it('excludes archived chores', () => {
		seedChore(db, roomId, { title: 'Gone', frequency: 'daily', archived: 1 });

		const groups = getChores({}, db);

		expect(groups).toEqual([]);
	});

	it('omits empty groups', () => {
		seedChore(db, roomId, { title: 'Only daily', frequency: 'daily' });

		const groups = getChores({}, db);

		expect(groups).toHaveLength(1);
		expect(groups[0].key).toBe('daily');
	});

	it('filters by frequency', () => {
		seedChore(db, roomId, { title: 'Daily one', frequency: 'daily' });
		seedChore(db, roomId, { title: 'Weekly one', frequency: 'weekly' });

		const groups = getChores({ frequency: 'weekly' }, db);

		expect(groups.map((g) => g.key)).toEqual(['weekly']);
	});

	it('filters by room', () => {
		const otherRoom = seedRoom(db, 'Bathroom');
		seedChore(db, roomId, { title: 'Kitchen chore', frequency: 'daily' });
		const otherChore = seedChore(db, otherRoom, { title: 'Bathroom chore', frequency: 'daily' });

		const groups = getChores({ roomId: otherRoom }, db);

		expect(groups[0].chores.map((c) => c.id)).toEqual([otherChore]);
	});

	it('filtering by a person returns their chores and unassigned ones, excluding the other person', () => {
		const alice = seedUser(db, 'alice');
		const bob = seedUser(db, 'bob');
		const aliceChore = seedChore(db, roomId, { title: "Alice's", frequency: 'daily', assigneeUserId: alice });
		const bobChore = seedChore(db, roomId, { title: "Bob's", frequency: 'daily', assigneeUserId: bob });
		const sharedChore = seedChore(db, roomId, { title: 'Shared', frequency: 'daily', assigneeUserId: null });

		const groups = getChores({ assignee: alice }, db);

		const ids = groups[0].chores.map((c) => c.id).sort();
		expect(ids).toEqual([aliceChore, sharedChore].sort());
		expect(ids).not.toContain(bobChore);
	});

	it('no filter (All) matches everything', () => {
		seedChore(db, roomId, { title: 'One', frequency: 'daily' });
		seedChore(db, roomId, { title: 'Two', frequency: 'weekly' });

		const groups = getChores({}, db);

		expect(groups).toHaveLength(2);
	});
});
