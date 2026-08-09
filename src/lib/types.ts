import type { Frequency } from './server/frequency';

export type Chore = {
	id: string;
	title: string;
	notes: string | null;
	frequency: Frequency;
	roomId: string;
	assigneeUserId: string | null;
	archived: boolean;
	createdAt: number;
	lastCompletedAt: number | null;
	active: boolean;
};

export type ChoreGroup = {
	key: Frequency | 'inactive';
	label: string;
	chores: Chore[];
};

export type Filters = {
	frequency?: Frequency;
	roomId?: string;
	assignee?: string;
};
