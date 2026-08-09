.PHONY: dev build down logs sh migrate seed-rooms seed-users

dev:
	npm run dev

build:
	docker compose build

down:
	docker compose down

logs:
	docker compose logs -f

sh:
	docker compose exec app sh

migrate:
	DATABASE_PATH=./data/chores.db npx drizzle-kit migrate

seed-rooms:
	DATABASE_PATH=./data/chores.db npx tsx scripts/seed-rooms.ts

seed-users:
	DATABASE_PATH=./data/chores.db npx tsx scripts/seed-users.ts "$(USERNAME)" "$(DISPLAY_NAME)"
