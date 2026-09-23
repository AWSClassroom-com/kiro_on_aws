# Lab 2: Build a Weekly Nutrition Summary with Specs and Bedrock

**Objective:** In Lab 1, you vibe-coded: quick prompts, quick diffs. In this lab, you move to spec-driven development. You describe a feature once, and Kiro turns it into formal `requirements.md`, `design.md`, and `tasks.md` documents that you review and approve before any code is written. Then you implement the feature task by task: an AI-powered weekly nutrition summary where an Amplify Function (Lambda) calls Amazon Bedrock, exposed to the frontend through a custom AppSync query. This function + custom query + IAM grant pattern is the same one you would use for any AI feature in a real Amplify app.

**Time:** 60 minutes<br>
**Course repo:** https://github.com/AWSClassroom-com/kiro_on_aws

---

## Prerequisites

### 1. Lab 1 complete

Kiro installed and signed in with Builder ID. Food-tracker app running with both terminals up: `npm run amplify:sandbox -- --identifier <your-sandbox-name>` in the `sandbox` terminal and `npm run dev` in the `dev` terminal. If you did not rename the tabs in Lab 1, do it now: right click each tab and choose **Rename**. Kiro renames tabs after the running process, so both position and label are unreliable. App reachable at `http://localhost:3000`.

Use the same sandbox name you chose in Lab 1 Step 7. A different name creates a second sandbox and leaves the first one running.

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

This lab uses Claude Sonnet 4.6 through the global cross-region inference profile `global.anthropic.claude-sonnet-4-6`. That full string is the model ID you use everywhere in this lab. (An inference profile is how Bedrock routes requests for newer models; you invoke the profile ID instead of the bare model ID.)

Confirm the profile is available in your region:

```bash
aws bedrock list-inference-profiles --query "inferenceProfileSummaries[?inferenceProfileId=='global.anthropic.claude-sonnet-4-6'].[inferenceProfileId,status]" --output table --no-cli-pager
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

### 5. Chat model set to Haiku 4.5

> [!WARNING]
> **Confirm the chat model is Haiku 4.5, not Auto, before starting the spec session.**
>
> In the chat panel (Cmd+L / CTRL+L), check the model selector at the bottom of the input box. If it reads **Auto**, change it to **Haiku 4.5**.
>
> This lab runs a full three-phase spec workflow plus four to six implementation tasks. On Auto, that can exhaust the 50-credit monthly free tier before you reach Part D, and individual steps may hit rate limits and stall the lab.

---

## Part A: Generate Requirements

### Step 1: Start a spec session

Open a new chat session: Cmd+L (macOS) / CTRL+L (Windows/Linux), or the **+** button in the chat panel.

The new session screen offers two cards, **Vibe** and **Spec**. Choose **Spec**.

> Note: there is no agent selector in the chat input box. The controls at the bottom left of the input box are the model selector and the Autopilot toggle. Spec mode is chosen on the new session screen.

### Step 2: Describe the feature

Paste as your initial prompt:

```
Create a new spec "weekly-nutrition-summary" for a new feature that is an AI-powered weekly nutrition summary feature for the food-tracker page.

Requirements:
- On the food tracker page, add a "Generate Weekly Summary" button.
- When clicked, the app filters the food entries from the last 7 days. Entries are already loaded on the page via the AppSync data client (client.models.FoodItem.list()); no extra fetch is required.
- The filtered entries are sent to Amazon Bedrock (Claude Sonnet 4.6, model ID global.anthropic.claude-sonnet-4-6; use EXACTLY this model ID everywhere, do not substitute a different regional prefix such as us. or au.) which returns:
  - totalCalories (sum across all entries)
  - averageDailyCalories (totalCalories divided by 7)
  - macroBreakdown: proteinPercent, carbsPercent, fatPercent (must sum to 100)
  - narrative: a 2-3 sentence summary of the user's eating patterns
  - suggestions: 2-3 actionable suggestions for next week
- Show a loading state while Bedrock is generating the summary (typically 5-10 seconds).
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

> [!NOTE]
> **Kiro's Problems panel may flag the generated document**, for example `Missing required heading: # Requirements Document`. Kiro's spec format checker and its document generator do not always agree. Correct the heading if it is flagged, then continue. The spec workflow works either way.

Then run these review checks. Use Find (Cmd+F / CTRL+F) in the file:

1. Search for `us.anthropic` and `au.anthropic`. Both must return zero results. If found, the model ID drifted; tell Kiro to use exactly `global.anthropic.claude-sonnet-4-6` everywhere.
2. Search for `IAM` and `policy`. The requirements must not contain IAM or permission-scoping criteria; those belong to the design phase. If found, tell Kiro to remove them.
3. Search for `global.anthropic`. It must appear, spelled exactly as in the Step 2 prompt.

Edit `requirements.md` directly or ask in chat to adjust (for example: "Add an acceptance criterion that the loading state appears within 200ms of the click"). Approve through the spec workflow when satisfied.

> Note: agent output varies between runs. Review what Kiro actually wrote, not what you expect it to have written.

---

## Part B: Generate Design

### Step 4: Generate the design

The prompt below is long because it pins down five decisions that agents routinely get wrong in this project. Read these before you paste it, because they are the actual content of this step and you will meet them again in any real Amplify project:

| Constraint | Why |
| --- | --- |
| `timeoutSeconds: 30` | `defineFunction` defaults to 3 seconds. A Bedrock call takes 5 to 10, so the default guarantees a timeout |
| Handler typed `Schema[...]["functionHandler"]` | A hand-written event interface compiles cleanly and is wrong at runtime, because it hides where the arguments actually live |
| Inputs read from `event.arguments` | AppSync puts custom query arguments there, not at the top level of the event |
| `bedrock:InvokeModel` with `resources: ["*"]` | A cross-region inference profile call needs the profile ARN and the foundation model ARN in every routed region. A single scoped ARN fails at runtime |
| Parse from the first `{` to the last `}` | Models often wrap JSON in markdown code fences. Parsing the raw response fails; parsing the substring survives it |

In chat:

```
The requirements for the weekly-nutrition-summary spec are approved. Please generate design.md now. The design must cover:

1. Architecture flow: From the button, click in src/routes/food-tracker.tsx through every layer the request passes through, ending at the rendered summary card. The flow must be: browser -> custom AppSync query -> Amplify Function (Lambda) -> Bedrock InvokeModel -> back through the same path.
2. TypeScript interfaces: A shape for the summary returned to the UI (totals, macro breakdown, narrative, suggestions) and a response shape that signals success, error, or insufficient-data outcomes. The custom query must declare its return as a.json() and its foodItems argument as a.json(). Do NOT build a nested return type out of a.customType(); a custom query that returns nested custom types produces a generated type the Lambda handler cannot satisfy, and the deploy fails type checking. The handler returns a plain object and the client parses the JSON payload it receives.
3. Backend integration: Define an Amplify Function in amplify/functions/nutrition-summary/ (resource.ts and handler.ts) with timeoutSeconds: 30 (the defineFunction default of 3 seconds is too short for a Bedrock call), expose it via a custom query in amplify/data/resource.ts using a.handler.function(), authorize the query with allow.publicApiKey() to match the existing schema, and grant the function's execution role bedrock:InvokeModel permission in amplify/backend.ts (for simplicity in this lab, use resources: ["*"] in the policy statement). The handler MUST be typed as Schema["generateNutritionSummary"]["functionHandler"] (import type { Schema } from "../../data/resource") and read its inputs from event.arguments; AppSync delivers custom query arguments there, not at the top level of the event, and hand-rolled event interfaces hide that mistake from the type checker.
4. Error handling: Explicitly map each of these failure modes to a response: (a) Bedrock call failure (log the real error with console.error so it appears in the Lambda logs, then return an error response), (b) fewer than 3 entries (do not call Bedrock; the client returns an insufficient-data indicator before invoking the query), (c) malformed JSON from Bedrock. For (c): models often wrap JSON in markdown code fences, so the prompt to Bedrock must demand raw JSON with no fences AND the handler must parse the substring from the first "{" to the last "}" of the model's text rather than the raw response.

Hard constraint on credentials: At runtime, the Amplify Function uses its Lambda execution role for AWS calls; the AWS SDK's default credential chain resolves to that role automatically. Do NOT design anything that reads AWS_ACCESS_KEY_ID, AWS_SECRET_ACCESS_KEY, AWS_PROFILE, AWS_REGION, or any AWS credential environment variables. Construct SDK clients with no arguments.

Hard constraint on the model ID: every code example in the design must use EXACTLY the model ID global.anthropic.claude-sonnet-4-6. Do not substitute a different regional prefix such as us. or au.

Scope constraint: this is a time-boxed lab. Do NOT include a testing strategy, correctness properties, property-based tests, unit tests, or integration tests in the design. Tests are out of scope and the task plan will exclude them.
```

### Step 5: Review and approve

Open `design.md` and confirm all four sections are present. In the TypeScript interfaces section, a reasonable summary shape includes the calorie totals, the three macro percentages, the narrative text, a suggestions list, and metadata such as an entry count and a generated-at timestamp. Field names will vary; that is fine.

> [!NOTE]
> **Kiro's Problems panel may flag the generated document**, for example `Missing required heading: # Requirements Document`. Kiro's spec format checker and its document generator do not always agree. Correct the heading if it is flagged, then continue. The spec workflow works either way.

Then run these review checks. Use Find (Cmd+F / CTRL+F) in the file:

1. Search for `us.anthropic` and `au.anthropic`. Both must return zero results in every code example. This drift has happened even when the requirements carried the correct ID.
2. Search for `timeoutSeconds`. The function resource example must set `timeoutSeconds: 30`; the 3-second default guarantees a timeout on Bedrock calls.
3. Search for `AWS_ACCESS_KEY_ID`. It may only appear in a clearly marked incorrect-pattern example. The correct client construction takes no arguments, for example `new BedrockRuntimeClient({})`.
4. Search for `resources`. The IAM grant must be `bedrock:InvokeModel` with `resources: ["*"]`.
5. Search for `publicApiKey`. The custom query must be authorized with `allow.publicApiKey()`.
6. Search for `console.error`. Bedrock failures must be logged before returning the error response, or you cannot debug them from the Lambda logs.

> [!WARNING]
> **Before approving, confirm the design can actually be built.**
>
> The six checks above confirm the design says the right things. They do not confirm it compiles. A design can pass every one of them and still fail to deploy, because the model can invent APIs that do not exist in the installed version of Amplify.
>
> Two specific things to look for in the code examples:
>
> 1. **Every Amplify schema call must be real.** `a.customType()`, `a.ref()`, `a.json()`, `a.enum()`, `a.string()` and `a.integer()` exist. `a.object()` does not. If you see a call you do not recognise, ask Kiro to confirm it exists in `@aws-amplify/data-schema` before approving.
> 2. **Custom query arguments cannot reference a model.** `a.ref("FoodItem")` as an argument fails at deploy time, because AppSync accepts only custom types and enums there. The argument should be `a.json()`.
>
> Correcting these now takes a sentence. Finding them in Part D costs several failed deploys.

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

You approve each task before it runs and read each diff before accepting it. That is the point of this part, so before approving a task, predict what it will touch. If Kiro's recap names a file you did not expect, that is worth a question rather than an approval.

For the first task, send:

```
Show me the unchecked tasks remaining in the weekly-nutrition-summary spec, then prepare to implement the next one in order.

Before making any code changes, reply in chat with:
- The task number and title you are starting
- The files you will create or modify
- Any shell commands you need to run

Implement only that one task. Do not bundle multiple tasks together. Do not add files or features the task does not explicitly require. Wait for my approval of the diff before moving on.
```

> [!WARNING]
> **Type the word `Approve` into the chat box and press ENTER. Do not look for a button.**
>
> This is the first point in the course where approval is a message you send rather than a control you click. Up to now, Kiro has asked for permission with **Run**, **Trust**, or **Accept** buttons, and those are still used for running commands and accepting diffs. Approving a task recap is different: Kiro is waiting for you to reply in the conversation.
>
> If you hunt for an Approve button you will not find one, and the task will sit unstarted.
>
> Buttons you will still see, and what they do:
>
> | Control | When it appears | What it does |
> | --- | --- | --- |
> | **Allow** | Kiro wants to run a command it chose, such as `npm run build` | Runs it once, and asks again next time |
> | **Always allow** | Same prompt as Allow | Runs it and stops asking for that command. Use this |
> | **Run** | A hook or command you configured | Runs it once |
> | **Trust** | Same prompt as Run | Permits the command for later, **does not run it now** |
> | **Accept** | A file diff is ready | Applies the change |
> | **Accept all** | A "Review changes (N of N pending)" panel lists several files | Writes all of them. Nothing is written until you click |
> | *(type `Approve`)* | Kiro has posted a task recap | Starts that task |

> [!NOTE]
> **Kiro may offer to start a dedicated spec session at this point.** Accept it. Your requirements, design and tasks are stored in `.kiro/specs/weekly-nutrition-summary/` on disk, so nothing is lost. The chat conversation does not carry over, so send the prompt above again in the new session.

Once Kiro produces its recap, type **Approve** in chat to begin the task.

For each subsequent task, send:

```
Implement the next unchecked task using the same protocol.
```

For every task, follow the same loop:

1. Verify the recap matches the task in `tasks.md`.
2. Approve any commands Kiro wants to run.
3. Read the full diff before accepting. Agent output varies between runs; if anything looks wrong, push back in chat and let Kiro fix it before you accept.
4. Watch the `sandbox` terminal. When `amplify/` files change, it redeploys automatically; wait for `Deployment completed` before proceeding. If it reports `MultipleSandboxInstancesError`, rerunning will not clear it. Read the PID in the error message. If other sandbox processes are running, close them all and start one again with your own sandbox name:

```
Get-CimInstance Win32_Process -Filter "Name='node.exe'" | Where-Object { $_.CommandLine -match 'amplify:sandbox|ampx.js' } | Stop-Process -Force
```

If the PID in the error is the only sandbox running, it has deadlocked against its own lock file, which happens when files change while a deploy is in progress. Press CTRL+C, clear the lock, then restart the sandbox in that same terminal:

```
Remove-Item ".amplify\artifacts\cdk.out\read.*.lock" -Force -ErrorAction SilentlyContinue
```

Your cloud resources are unaffected. Note that after this error the sandbox prints `Watching for file changes...` and looks healthy while nothing reaches AWS, so if a deploy you expect never appears, check here first.
5. Confirm the task is marked complete, then move on.

> **Checkpoint. After the handler task specifically:**
> Open `amplify/functions/nutrition-summary/handler.ts` and use Find to confirm all four. Each is required by the design and each has gone missing in real runs:
>
> 1. `console.error` appears. Without it, a Bedrock failure leaves nothing in the Lambda logs and Step 8 cannot be debugged.
> 2. `event.arguments` appears. AppSync delivers custom query arguments there, not at the top level of the event.
> 3. `AWS_ACCESS_KEY_ID` does **not** appear. The Lambda uses its execution role.
> 4. `global.anthropic.claude-sonnet-4-6` appears exactly, with no other prefix.
>
> The review checks in Parts A and B verify the plan. This one verifies the code that was actually written.

> If Kiro stalls or loses track of which tasks are done (checkboxes in `tasks.md` not updating), do not keep repeating the same prompt. Open `tasks.md` and either tick the finished task yourself (change `[ ]` to `[x]`) or name the next task explicitly in chat, for example: "Implement task 4: add the custom query". If it stays stuck, the **Run all tasks** button runs the remaining tasks in order. Find it via the **Kiro icon (ghost)** in the activity bar, then **Specs**, then **weekly-nutrition-summary**, then **tasks**. The underlying file is `.kiro/specs/weekly-nutrition-summary/tasks.md`, but opening it from the Explorer gives plain markdown with no buttons; the control only appears in the Specs panel view.

### Step 8: End-to-end test

1. Make sure both terminals are still running and the `sandbox` terminal shows no deploy errors after the function was added.
2. Open `http://localhost:3000/food-tracker`.
3. Click **Generate Weekly Summary**.

**Expected result:** A loading indicator appears, then (after 2-4 seconds) a card renders with total calories, average daily calories, a macro breakdown summing to 100%, a 2-3 sentence narrative, and 2-3 suggestions, all derived from your actual seeded entries.

4. (Optional) Temporarily delete entries until fewer than 3 remain from the last 7 days and confirm the friendly "not enough data" message appears without calling the Lambda. Re-add a few items afterward.

> If clicking the button shows an error: the `sandbox` terminal usually has the Lambda logs streaming; check there first, then paste the error into Kiro's chat to diagnose. If the error mentions the model ID or access, refrun the Prerequisite 4 smoke test to confirm Bedrock still responds outside the Lambda.

---

## Lab 2 Outcomes

Lab 3 depends on all of these. Confirm them before moving on:

- [ ] Both terminals still running: `sandbox` and `dev`
- [ ] "Generate Weekly Summary" produces a card with totals, macros summing to 100%, a narrative, and suggestions
- [ ] The Prerequisite 4 smoke test passed (Claude replied)
- [ ] AWS CLI session valid (`aws sts get-caller-identity` succeeds)

---

## Summary

You verified Bedrock connectivity with a deterministic smoke test before building, then used Kiro's spec workflow to generate requirements, design, and tasks, and implemented an AI-powered weekly nutrition summary backed by Amazon Bedrock running inside an Amplify Function. The spec-driven approach gives you traceable documentation alongside working code: `requirements.md`, `design.md`, and `tasks.md` capture what, why, and how the feature was built. The Amplify Gen 2 backend pattern (function + custom AppSync query + IAM grant in `backend.ts`) is the same one you would use for any AI feature in a real Amplify app. In Lab 3 you automate parts of your workflow with hooks and steering, and author the behaviour of an agent running on Amazon Bedrock AgentCore that calls tools.
