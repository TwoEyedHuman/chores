import { describe, expect, it } from 'vitest';
import { parseChoreForm } from './choreForm';

function makeFormData(fields: Record<string, string>): FormData {
	const data = new FormData();
	for (const [key, value] of Object.entries(fields)) {
		data.set(key, value);
	}
	return data;
}

describe('parseChoreForm', () => {
	it('accepts a fully filled form with no last-performed date', () => {
		const result = parseChoreForm(
			makeFormData({
				title: 'Dishes',
				roomId: 'room-1',
				assigneeUserId: '',
				frequency: 'weekly',
				lastPerformedAt: ''
			})
		);

		expect(result.ok).toBe(true);
		if (result.ok) {
			expect(result.lastPerformedAtTimestamp).toBeNull();
		}
	});

	it('rejects a missing title and preserves the other field values', () => {
		const result = parseChoreForm(
			makeFormData({
				title: '',
				roomId: 'room-1',
				assigneeUserId: '',
				frequency: 'weekly',
				lastPerformedAt: ''
			})
		);

		expect(result.ok).toBe(false);
		if (!result.ok) {
			expect(result.error).toMatch(/title/i);
			expect(result.values.roomId).toBe('room-1');
		}
	});

	it('rejects a missing room', () => {
		const result = parseChoreForm(
			makeFormData({ title: 'Dishes', roomId: '', assigneeUserId: '', frequency: 'weekly', lastPerformedAt: '' })
		);

		expect(result.ok).toBe(false);
		if (!result.ok) {
			expect(result.error).toMatch(/room/i);
		}
	});

	it('rejects an invalid frequency', () => {
		const result = parseChoreForm(
			makeFormData({
				title: 'Dishes',
				roomId: 'room-1',
				assigneeUserId: '',
				frequency: 'yearly',
				lastPerformedAt: ''
			})
		);

		expect(result.ok).toBe(false);
		if (!result.ok) {
			expect(result.error).toMatch(/frequency/i);
		}
	});

	it('rejects a future last-performed date', () => {
		const tomorrow = new Date(Date.now() + 86_400_000).toISOString().slice(0, 10);

		const result = parseChoreForm(
			makeFormData({
				title: 'Dishes',
				roomId: 'room-1',
				assigneeUserId: '',
				frequency: 'weekly',
				lastPerformedAt: tomorrow
			})
		);

		expect(result.ok).toBe(false);
		if (!result.ok) {
			expect(result.error).toMatch(/future/i);
		}
	});

	it('accepts today as the last-performed date', () => {
		const today = new Date().toISOString().slice(0, 10);

		const result = parseChoreForm(
			makeFormData({
				title: 'Dishes',
				roomId: 'room-1',
				assigneeUserId: '',
				frequency: 'weekly',
				lastPerformedAt: today
			})
		);

		expect(result.ok).toBe(true);
		if (result.ok) {
			expect(result.lastPerformedAtTimestamp).not.toBeNull();
		}
	});
});
