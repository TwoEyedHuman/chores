<script lang="ts">
	import type { PageProps } from './$types';

	let { data }: PageProps = $props();
</script>

<h1 class="p-4 text-xl">Welcome, {data.user?.displayName}</h1>
