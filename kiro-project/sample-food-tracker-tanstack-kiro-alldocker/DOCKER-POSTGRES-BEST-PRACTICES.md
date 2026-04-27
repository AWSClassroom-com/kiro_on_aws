# Simple Docker PostgreSQL Setup for Drizzle ORM + TanStack Start

A streamlined guide for setting up PostgreSQL with Docker specifically for Drizzle ORM and TanStack Start applications. This focuses on simplicity and letting Drizzle handle schema management.

## Quick Start

The simplest setup for development with Drizzle ORM:

### 1. Docker Compose (Recommended)

```yaml
# docker-compose.yml
version: "3.8"

services:
  postgres:
    image: postgres:17-alpine
    container_name: health_app_postgres
    restart: unless-stopped

    environment:
      POSTGRES_DB: ${POSTGRES_DB:-health_app}
      POSTGRES_USER: ${POSTGRES_USER:-postgres}
      POSTGRES_PASSWORD: ${POSTGRES_PASSWORD:-}

    ports:
      - "${POSTGRES_PORT:-5432}:5432"

    volumes:
      - postgres_data:/var/lib/postgresql/data

    healthcheck:
      test:
        [
          "CMD-SHELL",
          "pg_isready -U ${POSTGRES_USER:-postgres} -d ${POSTGRES_DB:-health_app}",
        ]
      interval: 30s
      timeout: 10s
      retries: 3
      start_period: 40s

volumes:
  postgres_data:
```

### 2. Environment Configuration

```bash
# .env.local
POSTGRES_DB=health_app
POSTGRES_USER=postgres
POSTGRES_PASSWORD=
POSTGRES_PORT=5432

# Database URL for Drizzle ORM
DATABASE_URL=postgresql://postgres:@localhost:5432/health_app
```

### 3. Start the Database

```bash
# Start PostgreSQL
docker-compose up -d

# Check status
docker-compose ps

# View logs
docker-compose logs postgres
```

## Why This Simple Setup Works with Drizzle

**No initialization scripts needed** - Drizzle handles all schema creation and migrations through:

- `pnpm db:generate` - Generate migrations from schema changes
- `pnpm db:migrate` - Apply migrations to database
- `pnpm db:push` - Push schema directly (development only)

**No custom configuration files** - PostgreSQL defaults work great for development and Drizzle doesn't require special settings.

**No user management scripts** - Use the default postgres user for development. Drizzle connects with full privileges to manage schema.

## Optional: Custom Dockerfile

If you need a custom image (usually not necessary):

```dockerfile
# Dockerfile.postgres
FROM postgres:17-alpine

# Simple health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=40s --retries=3 \
    CMD pg_isready -U $POSTGRES_USER -d $POSTGRES_DB || exit 1

EXPOSE 5432
```

## Development Workflow

### Database Management

```bash
# Start database
docker-compose up -d postgres

# Generate Drizzle migrations
pnpm db:generate

# Apply migrations
pnpm db:migrate

# Open Drizzle Studio (optional)
pnpm db:studio

# Reset database (if needed)
docker-compose down
docker volume rm $(docker volume ls -q | grep postgres)
docker-compose up -d postgres
pnpm db:migrate
```

### Package.json Scripts

```json
{
  "scripts": {
    "db:start": "docker-compose up -d postgres",
    "db:stop": "docker-compose stop postgres",
    "db:logs": "docker-compose logs -f postgres",
    "db:shell": "docker-compose exec postgres psql -U postgres -d health_app",
    "db:reset": "docker-compose down && docker volume prune -f && docker-compose up -d postgres"
  }
}
```

## Testing Setup

For automated testing, use a separate test database:

```yaml
# docker-compose.test.yml
services:
  postgres_test:
    image: postgres:17-alpine
    environment:
      POSTGRES_DB: health_app_test
      POSTGRES_USER: postgres
      POSTGRES_PASSWORD:
    ports:
      - "5433:5432"
    tmpfs:
      - /var/lib/postgresql/data # Faster tests with in-memory storage
```

```bash
# .env.test
DATABASE_URL=postgresql://postgres:@localhost:5433/health_app_test
```

## Production Considerations

For production, add these minimal security improvements:

```yaml
# docker-compose.prod.yml
services:
  postgres:
    image: postgres:17-alpine
    restart: always

    environment:
      POSTGRES_DB: ${POSTGRES_DB}
      POSTGRES_USER: ${POSTGRES_USER}
      POSTGRES_PASSWORD: ${POSTGRES_PASSWORD}

    # Don't expose ports in production
    # ports: []

    volumes:
      - postgres_data:/var/lib/postgresql/data

    # Resource limits
    deploy:
      resources:
        limits:
          memory: 1G
          cpus: "0.5"

volumes:
  postgres_data:
    external: true # Use external volume in production
```

## Backup Strategy

Simple backup for production:

```bash
#!/bin/bash
# backup.sh
BACKUP_FILE="backup_$(date +%Y%m%d_%H%M%S).sql"

docker-compose exec postgres pg_dump \
  -U postgres \
  -d health_app \
  --clean \
  --if-exists > $BACKUP_FILE

gzip $BACKUP_FILE
echo "Backup created: $BACKUP_FILE.gz"
```

## Troubleshooting

### Common Issues

**Connection refused:**

```bash
# Check if container is running
docker-compose ps postgres

# Check logs
docker-compose logs postgres

# Test connection
docker-compose exec postgres pg_isready -U postgres -d health_app
```

**Permission denied:**

```bash
# Reset volumes if needed
docker-compose down
docker volume rm $(docker volume ls -q | grep postgres)
docker-compose up -d postgres
```

**Drizzle connection issues:**

```bash
# Verify DATABASE_URL format
echo $DATABASE_URL

# Test connection manually
docker-compose exec postgres psql $DATABASE_URL -c "SELECT 1;"
```

## Key Benefits of This Simple Approach

1. **Drizzle handles schema** - No need for init scripts or manual table creation
2. **Minimal configuration** - PostgreSQL defaults work great
3. **Easy development** - One command to start, Drizzle manages the rest
4. **Version controlled schema** - All changes tracked in Drizzle migrations
5. **Type safety** - Drizzle generates TypeScript types from your schema
6. **Fast iteration** - `db:push` for quick schema changes in development

This setup gets you productive immediately while following best practices for Drizzle ORM integration.
