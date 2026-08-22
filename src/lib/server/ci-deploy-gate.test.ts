import { expect, test } from 'vitest';

// Deliberately failing — proves the Deploy workflow's test step blocks
// flyctl deploy from ever running. Removed in the very next commit.
test('deploy gate smoke test (expected to fail)', () => {
	expect(1).toBe(2);
});
