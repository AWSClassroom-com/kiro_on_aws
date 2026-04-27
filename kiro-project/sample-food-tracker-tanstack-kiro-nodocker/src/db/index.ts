import path from "node:path";
import { PGlite } from "@electric-sql/pglite";
import { drizzle } from "drizzle-orm/pglite";
import { migrate } from "drizzle-orm/pglite/migrator";

import * as schema from "./schema.ts";
import { runSeedIfEmpty } from "./seed.ts";

const dataDir = path.resolve(process.cwd(), "local-db");
const migrationsFolder = path.resolve(process.cwd(), "drizzle");

const client = new PGlite(dataDir);
export const db = drizzle(client, { schema });

await migrate(db, { migrationsFolder });
await runSeedIfEmpty(db);
