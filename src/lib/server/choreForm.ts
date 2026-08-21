import { FREQUENCIES } from './frequency';

export type ChoreFormValues = {
	title: string;
	roomId: string;
	assigneeUserId: string;
	frequency: string;
	lastPerformedAt: string;
};

export type ChoreFormResult =
	| { ok: true; values: ChoreFormValues; lastPerformedAtTimestamp: number | null }
	| { ok: false; values: ChoreFormValues; error: string };

/** Shared field parsing and validation for the create and edit chore forms. */
export function parseChoreForm(data: FormData): ChoreFormResult {
	const values: ChoreFormValues = {
		title: String(data.get('title') ?? '').trim(),
		roomId: String(data.get('roomId') ?? ''),
		assigneeUserId: String(data.get('assigneeUserId') ?? ''),
		frequency: String(data.get('frequency') ?? ''),
		lastPerformedAt: String(data.get('lastPerformedAt') ?? '').trim()
	};

	if (!values.title) {
		return { ok: false, values, error: 'Title is required.' };
	}
	if (!values.roomId) {
		return { ok: false, values, error: 'Room is required.' };
	}
	if (!(values.frequency in FREQUENCIES)) {
		return { ok: false, values, error: 'Frequency is required.' };
	}

	let lastPerformedAtTimestamp: number | null = null;
	if (values.lastPerformedAt) {
		const today = new Date().toISOString().slice(0, 10);
		if (values.lastPerformedAt > today) {
			return { ok: false, values, error: 'Date last performed cannot be in the future.' };
		}
		lastPerformedAtTimestamp = new Date(`${values.lastPerformedAt}T00:00:00.000Z`).getTime();
	}

	return { ok: true, values, lastPerformedAtTimestamp };
}
