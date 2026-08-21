<script lang="ts">
	import favicon from '$lib/assets/favicon.svg';
	import type { PageProps } from './$types';

	let { form }: PageProps = $props();
</script>

<div class="flex min-h-screen flex-col items-center justify-center gap-6 p-4">
	<div class="flex flex-col items-center gap-2 text-center">
		<img src={favicon} alt="" class="h-14 w-14 rounded-2xl shadow-sm" />
		<h1 class="text-lg font-semibold text-stone-800">Chores</h1>
		<p class="text-sm text-stone-500">Keep the house sparkling.</p>
	</div>

	<form
		method="POST"
		class="w-full max-w-sm space-y-4 rounded-xl border border-stone-200 bg-white p-6 shadow-sm"
	>

		{#if form?.error}
			<p class="rounded-lg bg-red-50 p-2 text-sm text-red-600">{form.error}</p>
		{/if}

		<div>
			<label for="username" class="field-label">Username</label>
			<input
				id="username"
				name="username"
				type="text"
				autocomplete="username"
				required
				class="field"
			/>
		</div>

		<div>
			<label for="password" class="field-label">Password</label>
			<input
				id="password"
				name="password"
				type="password"
				autocomplete="current-password"
				required
				class="field"
			/>
		</div>

		<button type="submit" class="btn-primary w-full">Log in</button>
	</form>
</div>
