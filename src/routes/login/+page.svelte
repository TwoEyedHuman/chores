<script lang="ts">
	import type { PageProps } from './$types';

	let { form }: PageProps = $props();
</script>

<div class="flex min-h-screen items-center justify-center p-4">
	<form
		method="POST"
		class="w-full max-w-sm space-y-4 rounded-xl border border-gray-200 bg-white p-6 shadow-sm"
	>
		<h1 class="text-xl font-semibold">Log in</h1>

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
