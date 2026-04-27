---
inclusion: always
---

# TanStack Start + Drizzle + Docker Best Practices

## Documentation Resources

Always use Context7 to check documentation for Drizzle, TanStack Start, and Docker when needed. Reference the comprehensive best practice files:

- #[[file:DOCKER-POSTGRES-BEST-PRACTICES.md]]
- #[[file:TANSTACK-START-BEST-PRACTICES.md]]

## Server Functions

- **HTTP Methods**: Always use `POST` for mutations (create, update, delete). Use `GET` only for data fetching
- **Validation**: Use Zod schemas with `createServerFn().validator()` for type-safe input validation
- **Error Handling**: Wrap server function logic in try-catch blocks and throw meaningful errors

## Database Integration

- **Simplified Structure**: Keep database files in `drizzle/` directory with schema in `drizzle/schema/`
- **Connection**: Use single database connection in `drizzle/connection.ts`
- **Queries**: Centralize database queries in `drizzle/queries.ts`
- **Migrations**: Use `pnpm db:generate` and `pnpm db:migrate` for schema changes

## Environment Variables

- **Server-only**: No prefix (e.g., `DATABASE_URL`, `JWT_SECRET`)
- **Client-safe**: `VITE_` prefix (e.g., `VITE_APP_NAME`, `VITE_API_URL`)
- **Validation**: Always validate environment variables with Zod schemas

## Routing Conventions

- **File-based**: Use TanStack Router's file-based routing in `src/routes/`
- **Layouts**: Use `__root.tsx` for root layout with error boundaries
- **Nested Routes**: Use parent routes with `<Outlet />` for shared layouts
- **Loaders**: Use route loaders for server-side data fetching

## Docker & PostgreSQL

- **Simple Setup**: Use Docker Compose with PostgreSQL 17-alpine
- **No Init Scripts**: Let Drizzle handle all schema management
- **Health Checks**: Include health checks in Docker services
- **Development**: Use `docker-compose up -d postgres` for local development

## Code Quality

- **TypeScript**: Use strict type checking throughout
- **Zod Integration**: Generate Zod schemas from Drizzle schemas with `createInsertSchema`
- **Error Boundaries**: Implement at route and component levels
- **Performance**: Use proper database indexing and query optimization
