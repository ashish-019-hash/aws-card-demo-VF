.PHONY: up down reset migrate import-ebcdic import-ascii test verify

up:
	docker compose up --build -d

down:
	docker compose down

reset:
	docker compose down -v --remove-orphans

migrate:
	docker compose run --rm migrate

import-ebcdic:
	npm run legacy-import -- --mode=canonical-ebcdic --source-path=00.phase-1-input/data

import-ascii:
	npm run legacy-import -- --mode=ascii-mirror --source-path=00.phase-1-input/data

test:
	npm test

verify:
	npm run format:check
	npm run lint
	npm run typecheck
	npm test
	npm run build
	docker compose config >/dev/null
	docker build -t aws-card-demo:local .
