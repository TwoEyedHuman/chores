import { writable } from 'svelte/store';

export type ToastData = {
	message: string;
	actionLabel: string;
	/** Chore id the undo action operates on. */
	action: string;
	timeoutMs: number;
};

function createToastStore() {
	const { subscribe, set } = writable<ToastData | null>(null);

	return {
		subscribe,
		show(toast: ToastData) {
			set(toast);
		},
		dismiss() {
			set(null);
		}
	};
}

/** Holds at most one toast — a second delete replaces it rather than stacking. */
export const toast = createToastStore();
