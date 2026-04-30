import { spawn } from "node:child_process";
import { existsSync, statSync } from "node:fs";
import { setTimeout as sleep } from "node:timers/promises";

const OUTPUTS = "amplify_outputs.json";
const POLL_MS = 1000;
const SCHEMA_PROPAGATION_BUFFER_MS = 5000;

const initialMtime = existsSync(OUTPUTS) ? statSync(OUTPUTS).mtimeMs : 0;

const sandbox = spawn("npx", ["ampx", "sandbox"], {
	stdio: "inherit",
	shell: process.platform === "win32",
});

let seeded = false;

async function watchForFirstDeploy() {
	while (!seeded && sandbox.exitCode === null) {
		await sleep(POLL_MS);
		if (!existsSync(OUTPUTS)) continue;
		const mtime = statSync(OUTPUTS).mtimeMs;
		if (mtime <= initialMtime) continue;

		seeded = true;
		console.log(
			`\n[seed] Sandbox deployed. Waiting ${SCHEMA_PROPAGATION_BUFFER_MS / 1000}s for AppSync schema propagation, then seeding...\n`,
		);
		await sleep(SCHEMA_PROPAGATION_BUFFER_MS);

		const seed = spawn("npx", ["tsx", "scripts/seed.ts"], {
			stdio: "inherit",
			shell: process.platform === "win32",
		});
		seed.on("exit", (code) => {
			if (code !== 0) {
				console.error(`\n[seed] Seed exited with code ${code}\n`);
			} else {
				console.log("\n[seed] Seed complete. Sandbox watcher still running — Ctrl+C to stop.\n");
			}
		});
	}
}

watchForFirstDeploy();

const forward = (signal: NodeJS.Signals) => () => sandbox.kill(signal);
process.on("SIGINT", forward("SIGINT"));
process.on("SIGTERM", forward("SIGTERM"));

sandbox.on("exit", (code) => {
	process.exit(code ?? 0);
});
