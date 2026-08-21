const rtf = new Intl.RelativeTimeFormat('en', { numeric: 'auto' });
const DAY_MS = 86_400_000;

export function formatRelativeDate(timestamp: number): string {
	const days = Math.round((timestamp - Date.now()) / DAY_MS);
	return rtf.format(days, 'day');
}

export function formatAbsoluteDate(timestamp: number): string {
	return new Date(timestamp).toLocaleDateString('en-US', {
		year: 'numeric',
		month: 'short',
		day: 'numeric'
	});
}

/** Formats a timestamp as a `YYYY-MM-DD` string for a `<input type="date">` value. */
export function formatDateInput(timestamp: number): string {
	return new Date(timestamp).toISOString().slice(0, 10);
}
