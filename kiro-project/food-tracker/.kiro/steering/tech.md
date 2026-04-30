# Technology Stack

## Framework & Runtime

- **TanStack Start** - Full-stack React framework with SSR, streaming, and server functions
- **React 19** - UI library with latest features
- **TypeScript** - Strict type checking enabled
- **Vite** - Build tool and development server

## Database & ORM

- **PostgreSQL** - Primary database
- **Drizzle ORM** - Type-safe database toolkit
- **Drizzle Kit** - Database migrations and schema management

## Styling & UI

- **Tailwind CSS v4** - Utility-first CSS framework
- **Lucide React** - Icon library

## Code Quality & Formatting

- **Biome** - Fast formatter and linter (replaces ESLint + Prettier)
- **Tab indentation** - Project standard
- **Double quotes** - JavaScript/TypeScript string preference

## Package Management

- **pnpm** - Fast, disk space efficient package manager

## Common Commands

### Development

```bash
pnpm dev          # Start development server on port 3000
pnpm build        # Build for production
pnpm serve        # Preview production build
```

### Code Quality

```bash
pnpm format       # Format code with Biome
pnpm lint         # Lint code with Biome
pnpm check        # Run both format and lint
```

### Database Operations

```bash
pnpm db:generate  # Generate migrations from schema changes
pnpm db:migrate   # Apply migrations to database
pnpm db:push      # Push schema directly to database (dev)
pnpm db:pull      # Pull schema from database
pnpm db:studio    # Open Drizzle Studio (database GUI)
```

### Testing

```bash
pnpm test         # Run tests with Vitest
```

## Environment Setup

- Requires `.env.local` file with `DATABASE_URL` for PostgreSQL connection
- Uses `dotenv` for environment variable loading
