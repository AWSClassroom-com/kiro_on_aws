# Lab 2: Build a Weekly Nutrition Summary with Specs and Bedrock

**Objective:** In Lab 1, you vibe-coded: quick prompts, quick diffs. In this lab, you move to spec-driven development. You describe a feature once, and Kiro turns it into formal `requirements.md`, `design.md`, and `tasks.md` documents that you review and approve before any code is written. Then you implement the feature task by task: an AI-powered weekly nutrition summary where an Amplify Function (Lambda) calls Amazon Bedrock, exposed to the frontend through a custom AppSync query. This function + custom query + IAM grant pattern is the same one you would use for any AI feature in a real Amplify app.

**Time:** 60 minutes<br>
**Course repo:** https://github.com/AWSClassroom-com/kiro_on_aws

---

## Prerequisites

### 1. Lab 1 complete

Kiro installed and signed in with Builder ID. Food-tracker app running with both terminals up: `npm run amplify:sandbox` (terminal 1) and `npm run dev` (terminal 2). App reachable at `http://localhost:3000`.

### 2. AWS CLI session still valid

The `aws login` session from Lab 1 lasts 12 hours. If you have come back later or are not sure, open a new terminal tab (CTRL+SHIFT+`) and run:

```bash
aws sts get-caller-identity --no-cli-pager
```

If this fails with an expired-token error, reauthenticate:

```bash
aws login --region <your-region>
```

### 3. Verify Bedrock model access

This lab uses Claude Sonnet 4.5 through the global cross-region inference profile `global.anthropic.claude-sonnet-4-5-20250929-v1:0`. That full string is the model ID you use everywhere in this lab. (An inference profile is how Bedrock routes requests for newer models; you invoke the profile ID instead of the bare model ID.)

Confirm the profile is available in your region:

```bash
aws bedrock list-inference-profiles \
  --query "inferenceProfileSummaries[?inferenceProfileId=='global.anthropic.claude-sonnet-4-5-20250929-v1:0'].[inferenceProfileId,status]" \
  --output table --no-cli-pager
```

You should see the profile with status `ACTIVE`. If the result is empty or you get `AccessDeniedException`, Claude access has not been enabled in this account/region; ask your instructor before continuing.

### 4. Smoke-test Bedrock connectivity

Listing models does not prove you can invoke one. Run this check now so any access problem surfaces before you build a feature on top of it.

The starter project ships a smoke-test script at `scripts/test-bedrock.ts`. It sends one short message to the class model and prints the reply; open the file if you want to see exactly what it does. Run it:

```bash
npx tsx scripts/test-bedrock.ts
```

> **Checkpoint. Validate before continuing:**
> The command must print a one-sentence greeting from Claude.
>
> If it fails, read the full error. Common causes:
> - Expired credentials: rerun `aws login --region <your-region>`.
> - Model access not enabled (`AccessDeniedException`): ask your instructor (Bedrock console > Model access).
> - `ValidationException` about the model identifier: the class model is not available in this account/region; ask your instructor.
>
> Fix the cause before moving on. Nothing later in this lab works until this does.

---

## Part A: Generate Requirements

### Step 1: Start a spec session

Open the chat panel: Cmd+L (macOS) / CTRL+L (Windows/Linux). In the bottom-left corner of the chat input box, click the agent selector and change it to **Spec**.

### Step 2: Describe the feature

Paste as your initial prompt:

```
Create a new spec "weekly-nutrition-summary" for a new feature that is an AI-powered weekly nutrition summary feature for the food-tracker page.

Requirements:
- On the food tracker page, add a "Generate Weekly Summary" button.
- When clicked, the app filters the food entries from the last 7 days. Entries are already loaded on the page via the AppSync data client (client.models.FoodItem.list()); no extra fetch is required.
- The filtered entries are sent to Amazon Bedrock (Claude Sonnet 4.5, model ID global.anthropic.claude-sonnet-4-5-20250929-v1:0; use EXACTLY this model ID everywhere, do not substitute a different regional prefix like us. or apac.) which returns:
  - totalCalories (sum across all entries)
  - averageDailyCalories (totalCalories divided by 7)
  - macroBreakdown: proteinPercent, carbsPercent, fatPercent (must sum to 100)
  - narrative: a 2-3 sentence summary of the user's eating patterns
  - suggestions: 2-3 actionable suggestions for next week
- Show a loading state while Bedrock is generating the summary (typically 2-4 seconds).
- Display the result in a card below the button.
- Handle the edge case where the user has fewer than 3 entries in the last 7 days: show a friendly message instead of calling Bedrock.
- The Bedrock API uses anthropic_version "bedrock-2023-05-31".
- The result must NOT be persisted (no DynamoDB writes); it is a transient view-only summary.
- Keep the requirements focused on user-facing behavior. Do NOT add IAM policy or permission-scoping requirements; permissions are decided in the design phase, and this lab deliberately grants bedrock:InvokeModel with resources ["*"] because cross-region inference profiles need broad permissions.
```

Kiro may ask follow-up questions before it generates anything. Typical questions and the answers to give:

- Is this spec for a new feature or a bug fix? A new feature.
- Start with requirements or technical design? Requirements.

### Step 3: Review and approve requirements

Open `requirements.md`. Confirm it covers:

- User stories and acceptance criteria for the happy path
- The fewer-than-3-entries edge case, including a criterion that Bedrock is NOT called in that case
- A note that results are not persisted

Then run these critical review checks. Each one has failed in real runs of this lab; use Find (Cmd+F / CTRL+F) in the file:

1. Search for `us.anthropic` and `apac.`. Both must return zero results. If found, the model ID drifted; tell Kiro to use exactly `global.anthropic.claude-sonnet-4-5-20250929-v1:0` everywhere.
2. Search for `IAM` and `policy`. The requirements must not contain IAM or permission-scoping criteria; those belong to the design phase. If found, tell Kiro to remove them.
3. Search for `global.anthropic`. It must appear, spelled exactly as in the Step 2 prompt.

Edit `requirements.md` directly or ask in chat to adjust (for example: "Add an acceptance criterion that the loading state appears within 200ms of the click"). Approve through the spec workflow when satisfied.

> Note: agent output varies between runs. Review what Kiro actually wrote, not what you expect it to have written.

---

## Part B: Generate Design

### Step 4: Generate the design

In chat:

```
The requirements for the weekly-nutrition-summary spec are approved. Please generate design.md now. The design must cover:

1. Architecture flow: From the button, click in src/routes/food-tracker.tsx through every layer the request passes through, ending at the rendered summary card. The flow must be: browser -> custom AppSync query -> Amplify Function (Lambda) -> Bedrock InvokeModel -> back through the same path.
2. TypeScript interfaces: A shape for the summary returned to the UI (totals, macro breakdown, narrative, suggestions) and a response shape that signals success, error, or insufficient-data outcomes.
3. Backend integration: Define an Amplify Function in amplify/functions/nutrition-summary/ (resource.ts and handler.ts) with timeoutSeconds: 30 (the defineFunction default of 3 seconds is too short for a Bedrock call), expose it via a custom query in amplify/data/resource.ts using a.handler.function(), authorize the query with allow.publicApiKey() to match the existing schema, and grant the function's execution role bedrock:InvokeModel permission in amplify/backend.ts (for simplicity in this lab, use resources: ["*"] in the policy statement). The handler MUST be typed as Schema["generateNutritionSummary"]["functionHandler"] (import type { Schema } from "../../data/resource") and read its inputs from event.arguments; AppSync delivers custom query arguments there, not at the top level of the event, and hand-rolled event interfaces hide that mistake from the type checker.
4. Error handling: Explicitly map each of these failure modes to a response: (a) Bedrock call failure (log the real error with console.error so it appears in the Lambda logs, then return an error response), (b) fewer than 3 entries (do not call Bedrock; the client returns an insufficient-data indicator before invoking the query), (c) malformed JSON from Bedrock. For (c): models often wrap JSON in markdown code fences, so the prompt to Bedrock must demand raw JSON with no fences AND the handler must parse the substring from the first "{" to the last "}" of the model's text rather than the raw response.

Hard constraint on credentials: At runtime, the Amplify Function uses its Lambda execution role for AWS calls; the AWS SDK's default credential chain resolves to that role automatically. Do NOT design anything that reads AWS_ACCESS_KEY_ID, AWS_SECRET_ACCESS_KEY, AWS_PROFILE, AWS_REGION, or any AWS credential environment variables. Construct SDK clients with no arguments.

Hard constraint on the model ID: every code example in the design must use EXACTLY the model ID global.anthropic.claude-sonnet-4-5-20250929-v1:0. Do not substitute a different regional prefix such as us. or apac.
```

### Step 5: Review and approve

Open `design.md` and confirm all four sections are present. In the TypeScript interfaces section, a reasonable summary shape includes the calorie totals, the three macro percentages, the narrative text, a suggestions list, and metadata such as an entry count and a generated-at timestamp. Field names will vary; that is fine.

Then run these critical review checks. Each one has failed in real runs of this lab; use Find (Cmd+F / CTRL+F) in the file:

1. Search for `us.anthropic` and `apac.`. Both must return zero results in every code example. This drift has happened even when the requirements carried the correct ID.
2. Search for `timeoutSeconds`. The function resource example must set `timeoutSeconds: 30`; the 3-second default guarantees a timeout on Bedrock calls.
3. Search for `AWS_ACCESS_KEY_ID`. It may only appear in a clearly marked incorrect-pattern example. The correct client construction takes no arguments, for example `new BedrockRuntimeClient({})`.
4. Search for `resources`. The IAM grant must be `bedrock:InvokeModel` with `resources: ["*"]`.
5. Search for `publicApiKey`. The custom query must be authorized with `allow.publicApiKey()`.
6. Search for `console.error`. Bedrock failures must be logged before returning the error response, or you cannot debug them from the Lambda logs.

Approve the design when satisfied.

---

## Part C: Generate Tasks

### Step 6: Generate tasks

This prompt pins down the file list and the credentials rule upfront, so Kiro's first pass at `tasks.md` lands in scope. Send in chat:

```
The design for the weekly-nutrition-summary spec is approved. Please generate tasks.md now. This is a time-boxed lab; keep the plan to the smallest scope that delivers the feature.

Rules:
- Tasks ordered by dependency. Each task is one diff (one file or a tightly related set).
- Each task lists the files it touches and the design section it implements.
- @aws-sdk/client-bedrock-runtime is already installed; do not add an install task for it.
- Do NOT write any tests (no unit tests, no property-based tests, no test files).

The implementation may create or edit ONLY these files:
1. amplify/functions/nutrition-summary/resource.ts
2. amplify/functions/nutrition-summary/handler.ts
3. amplify/data/resource.ts (edit)
4. amplify/backend.ts (edit)
5. src/routes/food-tracker.tsx (edit)

Behavioral constraints:
- Validation, if any, happens inline in the handler; no separate schema modules.
- Accept Bedrock's output as-is; no macro normalization or post-processing.
- The fewer-than-3-entries check happens client-side before calling the query.
- Keep the UI minimal: a button, a loading indicator, and a result card that matches the existing dark slate styling. No animations or extra polish.

Credentials hard rule:
The Lambda uses its execution role via the SDK's default credential chain. Do NOT add any task that reads AWS_ACCESS_KEY_ID, AWS_SECRET_ACCESS_KEY, AWS_PROFILE, AWS_REGION, or any AWS credential env vars.

When done, reply with the ordered task list (title + files touched per task). Do not start implementing; wait for my approval.
```

When Kiro replies with its recap, read it and push back if anything is off (for example: "task 3 touches a file not in the allowed list" or "fold the validation into the handler instead of a separate module"). Do not skip the recap.

> **Checkpoint. Validate before continuing:**
> The task list is short (typically 4-6 tasks), touches only the five allowed files, and contains no test tasks.

---

## Part D: Implement the Feature

### Step 7: Implement tasks one at a time

For the first task, send:

```
Show me the unchecked tasks remaining in the weekly-nutrition-summary spec, then prepare to implement the next one in order.

Before making any code changes, reply in chat with:
- The task number and title you are starting
- The files you will create or modify
- Any shell commands you need to run

Implement only that one task. Do not bundle multiple tasks together. Do not add files or features the task does not explicitly require. Wait for my approval of the diff before moving on.
```

Once Kiro produces its recap, type **Approve** in chat to begin the task.

For each subsequent task, send:

```
Implement the next unchecked task using the same protocol.
```

For every task, follow the same loop:

1. Verify the recap matches the task in `tasks.md`.
2. Approve any commands Kiro wants to run.
3. Read the full diff before accepting. Agent output varies between runs; if anything looks wrong, push back in chat and let Kiro fix it before you accept.
4. Watch terminal 1 (the sandbox). When `amplify/` files change, it redeploys automatically; wait for `Deployment completed` before proceeding. If it reports `MultipleSandboxInstancesError` instead, press CTRL+C and rerun `npm run amplify:sandbox` (known stale-lock glitch; your cloud resources are unaffected).
5. Confirm the task is marked complete, then move on.

> If Kiro stalls or loses track of which tasks are done (checkboxes in `tasks.md` not updating), do not keep repeating the same prompt. Open `tasks.md` and either tick the finished task yourself (change `[ ]` to `[x]`) or name the next task explicitly in chat, for example: "Implement task 4: add the custom query". If it stays stuck, the "Run all tasks" button at the top of the tasks view runs the remaining tasks in order.

### Step 8: End-to-end test

1. Make sure both terminals are still running and terminal 1 shows no deploy errors after the function was added.
2. Open `http://localhost:3000/food-tracker`.
3. Click **Generate Weekly Summary**.

**Expected result:** A loading indicator appears, then (after 2-4 seconds) a card renders with total calories, average daily calories, a macro breakdown summing to 100%, a 2-3 sentence narrative, and 2-3 suggestions, all derived from your actual seeded entries.

4. (Optional) Temporarily delete entries until fewer than 3 remain from the last 7 days and confirm the friendly "not enough data" message appears without calling the Lambda. Re-add a few items afterward.

> If clicking the button shows an error: terminal 1 usually has the Lambda logs streaming; check there first, then paste the error into Kiro's chat to diagnose. If the error mentions the model ID or access, refrun the Prerequisite 4 smoke test to confirm Bedrock still responds outside the Lambda.

---

## Lab 2 Outcomes

Lab 3 depends on all of these. Confirm them before moving on:

- [ ] Both terminals still running: the sandbox (terminal 1) and the dev server (terminal 2)
- [ ] "Generate Weekly Summary" produces a card with totals, macros summing to 100%, a narrative, and suggestions
- [ ] The Prerequisite 4 smoke test passed (Claude replied)
- [ ] AWS CLI session valid (`aws sts get-caller-identity` succeeds)

---

## Summary

You verified Bedrock connectivity with a deterministic smoke test before building, then used Kiro's spec workflow to generate requirements, design, and tasks, and implemented an AI-powered weekly nutrition summary backed by Amazon Bedrock running inside an Amplify Function. The spec-driven approach gives you traceable documentation alongside working code: `requirements.md`, `design.md`, and `tasks.md` capture what, why, and how the feature was built. The Amplify Gen 2 backend pattern (function + custom AppSync query + IAM grant in `backend.ts`) is the same one you would use for any AI feature in a real Amplify app. In Lab 3 you automate parts of your workflow with hooks and steering, and build a Bedrock Agent that calls tools.
