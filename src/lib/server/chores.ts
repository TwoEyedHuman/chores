import { randomUUID } from 'node:crypto';
import { and, eq, isNull, or, sql } from 'drizzle-orm';
import type { BetterSQLite3Database } from 'drizzle-orm/better-sqlite3';
import { db as defaultDb } from './db';
import { chores, completions, rooms, users } from './db/schema';
import { FREQUENCIES, type Frequency } from './frequency';
import type * as schema from './db/schema';
import type { Chore, ChoreGroup, Filters } from '../types';

type Database = BetterSQLite3Database<typeof schema>;

/** Thrown when a completion targets a chore that does not exist or has been archived. */
export class ChoreNotFoundError extends Error {
	constructor(public readonly choreId: string) {
		super(`Chore not found or archived: ${choreId}`);
		this.name = 'ChoreNotFoundError';
	}
}

export function isActive(
	chore: { frequency: Frequency },
	lastCompletedAt: number | null
): boolean {
	if (lastCompletedAt === null) {
		return true;
	}
	if (chore.frequency === 'one_off') {
		return false;
	}
	const intervalDays = FREQUENCIES[chore.frequency].intervalDays as number;
	return Date.now() - lastCompletedAt >= intervalDays * 86_400_000;
}

export function getChores(filters: Filters = {}, database: Database = defaultDb): ChoreGroup[] {
	const latestCompletion = database
		.select({
			choreId: completions.choreId,
			completedAt: sql<number>`max(${completions.completedAt})`.as('completed_at')
		})
		.from(completions)
		.groupBy(completions.choreId)
		.as('latest_completion');

	const conditions = [eq(chores.archived, 0)];
	if (filters.frequency) {
		conditions.push(eq(chores.frequency, filters.frequency));
	}
	if (filters.roomId) {
		conditions.push(eq(chores.roomId, filters.roomId));
	}
	if (filters.assignee) {
		conditions.push(
			or(eq(chores.assigneeUserId, filters.assignee), isNull(chores.assigneeUserId))!
		);
	}

	const rows = database
		.select({
			id: chores.id,
			title: chores.title,
			notes: chores.notes,
			frequency: chores.frequency,
			roomId: chores.roomId,
			roomName: rooms.name,
			assigneeUserId: chores.assigneeUserId,
			assigneeDisplayName: users.displayName,
			archived: chores.archived,
			createdAt: chores.createdAt,
			lastCompletedAt: latestCompletion.completedAt
		})
		.from(chores)
		.leftJoin(latestCompletion, eq(latestCompletion.choreId, chores.id))
		.innerJoin(rooms, eq(rooms.id, chores.roomId))
		.leftJoin(users, eq(users.id, chores.assigneeUserId))
		.where(and(...conditions))
		.all();

	const byFrequency = new Map<Frequency, Chore[]>();
	const inactive: Chore[] = [];

	for (const row of rows) {
		const frequency = row.frequency as Frequency;
		const chore: Chore = {
			id: row.id,
			title: row.title,
			notes: row.notes,
			frequency,
			roomId: row.roomId,
			roomName: row.roomName,
			assigneeUserId: row.assigneeUserId,
			assigneeDisplayName: row.assigneeDisplayName,
			archived: Boolean(row.archived),
			createdAt: row.createdAt,
			lastCompletedAt: row.lastCompletedAt,
			active: isActive({ frequency }, row.lastCompletedAt)
		};

		if (chore.active) {
			const list = byFrequency.get(frequency) ?? [];
			list.push(chore);
			byFrequency.set(frequency, list);
		} else {
			inactive.push(chore);
		}
	}

	const groups: ChoreGroup[] = [];
	const orderedFrequencies = (Object.keys(FREQUENCIES) as Frequency[]).sort(
		(a, b) => FREQUENCIES[a].sortRank - FREQUENCIES[b].sortRank
	);

	for (const frequency of orderedFrequencies) {
		const list = byFrequency.get(frequency);
		if (list && list.length > 0) {
			groups.push({ key: frequency, label: FREQUENCIES[frequency].label, chores: sortByTitle(list) });
		}
	}

	if (inactive.length > 0) {
		groups.push({ key: 'inactive', label: 'Inactive', chores: sortByTitle(inactive) });
	}

	return groups;
}

/**
 * Records that a chore was performed. Always a plain insert — never branches on the
 * chore's active state, so pressing "performed" on an inactive chore simply moves its
 * last-performed date forward.
 */
export function recordCompletion(
	choreId: string,
	userId: string | null = null,
	completedAt: number = Date.now(),
	database: Database = defaultDb
): void {
	const chore = database
		.select({ id: chores.id })
		.from(chores)
		.where(and(eq(chores.id, choreId), eq(chores.archived, 0)))
		.get();

	if (!chore) {
		throw new ChoreNotFoundError(choreId);
	}

	database
		.insert(completions)
		.values({ id: randomUUID(), choreId, userId, completedAt })
		.run();
}

function sortByTitle(list: Chore[]): Chore[] {
	return [...list].sort((a, b) => a.title.localeCompare(b.title));
}
