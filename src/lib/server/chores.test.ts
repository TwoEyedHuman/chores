import { randomUUID } from 'node:crypto';
import Database from 'better-sqlite3';
import { drizzle } from 'drizzle-orm/better-sqlite3';
import { migrate } from 'drizzle-orm/better-sqlite3/migrator';
import { beforeEach, describe, expect, it } from 'vitest';
import {
	ChoreNotFoundError,
	createChore,
	deleteChore,
	getChoreById,
	getChores,
	isActive,
	recordCompletion,
	restoreChore,
	updateChore
} from './chores';
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

describe('recordCompletion', () => {
	let db: Db;
	let roomId: string;

	beforeEach(() => {
		db = createTestDb();
		roomId = seedRoom(db);
	});

	it('moves an active weekly chore to the Inactive group', () => {
		const choreId = seedChore(db, roomId, { title: 'Vacuum', frequency: 'weekly' });
		expect(getChores({}, db)[0].key).toBe('weekly');

		recordCompletion(choreId, null, Date.now(), db);

		const groups = getChores({}, db);
		expect(groups).toHaveLength(1);
		expect(groups[0].key).toBe('inactive');
		expect(groups[0].chores[0].id).toBe(choreId);
	});

	it('updates the last-completed timestamp of an already-inactive chore', () => {
		const choreId = seedChore(db, roomId, { title: 'Vacuum', frequency: 'weekly' });
		const twoDaysAgo = Date.now() - 2 * DAY_MS;
		seedCompletion(db, choreId, twoDaysAgo);
		expect(getChores({}, db)[0].key).toBe('inactive');

		const now = Date.now();
		recordCompletion(choreId, null, now, db);

		const groups = getChores({}, db);
		expect(groups[0].key).toBe('inactive');
		expect(groups[0].chores[0].lastCompletedAt).toBe(now);
	});

	it('populates user_id when a user is supplied', () => {
		const userId = seedUser(db, 'alice');
		const choreId = seedChore(db, roomId);

		recordCompletion(choreId, userId, Date.now(), db);

		const rows = db.select().from(completions).all();
		expect(rows).toHaveLength(1);
		expect(rows[0].userId).toBe(userId);
	});

	it('accepts a null user_id for backdated entries', () => {
		const choreId = seedChore(db, roomId);

		recordCompletion(choreId, null, Date.now(), db);

		const rows = db.select().from(completions).all();
		expect(rows[0].userId).toBeNull();
	});

	it('defaults completed_at to now', () => {
		const choreId = seedChore(db, roomId);
		const before = Date.now();

		recordCompletion(choreId, null, undefined, db);

		const rows = db.select().from(completions).all();
		expect(rows[0].completedAt).toBeGreaterThanOrEqual(before);
		expect(rows[0].completedAt).toBeLessThanOrEqual(Date.now());
	});

	it('throws ChoreNotFoundError for a nonexistent chore and inserts nothing', () => {
		expect(() => recordCompletion(randomUUID(), null, Date.now(), db)).toThrow(ChoreNotFoundError);
		expect(db.select().from(completions).all()).toHaveLength(0);
	});

	it('throws ChoreNotFoundError for an archived chore and inserts nothing', () => {
		const choreId = seedChore(db, roomId, { archived: 1 });

		expect(() => recordCompletion(choreId, null, Date.now(), db)).toThrow(ChoreNotFoundError);
		expect(db.select().from(completions).all()).toHaveLength(0);
	});
});

describe('createChore', () => {
	let db: Db;
	let roomId: string;

	beforeEach(() => {
		db = createTestDb();
		roomId = seedRoom(db);
	});

	it('creates a chore with no completion when no last-performed date is given', () => {
		createChore(
			{ title: 'Dishes', roomId, assigneeUserId: null, frequency: 'weekly', lastPerformedAt: null },
			db
		);

		const rows = db.select().from(chores).all();
		expect(rows).toHaveLength(1);
		expect(rows[0].title).toBe('Dishes');
		expect(db.select().from(completions).all()).toHaveLength(0);
		expect(getChores({}, db)[0].chores[0].lastCompletedAt).toBeNull();
	});

	it('inserts a backdated completion with a null user_id when a last-performed date is given', () => {
		const tenDaysAgo = Date.now() - 10 * DAY_MS;

		const choreId = createChore(
			{
				title: 'Vacuum',
				roomId,
				assigneeUserId: null,
				frequency: 'weekly',
				lastPerformedAt: tenDaysAgo
			},
			db
		);

		const rows = db.select().from(completions).all();
		expect(rows).toHaveLength(1);
		expect(rows[0].choreId).toBe(choreId);
		expect(rows[0].userId).toBeNull();
		expect(rows[0].completedAt).toBe(tenDaysAgo);
	});

	it('a chore backdated past its interval lands in the Inactive group', () => {
		const yesterday = Date.now() - DAY_MS;

		createChore(
			{ title: 'Vacuum', roomId, assigneeUserId: null, frequency: 'weekly', lastPerformedAt: yesterday },
			db
		);

		const groups = getChores({}, db);
		expect(groups[0].key).toBe('inactive');
	});

	it('stores a null assignee for "Either" and the chore matches both people\'s filters', () => {
		const alice = seedUser(db, 'alice');
		const bob = seedUser(db, 'bob');

		createChore(
			{ title: 'Shared', roomId, assigneeUserId: null, frequency: 'daily', lastPerformedAt: null },
			db
		);

		expect(getChores({ assignee: alice }, db)[0].chores).toHaveLength(1);
		expect(getChores({ assignee: bob }, db)[0].chores).toHaveLength(1);
	});
});

describe('getChoreById', () => {
	let db: Db;
	let roomId: string;

	beforeEach(() => {
		db = createTestDb();
		roomId = seedRoom(db);
	});

	it('returns the chore with its latest completion', () => {
		const choreId = seedChore(db, roomId, { title: 'Vacuum' });
		const completedAt = Date.now() - 2 * DAY_MS;
		seedCompletion(db, choreId, completedAt);

		const chore = getChoreById(choreId, db);

		expect(chore?.title).toBe('Vacuum');
		expect(chore?.lastCompletedAt).toBe(completedAt);
	});

	it('returns null for a nonexistent chore', () => {
		expect(getChoreById(randomUUID(), db)).toBeNull();
	});

	it('returns null for an archived chore', () => {
		const choreId = seedChore(db, roomId, { archived: 1 });
		expect(getChoreById(choreId, db)).toBeNull();
	});
});

describe('updateChore', () => {
	let db: Db;
	let roomId: string;

	beforeEach(() => {
		db = createTestDb();
		roomId = seedRoom(db);
	});

	it('updates title, room, assignee, and frequency', () => {
		const otherRoom = seedRoom(db, 'Bathroom');
		const alice = seedUser(db, 'alice');
		const choreId = seedChore(db, roomId, { title: 'Old', frequency: 'weekly' });

		updateChore(
			choreId,
			{ title: 'New', roomId: otherRoom, assigneeUserId: alice, frequency: 'monthly', lastPerformedAt: null },
			db
		);

		const chore = getChoreById(choreId, db);
		expect(chore?.title).toBe('New');
		expect(chore?.roomId).toBe(otherRoom);
		expect(chore?.assigneeUserId).toBe(alice);
		expect(chore?.frequency).toBe('monthly');
	});

	it('re-groups the chore when frequency changes', () => {
		const choreId = seedChore(db, roomId, { frequency: 'weekly' });
		expect(getChores({}, db)[0].key).toBe('weekly');

		updateChore(
			choreId,
			{ title: 'Chore', roomId, assigneeUserId: null, frequency: 'monthly', lastPerformedAt: null },
			db
		);

		expect(getChores({}, db)[0].key).toBe('monthly');
	});

	it('leaving the last-performed date unchanged does not touch the completions row', () => {
		const completedAt = Date.now() - 3 * DAY_MS;
		const choreId = seedChore(db, roomId);
		seedCompletion(db, choreId, completedAt);
		const sameDate = new Date(completedAt).toISOString().slice(0, 10);
		const sameDateTimestamp = new Date(`${sameDate}T00:00:00.000Z`).getTime();

		updateChore(
			choreId,
			{ title: 'Chore', roomId, assigneeUserId: null, frequency: 'weekly', lastPerformedAt: sameDateTimestamp },
			db
		);

		const rows = db.select().from(completions).all();
		expect(rows).toHaveLength(1);
		expect(rows[0].completedAt).toBe(completedAt);
	});

	it('changing the last-performed date updates the existing completion, not a new row', () => {
		const choreId = seedChore(db, roomId);
		seedCompletion(db, choreId, Date.now() - 5 * DAY_MS);
		const newDate = Date.now() - 2 * DAY_MS;

		updateChore(
			choreId,
			{ title: 'Chore', roomId, assigneeUserId: null, frequency: 'weekly', lastPerformedAt: newDate },
			db
		);

		const rows = db.select().from(completions).all();
		expect(rows).toHaveLength(1);
		expect(rows[0].completedAt).toBe(newDate);
	});

	it('clearing the last-performed date deletes the most recent completion', () => {
		const choreId = seedChore(db, roomId);
		seedCompletion(db, choreId, Date.now() - 5 * DAY_MS);

		updateChore(
			choreId,
			{ title: 'Chore', roomId, assigneeUserId: null, frequency: 'weekly', lastPerformedAt: null },
			db
		);

		expect(db.select().from(completions).all()).toHaveLength(0);
	});

	it('setting a last-performed date on a chore with none inserts a completion', () => {
		const choreId = seedChore(db, roomId);
		const performedAt = Date.now() - DAY_MS;

		updateChore(
			choreId,
			{ title: 'Chore', roomId, assigneeUserId: null, frequency: 'weekly', lastPerformedAt: performedAt },
			db
		);

		const rows = db.select().from(completions).all();
		expect(rows).toHaveLength(1);
		expect(rows[0].completedAt).toBe(performedAt);
		expect(rows[0].userId).toBeNull();
	});

	it('throws ChoreNotFoundError for a missing or archived chore', () => {
		const archivedId = seedChore(db, roomId, { archived: 1 });
		expect(() =>
			updateChore(
				archivedId,
				{ title: 'X', roomId, assigneeUserId: null, frequency: 'weekly', lastPerformedAt: null },
				db
			)
		).toThrow(ChoreNotFoundError);
		expect(() =>
			updateChore(
				randomUUID(),
				{ title: 'X', roomId, assigneeUserId: null, frequency: 'weekly', lastPerformedAt: null },
				db
			)
		).toThrow(ChoreNotFoundError);
	});
});

describe('deleteChore / restoreChore', () => {
	let db: Db;
	let roomId: string;

	beforeEach(() => {
		db = createTestDb();
		roomId = seedRoom(db);
	});

	it('archives a chore, hiding it from getChores but keeping its row', () => {
		const choreId = seedChore(db, roomId);

		deleteChore(choreId, db);

		expect(getChores({}, db)).toEqual([]);
		const rows = db.select().from(chores).all();
		expect(rows).toHaveLength(1);
		expect(rows[0].archived).toBe(1);
	});

	it('restoreChore is the exact inverse of deleteChore', () => {
		const choreId = seedChore(db, roomId, { frequency: 'daily' });

		deleteChore(choreId, db);
		expect(getChores({}, db)).toEqual([]);

		restoreChore(choreId, db);
		expect(getChores({}, db)[0].chores.map((c) => c.id)).toEqual([choreId]);
	});

	it('deleteChore throws ChoreNotFoundError for a missing or already-archived chore', () => {
		const choreId = seedChore(db, roomId);
		deleteChore(choreId, db);

		expect(() => deleteChore(choreId, db)).toThrow(ChoreNotFoundError);
		expect(() => deleteChore(randomUUID(), db)).toThrow(ChoreNotFoundError);
	});

	it('restoreChore throws ChoreNotFoundError for a missing or non-archived chore', () => {
		const choreId = seedChore(db, roomId);

		expect(() => restoreChore(choreId, db)).toThrow(ChoreNotFoundError);
		expect(() => restoreChore(randomUUID(), db)).toThrow(ChoreNotFoundError);
	});
});
