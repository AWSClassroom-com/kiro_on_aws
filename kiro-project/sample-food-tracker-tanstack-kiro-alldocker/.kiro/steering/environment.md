# Execution Environment

## Docker Container Setup

This application runs inside Docker containers managed by Docker Compose. There are two services:

- `app` — the Node.js/TanStack Start application (port 3000)
- `postgres` — PostgreSQL 17 database (port 5432)

## Command Execution Rule

**All commands that need to run inside the application environment MUST be prefixed with `docker compose exec app`.**

Examples:

```bash
# Installing dependencies
docker compose exec app pnpm install

# Running tests
docker compose exec app pnpm test

# Linting / formatting
docker compose exec app pnpm check

# Database operations
docker compose exec app pnpm db:generate
docker compose exec app pnpm db:migrate
docker compose exec app pnpm db:push

# Checking node_modules
docker compose exec app ls node_modules/<package-name>
```

Do NOT run `pnpm`, `node`, `tsx`, or any app-level CLI commands directly on the host machine — they must go through `docker compose exec app`.

## Checking Container Status

Before running any `docker compose exec` command, you can verify containers are up with:

```bash
docker compose ps
```
