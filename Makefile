.PHONY: up down reset migrate seed seed-dev seed-canonical import-ebcdic import-ascii test verify

up:
	docker compose up --build -d

down:
	docker compose down

reset:
	docker compose down -v --remove-orphans

migrate:
	docker compose run --rm migrate

# Development-only Docker seed; it requires APP_NODE_ENV=development and SEED_ALLOW_UNSAFE=true in .env.
seed: seed-dev

seed-dev:
	docker compose --profile tools run --rm seed-dev

# Runs on the host because the immutable legacy inputs are intentionally excluded from the image.
seed-canonical: import-ebcdic

import-ebcdic:
	npm run seed:canonical

import-ascii:
	npm run legacy-import -- --mode=ascii-mirror --source-path=00.phase-1-input/data

test:
	npm test

# Requires .env with POSTGRES_PASSWORD, CURSOR_SECRET, and JWT_SECRET; see README.
verify:
	npm run format:check
	npm run lint
	npm run typecheck
	npm test
	npm run build
	docker compose config >/dev/null
	docker build -t aws-card-demo:local .
