.PHONY: dev build down logs sh

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
