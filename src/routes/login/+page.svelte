<script lang="ts">
	import type { PageProps } from './$types';

	let { form }: PageProps = $props();
</script>

<div class="flex min-h-screen items-center justify-center p-4">
	<form method="POST" class="w-full max-w-sm space-y-4 rounded-lg border p-6">
		<h1 class="text-xl font-semibold">Log in</h1>

		{#if form?.error}
			<p class="text-sm text-red-600">{form.error}</p>
		{/if}

		<div>
			<label for="username" class="block text-sm font-medium">Username</label>
			<input
				id="username"
				name="username"
				type="text"
				autocomplete="username"
				required
				class="mt-1 w-full rounded border p-2"
			/>
		</div>

		<div>
			<label for="password" class="block text-sm font-medium">Password</label>
			<input
				id="password"
				name="password"
				type="password"
				autocomplete="current-password"
				required
				class="mt-1 w-full rounded border p-2"
			/>
		</div>

		<button type="submit" class="w-full rounded bg-blue-600 p-2 text-white">Log in</button>
	</form>
</div>
