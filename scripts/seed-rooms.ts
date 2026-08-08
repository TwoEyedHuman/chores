import { randomUUID } from 'node:crypto';
import { eq } from 'drizzle-orm';
import { db } from '../src/lib/server/db';
import { rooms } from '../src/lib/server/db/schema';

const ROOM_NAMES = [
	'Kitchen',
	'Living Room',
	'Bedroom',
	'Bathroom',
	'Basement',
	'Garage',
	'Yard',
	'Whole House'
];

for (const [index, name] of ROOM_NAMES.entries()) {
	const existing = db.select().from(rooms).where(eq(rooms.name, name)).get();
	if (existing) {
		db.update(rooms).set({ sortOrder: index }).where(eq(rooms.id, existing.id)).run();
	} else {
		db.insert(rooms).values({ id: randomUUID(), name, sortOrder: index }).run();
	}
}

console.log(`Seeded ${ROOM_NAMES.length} rooms.`);
