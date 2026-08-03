# Food Tracker

A food tracking app: log what's in your kitchen with nutrition facts and expiration dates, and see it all at a glance. Built as an **AWS Amplify Gen 2** app — a React frontend talking to an AppSync GraphQL API backed by DynamoDB.

## Tech Stack

| Layer | Technology |
| --- | --- |
| Frontend | [React 19](https://react.dev) + [Vite](https://vite.dev) |
| Routing | [TanStack Router](https://tanstack.com/router) (file-based routes in `src/routes/`) |
| Styling | [Tailwind CSS v4](https://tailwindcss.com) |
| Backend | [AWS Amplify Gen 2](https://docs.amplify.aws/react/) — AppSync GraphQL API + DynamoDB + Cognito |
| Lint/Format | [Biome](https://biomejs.dev) |

## Project Structure

```
amplify/
  backend.ts          # Backend definition — registers auth + data resources
  auth/resource.ts    # Cognito auth (email sign-in)
  data/resource.ts    # FoodItem model + AppSync API (public API key auth)
src/
  main.tsx            # App entry — configures Amplify, mounts the router
  routes/
    __root.tsx        # Root layout (nav bar + outlet)
    index.tsx         # Homepage
    food-tracker.tsx  # Food tracker page (add/list/delete food items)
  components/
    NavBar.tsx        # Top navigation
scripts/
  seed.ts             # Seeds 30 sample FoodItems (idempotent)
```

## Getting Started

Prerequisites: Node.js 20+, an AWS account, and authenticated AWS CLI credentials.

**Terminal 1 — install dependencies and start the Amplify sandbox:**

```bash
npm install
npm run amplify:sandbox
```

This provisions a personal cloud backend (AppSync + DynamoDB + Cognito) and writes `amplify_outputs.json` to the project root. The first deploy takes several minutes. Leave it running — it watches `amplify/` and redeploys on change.

**Terminal 2 — seed sample data and start the dev server:**

```bash
npm run seed && npm run dev
```

Open http://localhost:3000. The seed script loads 30 sample food items (with realistic added/expiration dates relative to today) and skips itself if data already exists.

## npm Scripts

| Script | What it does |
| --- | --- |
| `npm run dev` | Start the Vite dev server on port 3000 |
| `npm run build` | Type-check and build the frontend for production |
| `npm run seed` | Seed the FoodItem table with 30 sample items (skips if data exists) |
| `npm run amplify:sandbox` | Start the per-developer Amplify cloud sandbox (watch mode) |
| `npm run amplify:sandbox:delete` | Tear down the sandbox's cloud resources |
| `npm run lint` | Check code with Biome |
| `npm run format` | Format code with Biome |

## Data Model

`FoodItem` (see `amplify/data/resource.ts`):

| Field | Type | Notes |
| --- | --- | --- |
| `name` | string | required |
| `category` | string | e.g. Produce, Protein, Dairy, Grains, Pantry, Snacks |
| `quantity` | float | |
| `unit` | string | e.g. lbs, oz, count |
| `calories` | integer | |
| `protein` / `carbs` / `fat` | float | grams |
| `expirationDate` | datetime | nullable — shelf-stable items have none |
| `addedAt` | datetime | when the item was logged |

The API is authorized with a public API key (30-day expiry) — appropriate for a class/demo project, not production.

## Cleanup

```bash
npm run amplify:sandbox:delete
```

Removes the AppSync API, DynamoDB table, Cognito resources, and IAM roles the sandbox provisioned.
