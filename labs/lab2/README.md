# Lab 2: Build a Weekly Nutrition Summary with Specs and Bedrock

Build an AI-powered nutrition summary feature using Kiro's spec-driven workflow: generate requirements, design, and tasks from a natural language description, then implement the feature with Amazon Bedrock.

**Time:** 60 minutes
**Course repo:** https://github.com/AWSClassroom-com/kiro_on_aws

## Working with Kiro

- Open chat: `Cmd+L` (macOS) / `Ctrl+L` (Windows/Linux). Open command palette: `Cmd+Shift+P` / `Ctrl+Shift+P`.
- Prefer chat and command palette over clicking buttons — button labels change between versions.
- Agent output varies between runs. Expected results describe outcomes, not exact text. If something looks wrong, tell Kiro in chat.
- Always read diffs before accepting.

---

## Prerequisites

### 1. Lab 1 complete
Kiro installed and signed in. Food-tracker app running at `http://localhost:3000`.

### 2. AWS credentials in the container

```bash
docker compose exec app aws login --remote
```

Complete the SSO flow in your browser. Credentials land in `~/.aws` inside the container; the SDK picks them up automatically.

### 3. Verify access

```bash
docker compose exec app aws sts get-caller-identity --no-cli-pager
docker compose exec app aws bedrock list-foundation-models \
  --query "modelSummaries[?contains(modelId, 'claude')]" \
  --output table --no-cli-pager
```

---

## Part A: Generate Requirements

### Step 1: Create a new spec

`Cmd+Shift+P` / `Ctrl+Shift+P` → `Kiro: New Spec` → choose **Feature** → **Requirements-First**.

### Step 2: Describe the feature

Paste as your initial prompt:

```
Build an AI-powered weekly nutrition summary feature for the food-tracker page.

Requirements:
- On the food tracker page, add a "Generate Weekly Summary" button.
- When clicked, the app fetches all food entries from the last 7 days from PostgreSQL.
- The entries are sent to Amazon Bedrock (Claude Sonnet 4.5) which returns:
  - totalCalories (sum across all entries)
  - averageDailyCalories (totalCalories divided by 7)
  - macroBreakdown: proteinPercent, carbsPercent, fatPercent (must sum to 100)
  - narrative: a 2-3 sentence summary of the user's eating patterns
  - suggestions: 2-3 actionable suggestions for next week
- Show a loading state while Bedrock is generating the summary (typically 2-4 seconds).
- Display the result in a card below the button.
- Handle the edge case where the user has fewer than 3 entries in the last 7 days: show a friendly message instead of calling Bedrock.
- The Bedrock model ID is anthropic.claude-sonnet-4-5-20250929-v1:0.
- The Bedrock API uses anthropic_version "bedrock-2023-05-31".
- The result must NOT be persisted to PostgreSQL; it is a transient view-only summary.
```

Answer Kiro's follow-up questions as they come.

### Step 3: Review and approve requirements

Open `requirements.md`. Confirm it covers user stories, acceptance criteria for the happy path and the `<3 entries` edge case, and a note that results aren't persisted.

Edit `requirements.md` directly or ask in chat to adjust (e.g., "Add an acceptance criterion that the loading state appears within 200ms of the click"). Approve through the spec workflow when satisfied.

---

## Part B: Generate Design

### Step 4: Generate the design

In chat:

```
The requirements for the weekly-nutrition-summary spec are approved. Please generate design.md now. The design must cover:

1. Architecture flow — from the button click in src/routes/food-tracker.tsx through every module the request passes through, ending at the rendered summary card.
2. TypeScript interfaces — a shape for the summary returned to the UI (totals, macro breakdown, narrative, suggestions) and a response shape that signals success, error, or insufficient-data outcomes.
3. Server function — name it, specify it lives in src/routes/food-tracker.tsx alongside the existing CRUD server functions, and follow the same pattern they use.
4. Error handling — explicitly map each of these failure modes to a response: (a) Bedrock call failure, (b) fewer than 3 entries (do not call Bedrock; return an insufficient-data indicator), (c) malformed JSON from Bedrock.

Hard constraint on credentials: AWS credentials are already configured at ~/.aws inside the container. Design the Bedrock client to use the AWS SDK's default credential chain. Do NOT design anything that reads AWS_ACCESS_KEY_ID, AWS_SECRET_ACCESS_KEY, AWS_PROFILE, or any AWS credential environment variables.
```

### Step 5: Review and approve

Open `design.md` and confirm all four sections are present. A reasonable summary shape looks something like:

```typescript
interface NutritionSummary {
  totalCalories: number;
  averageDailyCalories: number;
  macroBreakdown: { proteinPercent: number; carbsPercent: number; fatPercent: number };
  narrative: string;
  suggestions: string[];
  entryCount: number;
  generatedAt: string;
}
```

Field names will vary — that's fine. Approve the design when satisfied.

---

## Part C: Generate Tasks

### Step 6: Generate tasks

In chat:

```
The design for the weekly-nutrition-summary spec is approved. Please generate tasks.md now, with the following structure:
- Tasks must be ordered by dependency — later tasks may rely on earlier ones being complete.
- Each task must be small enough to review in a single diff (one file, or a tightly related set of changes).
- Each task must explicitly list the files it creates or modifies, and reference the design section it implements.
- The first applicable task should install any new dependencies (such as the AWS SDK packages) — do not assume they are already installed.
```

### Step 7: Trim the task list

Send this prompt, then verify Kiro's recap before approving. If the recap is wrong, push back until it matches.

```
This is a time-boxed lab. Please simplify the task list, requirements, and design to the smallest scope that delivers the feature.

DESIRED FINAL STATE — the implementation should produce ONLY these files (and no others):
1. src/lib/bedrock.ts — a thin Bedrock client with basic retry. Parses JSON inline.
2. src/lib/nutrition-summary.ts — builds the prompt, calls the Bedrock client, returns the parsed summary.
3. Edits to src/routes/food-tracker.tsx — adds one new server function and the UI changes (button, loading state, result card).

REMOVALS — for each item below, remove it if it is currently in the plan; if it is not present, just skip it (no need to flag):
- Separate Zod or other schema files (validation should happen inline in the Bedrock client or summarization module)
- Caching, persistence, or rate-limiting of Bedrock results
- Macro normalization or any post-processing of the model's output (accept it as-is)
- Separate test files or new documentation files
- Environment variable setup, .env files, or config-loading modules

HARD CONSTRAINT — credentials:
AWS credentials are already configured at ~/.aws inside the container. The Bedrock client must use the AWS SDK's default credential chain. Do NOT add or keep any tasks that read AWS_ACCESS_KEY_ID, AWS_SECRET_ACCESS_KEY, AWS_PROFILE, AWS_REGION, or any AWS credential environment variables.

ADD A VERIFICATION TASK — append a final task to the task list with these exact steps:
1. Create scripts/test-bedrock.ts that:
   - Imports the Bedrock client from src/lib/bedrock.ts
   - Calls it with the prompt: "Say hello in one short sentence."
   - Prints the raw response to stdout
   - On any error, prints the full error including stack trace and exits with a non-zero status
2. Run the script inside the container: docker compose exec app npx tsx scripts/test-bedrock.ts
3. If the run fails, do NOT modify the script to swallow, suppress, or reformat the error. Stop, surface the full output, and diagnose the underlying issue (typical causes: credentials, region, model ID, or inference profile ID).
4. If and only if the run succeeds, delete scripts/test-bedrock.ts. The task is complete.

ALSO UPDATE — requirements.md and design.md should be updated to match the simplified scope.

WHEN DONE — please reply in chat with a short recap covering:
(a) Which tasks you removed (by title), if any
(b) The final ordered list of tasks that remain
(c) Which sections of requirements.md and design.md you updated
Do not start implementing yet — wait for me to review the recap.
```

---

## Part D: Implement the Feature

Kiro installs dependencies as part of its tasks — don't run `npm install` yourself.

### Step 8: Implement tasks one at a time

For the **first** task, send:

```
Show me the unchecked tasks remaining in the weekly-nutrition-summary spec, then prepare to implement the next one in order.

Before making any code changes, reply in chat with:
- The task number and title you are starting
- The files you will create or modify
- Any shell commands you need to run (such as npm install)

Implement only that one task. Do not bundle multiple tasks together. Do not add files or features the task does not explicitly require. Wait for my approval of the diff before moving on.
```

For each subsequent task, send: `Implement the next unchecked task using the same protocol.`

For each task:

1. Verify the recap matches the task in `tasks.md`.
2. Approve any commands Kiro wants to run.
3. Review and accept the diff (or reject and push back).
4. Confirm the task is marked complete, then move on.

The **final** task is the Bedrock smoke test added in Step 7. On success it deletes `scripts/test-bedrock.ts` automatically. On failure, paste the error into chat — most failures are credentials, region, model ID, or inference profile.

### Step 9: End-to-end test

1. Restart the dev server if needed.
2. Open `http://localhost:3000/food-tracker`.
3. Click **Generate Weekly Summary** and confirm a card renders with totals, macros, narrative, and suggestions.
4. (Optional) With fewer than 3 recent entries, confirm a friendly "not enough data" message appears instead of an error.

Paste any error into Kiro's chat to diagnose.

---

## Validation Checklist

- [ ] Approved `requirements.md`
- [ ] Approved `design.md`
- [ ] All `tasks.md` tasks complete
- [ ] "Generate Weekly Summary" button visible on the food-tracker page
- [ ] Loading state appears, then card renders
- [ ] Card shows total calories, average daily calories, and macros summing to 100%
- [ ] Card shows a 2–3 sentence narrative and 2–3 suggestions
- [ ] Fewer than 3 recent entries shows friendly message instead of calling Bedrock

---

## Summary

You used Kiro's spec workflow to generate requirements, design, and tasks, then implemented an AI-powered weekly nutrition summary backed by Amazon Bedrock. The spec-driven approach gives you traceable documentation alongside working code — `requirements.md`, `design.md`, and `tasks.md` capture *what*, *why*, and *how* the feature was built.
