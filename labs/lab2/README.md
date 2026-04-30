# Lab 2: Build a Weekly Nutrition Summary with Specs and Bedrock

Build an AI-powered nutrition summary feature using Kiro's spec-driven workflow: generate requirements, design, and tasks from a natural language description, then implement the feature with Amazon Bedrock running inside an Amplify Function.

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
Kiro installed and signed in with Builder ID. AWS CLI authenticated via `aws login` (Lab 1 Part B). Food-tracker app running at `http://localhost:3000` with the Amplify sandbox up (`npm run amplify:sandbox` in one terminal, `npm run dev` in another).

### 2. AWS CLI session still valid
The `aws login` session from Lab 1 lasts 12 hours. If you've come back later or aren't sure, in Kiro, open a new integrated terminal tab: Ctrl+Shift+` (backtick). And run the below command:

```bash
aws sts get-caller-identity --no-cli-pager
```

If this fails with an expired-token error, re-authenticate:

```bash
aws login --region <your-region>
```

### 3. Verify Bedrock access

```bash
aws bedrock list-foundation-models \
  --query "modelSummaries[?contains(modelId, 'claude')]" \
  --output table --no-cli-pager
```

You should see a list of Anthropic Claude models. If the command returns an empty list or an `AccessDeniedException`, your IAM user is missing Bedrock permissions, or Claude model access hasn't been enabled in this account/region — your instructor will help. The model used in this lab is `anthropic.claude-sonnet-4-5-20250929-v1:0`; confirm it appears in the output (or that your instructor has given you a substitute model ID for your region).

---

## Part A: Generate Requirements

### Step 1: Create a new spec

`Cmd+Shift+P` / `Ctrl+Shift+P` → `Kiro: create a new spec`.

### Step 2: Describe the feature

Paste as your initial prompt:

```
Create a new spec for a new feature that is an AI-powered weekly nutrition summary feature for the food-tracker page.

Requirements:
- On the food tracker page, add a "Generate Weekly Summary" button.
- When clicked, the app filters the food entries from the last 7 days. Entries are already loaded on the page via the AppSync data client (client.models.FoodItem.list()) — no extra fetch is required.
- The filtered entries are sent to Amazon Bedrock (Claude Sonnet 4.5) which returns:
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
- The result must NOT be persisted (no DynamoDB writes); it is a transient view-only summary.
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

1. Architecture flow — from the button click in src/routes/food-tracker.tsx through every layer the request passes through, ending at the rendered summary card. The flow must be: browser → custom AppSync query → Amplify Function (Lambda) → Bedrock InvokeModel → back through the same path.
2. TypeScript interfaces — a shape for the summary returned to the UI (totals, macro breakdown, narrative, suggestions) and a response shape that signals success, error, or insufficient-data outcomes.
3. Backend integration — define an Amplify Function in amplify/functions/nutrition-summary/ (resource.ts and handler.ts), expose it via a custom query in amplify/data/resource.ts using a.handler.function(), authorize the query with allow.publicApiKey() to match the existing schema, and grant the function's execution role bedrock:InvokeModel permission in amplify/backend.ts.
4. Error handling — explicitly map each of these failure modes to a response: (a) Bedrock call failure, (b) fewer than 3 entries (do not call Bedrock; the client returns an insufficient-data indicator before invoking the query), (c) malformed JSON from Bedrock.

Hard constraint on credentials: At runtime, the Amplify Function uses its Lambda execution role for AWS calls — the AWS SDK's default credential chain resolves to that role automatically. Do NOT design anything that reads AWS_ACCESS_KEY_ID, AWS_SECRET_ACCESS_KEY, AWS_PROFILE, AWS_REGION, or any AWS credential environment variables.
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

This prompt pins down the file list, the credentials rule, and a Bedrock smoke-test task upfront, so Kiro's first pass at `tasks.md` lands in scope. When Kiro replies with its recap, **read it and push back if anything's off** ("task 3 touches a file not in the allowed list", "fold the validation into the handler instead of a separate module"). Don't skip the recap.

Send in chat:

```
The design for the weekly-nutrition-summary spec is approved. Please generate tasks.md now. This is a time-boxed lab — keep the plan to the smallest scope that delivers the feature.

Rules:
- Tasks ordered by dependency. Each task is one diff (one file or a tightly related set).
- Each task lists the files it touches and the design section it implements.
- First task installs any new dependencies (e.g. @aws-sdk/client-bedrock-runtime).

The implementation may create or edit ONLY these files:
1. amplify/functions/nutrition-summary/resource.ts
2. amplify/functions/nutrition-summary/handler.ts
3. amplify/data/resource.ts (edit)
4. amplify/backend.ts (edit)
5. src/routes/food-tracker.tsx (edit)

Behavioral constraints:
- Validation, if any, happens inline in the handler — no separate schema modules.
- Accept Bedrock's output as-is — no macro normalization or post-processing.
- The <3-entries check happens client-side before calling the query.

Credentials hard rule:
The Lambda uses its execution role via the SDK's default credential chain. Do NOT add any task that reads AWS_ACCESS_KEY_ID, AWS_SECRET_ACCESS_KEY, AWS_PROFILE, AWS_REGION, or any AWS credential env vars.

Final task — Bedrock smoke test:
1. Create scripts/test-bedrock.ts that uses @aws-sdk/client-bedrock-runtime to call Claude Sonnet 4.5 (anthropic.claude-sonnet-4-5-20250929-v1:0) with "Say hello in one short sentence.", prints the raw response, and on any error prints the full stack and exits non-zero.
2. Run from the host (no container in this project): npx tsx scripts/test-bedrock.ts
3. On failure, do not suppress or reformat the error — stop and diagnose. Common causes: credentials, region, model ID, model access not enabled, inference profile required.
4. On success, delete scripts/test-bedrock.ts.

When done, reply with the ordered task list (title + files touched per task). Do not start implementing — wait for my approval.
```

---

## Part D: Implement the Feature

Kiro installs dependencies as part of its tasks — don't run `npm install` yourself.

### Step 7: Implement tasks one at a time

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
4. Watch the Amplify sandbox terminal — when `amplify/` files change, the sandbox redeploys automatically. Wait for "Deployment completed" before proceeding to the next task.
5. Confirm the task is marked complete, then move on.

The **final** task is the Bedrock smoke test added in Step 6. On success it deletes `scripts/test-bedrock.ts` automatically. On failure, paste the error into chat — most failures are credentials, region, model access not enabled, model ID, or an inference profile being required.

### Step 8: End-to-end test

1. Make sure both terminals are still running: `npm run amplify:sandbox` (terminal 1) and `npm run dev` (terminal 2). Watch the sandbox terminal for any deploy errors after the function was added.
2. Open `http://localhost:3000/food-tracker`.
3. Click **Generate Weekly Summary** and confirm a card renders with totals, macros, narrative, and suggestions.
4. (Optional) With fewer than 3 recent entries, confirm a friendly "not enough data" message appears instead of triggering the Lambda.

If you get an error after clicking the button, the Amplify sandbox terminal usually has the Lambda logs streaming — check there first, then paste any error into Kiro's chat to diagnose.

---

## Validation Checklist

- [ ] Approved `requirements.md`
- [ ] Approved `design.md`
- [ ] All `tasks.md` tasks complete
- [ ] Amplify sandbox redeployed cleanly with the new function (no errors in terminal 1)
- [ ] "Generate Weekly Summary" button visible on the food-tracker page
- [ ] Loading state appears, then card renders
- [ ] Card shows total calories, average daily calories, and macros summing to 100%
- [ ] Card shows a 2–3 sentence narrative and 2–3 suggestions
- [ ] Fewer than 3 recent entries shows friendly message instead of calling the Lambda

---

## Summary

You used Kiro's spec workflow to generate requirements, design, and tasks, then implemented an AI-powered weekly nutrition summary backed by Amazon Bedrock running inside an Amplify Function. The spec-driven approach gives you traceable documentation alongside working code — `requirements.md`, `design.md`, and `tasks.md` capture *what*, *why*, and *how* the feature was built — and the Amplify Gen 2 backend pattern (function + custom AppSync query + IAM grant in `backend.ts`) is the same one you'd use for any AI feature in a real Amplify app.

