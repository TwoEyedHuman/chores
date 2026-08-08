export type Frequency =
	| 'daily'
	| 'weekly'
	| 'monthly'
	| 'quarterly'
	| 'biannual'
	| 'annual'
	| 'one_off';

export const FREQUENCIES: Record<
	Frequency,
	{ label: string; intervalDays: number | null; sortRank: number; colorToken: string }
> = {
	daily: { label: 'Daily', intervalDays: 1, sortRank: 1, colorToken: '--frequency-daily' },
	weekly: { label: 'Weekly', intervalDays: 7, sortRank: 2, colorToken: '--frequency-weekly' },
	monthly: { label: 'Monthly', intervalDays: 30, sortRank: 3, colorToken: '--frequency-monthly' },
	quarterly: {
		label: 'Quarterly',
		intervalDays: 91,
		sortRank: 4,
		colorToken: '--frequency-quarterly'
	},
	biannual: { label: 'Bi-annual', intervalDays: 182, sortRank: 5, colorToken: '--frequency-biannual' },
	annual: { label: 'Annual', intervalDays: 365, sortRank: 6, colorToken: '--frequency-annual' },
	one_off: { label: 'One-off', intervalDays: null, sortRank: 7, colorToken: '--frequency-one-off' }
};
