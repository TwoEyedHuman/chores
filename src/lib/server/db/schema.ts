import { sql } from 'drizzle-orm';
import { index, integer, sqliteTable, text } from 'drizzle-orm/sqlite-core';

export const users = sqliteTable('users', {
	id: text('id').primaryKey(),
	username: text('username').notNull().unique(),
	passwordHash: text('password_hash').notNull(),
	displayName: text('display_name').notNull()
});

export const rooms = sqliteTable('rooms', {
	id: text('id').primaryKey(),
	name: text('name').notNull().unique(),
	sortOrder: integer('sort_order').notNull()
});

export const chores = sqliteTable('chores', {
	id: text('id').primaryKey(),
	title: text('title').notNull(),
	notes: text('notes'),
	frequency: text('frequency').notNull(),
	roomId: text('room_id')
		.notNull()
		.references(() => rooms.id),
	assigneeUserId: text('assignee_user_id').references(() => users.id),
	archived: integer('archived').notNull().default(0),
	createdAt: integer('created_at').notNull()
});

export const completions = sqliteTable(
	'completions',
	{
		id: text('id').primaryKey(),
		choreId: text('chore_id')
			.notNull()
			.references(() => chores.id, { onDelete: 'cascade' }),
		userId: text('user_id').references(() => users.id),
		completedAt: integer('completed_at').notNull()
	},
	(table) => [
		index('completions_chore_id_completed_at_idx').on(table.choreId, sql`${table.completedAt} desc`)
	]
);
