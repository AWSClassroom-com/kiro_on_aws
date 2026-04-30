# Design Document — Weekly Nutrition Summary

## Overview

The feature adds an AI-powered weekly nutrition summary to the Food Tracker page. A "Generate Weekly Summary" button filters the entries already in memory, calls a custom AppSync query that is backed by an Amplify Function (Lambda), which in turn calls Amazon Bedrock (Claude Sonnet 4.5) and returns a structured JSON summary. The result is rendered in a card below the button. Nothing is written to DynamoDB.

---

## 1. Architecture Flow

```
src/routes/food-tracker.tsx
  │
  │  1. User clicks "Generate Weekly Summary"
  │  2. Client filters in-memory entries → weeklyEntries (addedAt within last 7 days)
  │  3. If weeklyEntries.length < 3 → show Insufficient_Data_Message, stop
  │
  ▼
client.queries.generateWeeklySummary({ entries: weeklyEntries })
  │  (aws-amplify generateClient — same `client` already used on the page)
  │  Auth: API key (matches existing schema authorization)
  │
  ▼
AppSync (custom query: generateWeeklySummary)
  │  Defined in amplify/data/resource.ts via a.query()
  │  Handler: a.handler.function(nutritionSummaryFunction)
  │  Authorization: allow.publicApiKey()
  │
  ▼
amplify/functions/nutrition-summary/handler.ts  (Lambda)
  │  Receives: { entries: FoodEntryInput[] }
  │  Builds Anthropic Messages API prompt
  │  Calls BedrockRuntimeClient.send(InvokeModelCommand)
  │    Model: anthropic.claude-sonnet-4-5
  │    anthropic_version: bedrock-2023-05-31
  │  Credentials: Lambda execution role (SDK default credential chain)
  │  Parses + validates JSON response with Zod
  │  Returns: GenerateSummaryResult (success | error | insufficient-data)
  │
  ▼
AppSync serialises result → back to browser
  │
  ▼
src/routes/food-tracker.tsx
  │  Receives GenerateSummaryResult
  │  Renders SummaryCard or error/insufficient-data message
```

The browser never calls Bedrock directly. All AWS SDK usage lives inside the Lambda, which authenticates via its IAM execution role — no credential environment variables are read or passed.

---

## 2. TypeScript Interfaces

These types are shared between the frontend and the Lambda handler. They are defined in `amplify/functions/nutrition-summary/types.ts` and re-exported from the handler for AppSync to use.

```typescript
// The structured payload Bedrock returns (validated with Zod)
export interface MacroBreakdown {
  proteinPercent: number; // non-negative, sums to 100 with the others (±1)
  carbsPercent: number;
  fatPercent: number;
}

export interface NutritionSummary {
  totalCalories: number;        // non-negative integer; sum of calories across weekly entries
  averageDailyCalories: number; // Math.round(totalCalories / 7)
  macroBreakdown: MacroBreakdown;
  narrative: string;            // 2–3 sentences from Bedrock
  suggestions: string[];        // 2–3 actionable items from Bedrock
}

// Slim representation of a FoodItem sent to the Lambda
export interface FoodEntryInput {
  name: string;
  calories: number | null;
  protein: number | null;
  carbs: number | null;
  fat: number | null;
}

// Discriminated union returned by the AppSync query to the browser
export type GenerateSummaryResult =
  | { status: "success"; summary: NutritionSummary }
  | { status: "error"; message: string }
  | { status: "insufficient-data" };
```

The `status` discriminant lets the UI switch cleanly between the three rendering states without boolean flags.

---

## 3. Backend Integration

### 3a. Amplify Function — `amplify/functions/nutrition-summary/`

**`amplify/functions/nutrition-summary/resource.ts`**

```typescript
import { defineFunction } from "@aws-amplify/backend";

export const nutritionSummaryFunction = defineFunction({
  name: "nutrition-summary",
  entry: "./handler.ts",
  timeoutSeconds: 30, // Bedrock calls typically take 2–4 s; 30 s gives headroom
});
```

**`amplify/functions/nutrition-summary/handler.ts`** (pseudocode-level detail)

```typescript
import { BedrockRuntimeClient, InvokeModelCommand } from "@aws-sdk/client-bedrock-runtime";
import { z } from "zod";
import type { FoodEntryInput, GenerateSummaryResult, NutritionSummary } from "./types";

// Zod schema mirrors NutritionSummary — used to validate Bedrock's JSON output
const nutritionSummarySchema = z.object({
  totalCalories: z.number().int().nonnegative(),
  averageDailyCalories: z.number().int().nonnegative(),
  macroBreakdown: z.object({
    proteinPercent: z.number().nonnegative(),
    carbsPercent: z.number().nonnegative(),
    fatPercent: z.number().nonnegative(),
  }),
  narrative: z.string().min(1),
  suggestions: z.array(z.string().min(1)).min(2).max(3),
});

// SDK client — credentials resolved automatically from the Lambda execution role
const bedrock = new BedrockRuntimeClient({ region: process.env.AWS_REGION });

export const handler = async (event: {
  arguments: { entries: FoodEntryInput[] };
}): Promise<GenerateSummaryResult> => {
  const { entries } = event.arguments;

  // Build the prompt
  const entryLines = entries
    .map((e) =>
      `- ${e.name}: ${e.calories ?? "?"} kcal, protein ${e.protein ?? "?"}g, carbs ${e.carbs ?? "?"}g, fat ${e.fat ?? "?"}g`
    )
    .join("\n");

  const prompt = `
You are a nutrition analyst. Given the following food entries from the past 7 days, return ONLY a JSON object (no markdown, no explanation) with this exact shape:
{
  "totalCalories": <integer>,
  "averageDailyCalories": <integer — totalCalories divided by 7, rounded>,
  "macroBreakdown": {
    "proteinPercent": <number>,
    "carbsPercent": <number>,
    "fatPercent": <number>
  },
  "narrative": "<2–3 sentences describing eating patterns>",
  "suggestions": ["<suggestion 1>", "<suggestion 2>", "<optional suggestion 3>"]
}
The three macro percentages must sum to 100. Base them on total grams of protein, carbs, and fat (4 kcal/g for protein and carbs, 9 kcal/g for fat).

Food entries:
${entryLines}
`.trim();

  try {
    const command = new InvokeModelCommand({
      modelId: "anthropic.claude-sonnet-4-5",
      contentType: "application/json",
      accept: "application/json",
      body: JSON.stringify({
        anthropic_version: "bedrock-2023-05-31",
        max_tokens: 1024,
        messages: [{ role: "user", content: prompt }],
      }),
    });

    const response = await bedrock.send(command);
    const raw = JSON.parse(new TextDecoder().decode(response.body));
    // Anthropic response shape: { content: [{ type: "text", text: "..." }] }
    const text: string = raw.content[0].text;

    // Strip any accidental markdown fences before parsing
    const jsonText = text.replace(/^```(?:json)?\n?/, "").replace(/\n?```$/, "").trim();
    const parsed: unknown = JSON.parse(jsonText);
    const validated: NutritionSummary = nutritionSummarySchema.parse(parsed);

    return { status: "success", summary: validated };
  } catch (err) {
    if (err instanceof z.ZodError) {
      // Bedrock responded but the shape was wrong
      return { status: "error", message: "The summary could not be parsed. Please try again." };
    }
    // Network / service error from Bedrock
    return { status: "error", message: "Failed to generate summary. Please check your connection and try again." };
  }
};
```

Key points:
- `BedrockRuntimeClient` is constructed with `{ region: process.env.AWS_REGION }` only. `AWS_REGION` is a standard Lambda environment variable set by the runtime itself — it is not a credential. No `AWS_ACCESS_KEY_ID`, `AWS_SECRET_ACCESS_KEY`, `AWS_PROFILE`, or similar variables are read.
- The SDK's default credential provider chain resolves to the Lambda execution role automatically.
- Zod validation runs before the result is returned; a `ZodError` is caught separately from a Bedrock service error so the two produce distinct user messages.

### 3b. Custom Query — `amplify/data/resource.ts`

Add a custom query to the existing schema:

```typescript
import { type ClientSchema, a, defineData } from "@aws-amplify/backend";
import { nutritionSummaryFunction } from "../functions/nutrition-summary/resource";

const schema = a.schema({
  // --- existing FoodItem model (unchanged) ---
  FoodItem: a
    .model({ /* ... unchanged ... */ })
    .authorization((allow) => [allow.publicApiKey()]),

  // --- new types for the custom query ---
  MacroBreakdown: a.customType({
    proteinPercent: a.float().required(),
    carbsPercent: a.float().required(),
    fatPercent: a.float().required(),
  }),

  NutritionSummary: a.customType({
    totalCalories: a.integer().required(),
    averageDailyCalories: a.integer().required(),
    macroBreakdown: a.ref("MacroBreakdown").required(),
    narrative: a.string().required(),
    suggestions: a.string().array().required(),
  }),

  GenerateSummaryResult: a.customType({
    status: a.string().required(),   // "success" | "error" | "insufficient-data"
    summary: a.ref("NutritionSummary"),
    message: a.string(),
  }),

  FoodEntryInput: a.customType({
    name: a.string().required(),
    calories: a.integer(),
    protein: a.float(),
    carbs: a.float(),
    fat: a.float(),
  }),

  // --- custom query ---
  generateWeeklySummary: a
    .query()
    .arguments({
      entries: a.ref("FoodEntryInput").array().required(),
    })
    .returns(a.ref("GenerateSummaryResult").required())
    .handler(a.handler.function(nutritionSummaryFunction))
    .authorization((allow) => [allow.publicApiKey()]),
});
```

`allow.publicApiKey()` on the query matches the existing authorization mode of the schema, so no new auth configuration is needed.

### 3c. IAM Permission — `amplify/backend.ts`

Grant the Lambda execution role permission to call Bedrock:

```typescript
import { defineBackend } from "@aws-amplify/backend";
import { data } from "./data/resource";
import { nutritionSummaryFunction } from "./functions/nutrition-summary/resource";
import { PolicyStatement } from "aws-cdk-lib/aws-iam";

const backend = defineBackend({ data, nutritionSummaryFunction });

backend.nutritionSummaryFunction.resources.lambda.addToRolePolicy(
  new PolicyStatement({
    actions: ["bedrock:InvokeModel"],
    resources: [
      "arn:aws:bedrock:*::foundation-model/anthropic.claude-sonnet-4-5",
    ],
  }),
);
```

`PolicyStatement` is imported from `aws-cdk-lib/aws-iam`, which is already a dev dependency (`aws-cdk-lib ^2.158.0` in `package.json`).

---

## 4. Frontend Integration — `src/routes/food-tracker.tsx`

### State additions to `FoodTracker`

```typescript
type SummaryState =
  | { phase: "idle" }
  | { phase: "loading" }
  | { phase: "insufficient-data" }
  | { phase: "success"; summary: NutritionSummary }
  | { phase: "error"; message: string };

const [summaryState, setSummaryState] = useState<SummaryState>({ phase: "idle" });
```

### `handleGenerateSummary` handler

```typescript
const handleGenerateSummary = async () => {
  // 1. Filter in-memory entries — no extra fetch
  const cutoff = Date.now() - 7 * 24 * 60 * 60 * 1000;
  const weeklyEntries = entries.filter(
    (e) => e.addedAt && new Date(e.addedAt).getTime() >= cutoff,
  );

  // 2. Insufficient-data guard — client-side, no AppSync call
  if (weeklyEntries.length < 3) {
    setSummaryState({ phase: "insufficient-data" });
    return;
  }

  // 3. Call AppSync query
  setSummaryState({ phase: "loading" });
  try {
    const { data, errors } = await client.queries.generateWeeklySummary({
      entries: weeklyEntries.map((e) => ({
        name: e.name,
        calories: e.calories ?? null,
        protein: e.protein ?? null,
        carbs: e.carbs ?? null,
        fat: e.fat ?? null,
      })),
    });

    if (errors?.length || !data) {
      setSummaryState({
        phase: "error",
        message: "Failed to generate summary. Please check your connection and try again.",
      });
      return;
    }

    if (data.status === "success" && data.summary) {
      setSummaryState({ phase: "success", summary: data.summary as NutritionSummary });
    } else if (data.status === "insufficient-data") {
      setSummaryState({ phase: "insufficient-data" });
    } else {
      setSummaryState({
        phase: "error",
        message: data.message ?? "Failed to generate summary. Please check your connection and try again.",
      });
    }
  } catch {
    setSummaryState({
      phase: "error",
      message: "Failed to generate summary. Please check your connection and try again.",
    });
  }
};
```

### Rendering

The button and result area are rendered below `<FoodEntriesList>` inside the `FoodTracker` component:

```tsx
{/* Weekly Summary Button */}
<button
  type="button"
  onClick={handleGenerateSummary}
  disabled={summaryState.phase === "loading"}
  className="w-full py-4 bg-linear-to-r from-emerald-500 to-cyan-500 hover:from-emerald-600 hover:to-cyan-600 disabled:from-gray-600 disabled:to-gray-700 text-white font-semibold rounded-lg transition-all duration-200 shadow-lg shadow-emerald-500/25 disabled:shadow-none flex items-center justify-center gap-2"
>
  {summaryState.phase === "loading" ? (
    <>
      <span className="animate-spin w-4 h-4 border-2 border-white border-t-transparent rounded-full" />
      Generating summary…
    </>
  ) : (
    "Generate Weekly Summary"
  )}
</button>

{/* Result area */}
{summaryState.phase === "loading" && <SummaryLoadingCard />}
{summaryState.phase === "insufficient-data" && <InsufficientDataMessage />}
{summaryState.phase === "error" && <SummaryErrorMessage message={summaryState.message} />}
{summaryState.phase === "success" && <SummaryCard summary={summaryState.summary} />}
```

### Sub-components (defined in `food-tracker.tsx`)

**`SummaryLoadingCard`** — spinner + "Analysing your week…" text, styled with `bg-slate-800/50 border-slate-700`.

**`InsufficientDataMessage`** — amber-tinted info card with the message: "Not enough data — add at least 3 food entries from the last 7 days to generate a summary."

**`SummaryErrorMessage`** — red-tinted error card displaying `message`, with a "Try again" affordance (re-clicking the button).

**`SummaryCard`** — dark slate card (`bg-slate-800/50 border-slate-700`) containing:
- Calorie row: "Total Calories" and "Daily Average" as two stat tiles with cyan accent text
- Macro bar: three labelled percentage badges (Protein / Carbs / Fat) in emerald, blue, and amber
- Narrative block: `text-gray-300` paragraph
- Suggestions list: bulleted list with a `Sparkles` or `Lightbulb` icon from Lucide React

---

## 5. Error Handling Matrix

| Failure mode | Where detected | Response returned | UI shown |
|---|---|---|---|
| `weeklyEntries.length < 3` | Browser (before AppSync call) | — (no query invoked) | `InsufficientDataMessage` |
| AppSync / network error | Browser (`errors` array or thrown) | — | `SummaryErrorMessage` ("Failed to generate summary…") |
| Bedrock service error (non-2xx, timeout) | Lambda `catch` block (non-ZodError) | `{ status: "error", message: "Failed to generate summary…" }` | `SummaryErrorMessage` |
| Bedrock returns malformed / invalid JSON | Lambda `catch` block (`ZodError`) | `{ status: "error", message: "The summary could not be parsed…" }` | `SummaryErrorMessage` |

In all error cases the button is re-enabled (not `phase: "loading"`) so the user can retry.

---

## 6. File Manifest

| File | Action |
|---|---|
| `amplify/functions/nutrition-summary/resource.ts` | **Create** — `defineFunction` |
| `amplify/functions/nutrition-summary/handler.ts` | **Create** — Lambda handler + Bedrock call |
| `amplify/functions/nutrition-summary/types.ts` | **Create** — shared TypeScript interfaces + Zod schema |
| `amplify/data/resource.ts` | **Modify** — add custom types + `generateWeeklySummary` query |
| `amplify/backend.ts` | **Modify** — register function + add `bedrock:InvokeModel` policy |
| `src/routes/food-tracker.tsx` | **Modify** — add state, handler, button, and result sub-components |
