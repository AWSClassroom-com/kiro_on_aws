# Implementation Plan: Weekly Nutrition Summary

## Overview

Five sequential tasks, each touching one file or one tightly related set of files. Dependencies flow top-to-bottom: the Lambda resource must exist before the data schema can reference it, the schema must be deployed before the frontend can call the query, and the Bedrock smoke test runs last to confirm end-to-end connectivity before the feature is considered done.

## Tasks

- [x] 1. Install `@aws-sdk/client-bedrock-runtime` in the Amplify backend package
  - Add `@aws-sdk/client-bedrock-runtime` as a dependency in `amplify/package.json` (pinned exact version).
  - Run `npm install` inside `amplify/` so `package-lock.json` is updated.
  - No source files change in this task — dependency only.
  - _Requirements: 4.1, 4.2_
  - _Design: §3a — BedrockRuntimeClient import_

- [x] 2. Create the Lambda function resource and handler
  - [x] 2.1 Create `amplify/functions/nutrition-summary/resource.ts`
    - Export `nutritionSummaryFunction` via `defineFunction({ name: "nutrition-summary", entry: "./handler.ts", timeoutSeconds: 30 })`.
    - _Requirements: 4.1, 4.2_
    - _Design: §3a — resource.ts_

  - [x] 2.2 Create `amplify/functions/nutrition-summary/handler.ts`
    - Import `BedrockRuntimeClient`, `InvokeModelCommand` from `@aws-sdk/client-bedrock-runtime` and `z` from `zod`.
    - Define inline Zod schema for `NutritionSummary` (totalCalories, averageDailyCalories, macroBreakdown, narrative, suggestions).
    - Define inline TypeScript types: `FoodEntryInput`, `NutritionSummary`, `MacroBreakdown`, `GenerateSummaryResult` discriminated union — no separate types file.
    - Construct `BedrockRuntimeClient({ region: process.env.AWS_REGION })` — no other credential env vars.
    - Build the Anthropic Messages API prompt from `event.arguments.entries`.
    - Call `bedrock.send(new InvokeModelCommand({ modelId: "anthropic.claude-sonnet-4-5-20250929-v1:0", ... }))` with `anthropic_version: "bedrock-2023-05-31"` and `max_tokens: 1024`.
    - Parse `response.body` → extract `raw.content[0].text` → strip markdown fences → `JSON.parse` → `nutritionSummarySchema.parse`.
    - Return `{ status: "success", summary: validated }` on success.
    - Catch `ZodError` → return `{ status: "error", message: "The summary could not be parsed. Please try again." }`.
    - Catch all other errors → return `{ status: "error", message: "Failed to generate summary. Please check your connection and try again." }`.
    - Accept Bedrock's output as-is — no macro normalization or post-processing.
    - _Requirements: 4.1, 4.2, 4.3, 4.4, 4.5, 5.1–5.6, 9.1_
    - _Design: §3a — handler.ts_

- [x] 3. Register the function and add the Bedrock IAM policy in `amplify/backend.ts`
  - Import `nutritionSummaryFunction` from `./functions/nutrition-summary/resource`.
  - Import `PolicyStatement` from `aws-cdk-lib/aws-iam`.
  - Add `nutritionSummaryFunction` to `defineBackend({ data, nutritionSummaryFunction })`.
  - Call `backend.nutritionSummaryFunction.resources.lambda.addToRolePolicy(new PolicyStatement({ actions: ["bedrock:InvokeModel"], resources: ["arn:aws:bedrock:*::foundation-model/anthropic.claude-sonnet-4-5-20250929-v1:0"] }))`.
  - _Requirements: 4.1, 4.2_
  - _Design: §3c — backend.ts_

- [x] 4. Add custom types and `generateWeeklySummary` query to `amplify/data/resource.ts`
  - Import `nutritionSummaryFunction` from `../functions/nutrition-summary/resource`.
  - Add `MacroBreakdown` custom type (proteinPercent, carbsPercent, fatPercent — all `a.float().required()`).
  - Add `NutritionSummary` custom type (totalCalories `a.integer().required()`, averageDailyCalories `a.integer().required()`, macroBreakdown `a.ref("MacroBreakdown").required()`, narrative `a.string().required()`, suggestions `a.string().array().required()`).
  - Add `GenerateSummaryResult` custom type (status `a.string().required()`, summary `a.ref("NutritionSummary")`, message `a.string()`).
  - Add `FoodEntryInput` custom type (name `a.string().required()`, calories `a.integer()`, protein `a.float()`, carbs `a.float()`, fat `a.float()`).
  - Add `generateWeeklySummary` query: `.arguments({ entries: a.ref("FoodEntryInput").array().required() })`, `.returns(a.ref("GenerateSummaryResult").required())`, `.handler(a.handler.function(nutritionSummaryFunction))`, `.authorization((allow) => [allow.publicApiKey()])`.
  - Leave the existing `FoodItem` model and `authorizationModes` config untouched.
  - _Requirements: 4.1, 4.3_
  - _Design: §3b — data/resource.ts_

- [x] 5. Add the Weekly Summary UI to `src/routes/food-tracker.tsx`
  - [x] 5.1 Add `SummaryState` type and `summaryState` / `setSummaryState` state to `FoodTracker`
    - Define `SummaryState` as a discriminated union: `{ phase: "idle" } | { phase: "loading" } | { phase: "insufficient-data" } | { phase: "success"; summary: NutritionSummary } | { phase: "error"; message: string }`.
    - Initialise with `{ phase: "idle" }`.
    - Import `NutritionSummary` type from the generated `Schema` or inline — whichever the Amplify codegen exposes after task 4.
    - _Requirements: 1.2, 6.1, 6.3_
    - _Design: §4 — State additions_

  - [x] 5.2 Implement `handleGenerateSummary` handler
    - Compute `cutoff = Date.now() - 7 * 24 * 60 * 60 * 1000`; filter `entries` by `addedAt >= cutoff` — no extra fetch (uses in-memory list).
    - If `weeklyEntries.length < 3` → `setSummaryState({ phase: "insufficient-data" })` and return — do NOT call the query.
    - Set `{ phase: "loading" }`, then call `client.queries.generateWeeklySummary({ entries: weeklyEntries.map(...) })`.
    - Map each entry to `{ name, calories: e.calories ?? null, protein: e.protein ?? null, carbs: e.carbs ?? null, fat: e.fat ?? null }`.
    - On `errors?.length || !data` → set `{ phase: "error", message: "Failed to generate summary…" }`.
    - On `data.status === "success"` → set `{ phase: "success", summary: data.summary }`.
    - On `data.status === "insufficient-data"` → set `{ phase: "insufficient-data" }`.
    - On `data.status === "error"` → set `{ phase: "error", message: data.message ?? "Failed to generate summary…" }`.
    - Wrap in try/catch; catch → set `{ phase: "error", message: "Failed to generate summary…" }`.
    - _Requirements: 1.1, 1.3, 2.1, 2.2, 2.3, 3.1, 3.2, 9.1, 9.3_
    - _Design: §4 — handleGenerateSummary_

  - [x] 5.3 Add `SummaryLoadingCard`, `InsufficientDataMessage`, `SummaryErrorMessage`, and `SummaryCard` sub-components
    - `SummaryLoadingCard`: spinner + "Analysing your week…" text, `bg-slate-800/50 border border-slate-700` card.
    - `InsufficientDataMessage`: amber-tinted info card with exact text "Not enough data — add at least 3 food entries from the last 7 days to generate a summary."
    - `SummaryErrorMessage({ message })`: red-tinted error card displaying `message`; button is re-enabled by the parent (no internal retry logic needed).
    - `SummaryCard({ summary })`: dark slate card containing —
      - Two stat tiles: "Total Calories" (`totalCalories`) and "Daily Average" (`averageDailyCalories`) with cyan accent text.
      - Three macro percentage badges: Protein (emerald), Carbs (blue), Fat (amber).
      - Narrative paragraph (`text-gray-300`).
      - Suggestions bulleted list with a `Sparkles` or `Lightbulb` icon from Lucide React.
    - All components defined inline in `food-tracker.tsx` — no new files.
    - _Requirements: 3.1, 6.1, 7.1–7.6, 9.1, 9.2_
    - _Design: §4 — Sub-components_

  - [x] 5.4 Wire the button and result area into the `FoodTracker` render tree
    - Render the Weekly Summary Button below `<FoodEntriesList>` (or the loading skeleton): `disabled={summaryState.phase === "loading"}`, `onClick={handleGenerateSummary}`.
    - Button label: "Generate Weekly Summary" at rest; spinner + "Generating summary…" while loading.
    - Below the button, conditionally render:
      - `summaryState.phase === "loading"` → `<SummaryLoadingCard />`
      - `summaryState.phase === "insufficient-data"` → `<InsufficientDataMessage />`
      - `summaryState.phase === "error"` → `<SummaryErrorMessage message={summaryState.message} />`
      - `summaryState.phase === "success"` → `<SummaryCard summary={summaryState.summary} />`
    - _Requirements: 1.1, 1.2, 1.3, 6.1, 6.2, 6.3, 7.1, 8.1, 8.2_
    - _Design: §4 — Rendering_

- [x] 6. Bedrock smoke test
  - Create `scripts/test-bedrock.ts`:
    - Import `BedrockRuntimeClient`, `InvokeModelCommand` from `@aws-sdk/client-bedrock-runtime`.
    - Construct `new BedrockRuntimeClient({ region: process.env.AWS_REGION })` — default credential chain only, no explicit credential env vars.
    - Send `InvokeModelCommand` with `modelId: "anthropic.claude-sonnet-4-5-20250929-v1:0"`, `anthropic_version: "bedrock-2023-05-31"`, `max_tokens: 64`, and user message `"Say hello in one short sentence."`.
    - Print the raw response body to stdout.
    - On any error, print the full stack trace and call `process.exit(1)` — do not suppress or reformat.
  - Run `npx tsx scripts/test-bedrock.ts`.
  - If the run fails, stop and diagnose — do not continue.
  - If the run succeeds, delete `scripts/test-bedrock.ts`.
  - _Requirements: 4.1, 4.2_
  - _Design: §3a — Bedrock invocation_

## Notes

- Tasks marked with `*` are optional and can be skipped for an MVP build.
- Tasks are ordered by dependency: each task's inputs are fully available from the tasks above it.
- The `<3 entries` guard (Requirement 2.3 / 3.1) is enforced client-side in task 5.2 — the Lambda never receives fewer than 3 entries.
- The Lambda uses only `process.env.AWS_REGION` (standard Lambda runtime variable) for the SDK client; all credentials come from the execution role via the SDK default credential chain.
- Bedrock's JSON output is accepted as-is after Zod validation — no macro normalization or post-processing is applied.
