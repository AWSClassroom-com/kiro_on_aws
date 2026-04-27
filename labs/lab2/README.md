# Lab 2: Build a Weekly Nutrition Summary with Specs and Bedrock

## Overview
In this lab, you will build an AI-powered review summarization feature using Kiro's spec-driven development workflow. You will transform a natural language description into formal requirements, technical designs, and sequenced implementation tasks. The feature will integrate with Amazon Bedrock to generate summarize the user's last 7 days of food entries.

## Prerequisites
- Completed Lab 1 (Kiro installed, starter application running)
- AWS credentials configured (SSO or access keys)
- Amazon Bedrock access enabled with Claude model access
- Food-tracker application running at `http://localhost:3000`

## Time Estimate
60 minutes

## Learning Objectives
By the end of this lab, you will be able to:
- Generate formal requirements from a natural language feature description
- Create technical design specifications with interface definitions
- Break work into sequenced implementation tasks
- Integrate Amazon Bedrock for AI-powered features
- Implement a complete feature using spec-driven development

**Course Repository:** **https://github.com/AWSClassroom-com/kiro_on_aws**

---

## Part A: Generate Requirements

### Step 1: Open the Specs Panel

1. In Kiro, click the **Kiro** icon in the activity bar (the ghost icon)
2. In the Kiro pane, find the **Specs** section. You should see one existing spec — `food-tracker` — that ships with
   the project. We're going to add a second one for our new feature.
3. Click the **+** button under the **Specs** section header.
   - Alternatively: in the chat pane, choose **Spec** from the chat options.  
   - **Windows/Linux:** `Ctrl + Shift + P`, type "Kiro: New Spec"
   - **macOS:** `Cmd + Shift + P`, type "Kiro: New Spec"

**Expected Result:** A dialog appears asking for a feature description.

### Step 2: Describe the Feature

1. Copy and paste the following feature description into the dialog:

```
Build an AI-powered weekly nutrition summary feature for the food-tracker page.

Requirements:
- On the food tracker page, add a "Generate Weekly Summary" button
- When clicked, the app fetches all food entries from the last 7 days from PostgreSQL
- The entries are sent to Amazon Bedrock (Claude Sonnet 4.5) which returns:
 - totalCalories (sum across all entries)
 - averageDailyCalories (totalCalories divided by 7)
 - macroBreakdown: proteinPercent, carbsPercent, fatPercent (must sum to 100)
 - narrative: a 2-3 sentence summary of the user's eating patterns
 - suggestions: 2-3 actionable suggestions for next week
- Show a loading state while Bedrock is generating the summary (typically 2-4 seconds)
- Display the result in a card below the button
- Handle the edge case where the user has fewer than 3 entries in the last 7 days: show a friendly message
instead of calling Bedrock
- The Bedrock model ID is anthropic.claude-sonnet-4-5-20250929-v1:0
- The Bedrock API uses anthropic_version "bedrock-2023-05-31"
- The result must NOT be persisted to PostgreSQL; it is a transient view-only summary
```

2. Click **Generate Requirements**

3. Wait for Kiro to process (this may take 30-60 seconds)

**Expected Result:** Kiro generates a requirements document with user stories, acceptance criteria, non-functional requirements, and edge cases.

### Step 3: Review the Generated Requirements

1. Open the generated `requirements.md` file in the Specs panel

2. Locate and review each section:

   **User Stories:** Look for stories like:
   - "As a customer browsing products, I want to see a summary of reviews so that I can make informed purchasing decisions without reading every review."

   **Acceptance Criteria:** Look for testable conditions:
   - WHEN the user clicks "Generate Weekly Summary" THE system SHALL fetch entries from the last 7 days
   - WHEN there are fewer than 3 entries THE system SHALL display a "not enough data" message
   - WHEN Bedrock responds THE system SHALL display totalCalories, averageDailyCalories, macroBreakdown
     
**Expected Result:** You have a comprehensive requirements document covering functional and non-functional aspects.

### Step 4: Refine and Approve Requirements

1. Review the requirements for completeness

2. If you need to add a requirement, either:
   - Edit the document directly, OR
   - Ask Kiro in the chat: "Add a requirement for caching summaries to avoid repeated Bedrock calls"

3. When satisfied, click **Approve Requirements**

**Expected Result:** Requirements are locked and you can proceed to design.

---

## Part B: Generate Design Specification

### Step 5: Generate Technical Design

1. In the Specs panel, click **Generate Design**

2. Wait for Kiro to generate the technical design (this may take 1-2 minutes)

**Expected Result:** Kiro generates a design document with architecture, interfaces, and error handling strategies.

### Step 6: Review Design Components

1. Open the generated `design.md` file

2. Review each section:

   **Architecture flow** — should describe roughly:
   - User clicks button on `src/routes/food-tracker.tsx`
   - Frontend invokes a TanStack server function (`generateWeeklySummary`)
   - Server function queries Postgres for entries where `createdAt >= now() - 7 days`
   - Entries passed to `summarizeWeek` in `src/services/nutrition-summary.ts`
   - `summarizeWeek` builds a prompt and calls `invokeModel` in `src/services/bedrock.ts`
   - Parsed JSON returned up the stack and rendered in a card

   **Interface definitions** — verify TypeScript shapes like:
   ```typescript
   interface NutritionSummary {
    totalCalories: number;
    averageDailyCalories: number;
    macroBreakdown: {
      proteinPercent: number;
      carbsPercent: number;
      fatPercent: number;
    };
    narrative: string;
    suggestions: string[];
    entryCount: number;
    generatedAt: string;
   }

   interface WeeklySummaryResponse {
    success: boolean;
    data?: NutritionSummary;
    error?: string;
    insufficientData?: boolean;
   }
   ```

   **Server function design**
   Should specify the function name (`generateWeeklySummary`), HTTP method (POST), and
   that it lives alongside the existing CRUD server functions in `src/routes/food-tracker.tsx` (matching the existing
   pattern in this file).

  **Error handling** 
  Should map failure modes to responses:
  - Bedrock timeout → friendly error to user, log on server
  - Insufficient entries (< 3) → don't call Bedrock; return `insufficientData: true`
  - Malformed Bedrock JSON → throw with descriptive message; UI shows generic error

**Expected Result:** You understand how the feature will be architected.

### Step 7: Approve the Design

1. Review the design for technical feasibility

2. Verify interfaces align with existing codebase patterns

3. Confirm error handling covers all edge cases from requirements

4. Click **Approve Design**

**Expected Result:** Design is locked and you can proceed to task generation.

---

## Part C: Generate Implementation Tasks

### Step 8: Generate Tasks

1. Open the Kiro chat panel (ghost icon in the activity bar)
   
2. Paste the following prompt:

```
Generate tasks for the weekly-nutrition-summary spec based on the approved design.
```

3. Wait for Kiro to break down the work (30-60 seconds)

**Expected Result:** Kiro generates a list of discrete implementation tasks with dependencies.

### Step 9: Review Task Sequence

1. Open the generated `.kiro/specs/weekly-nutrition-summary/tasks.md` file

2. The exact list will vary depending on what Kiro inferred from your design — that's normal. Review the tasks and confirm the shape of the plan looks roughly like this:   

  - An early task or two for shared types and dependencies (e.g., installing the AWS SDK, defining schemas)
  - A task for the Bedrock client / model invocation (reusable wrapper around InvokeModelCommand)
  - A task for the server function that queries the last 7 days of entries and calls Bedrock
  - One or more tasks for UI — a button, loading state, and result card

3. Since this is a lab, we will ask Kiro to remove all non-essential tasks using the following prompt:

```
Please remove all non essential tasks as this is a lab environment and we want to keep the time to build low.  

Also, Simplify the tasks: remove Zod schema file (inline JSON.parse in Bedrock client), remove macro normalization (accept model output as-is), remove all caching (always call Bedrock fresh). Use npm install instead of pnpm. Keep: Bedrock client with retry at src/lib/bedrock.ts, summarization module at src/lib/nutrition-summary.ts, server function, and UI. Update requirements and design to match.
```

**Expected Result:** Tasks are sequenced by dependency, ready for implementation.

---

## Part D: Implement the Feature

### Step 10a: Set Up AWS Credentials and Enable Bedrock

**Configure AWS Credentials:**

**Option A - AWS SSO (Recommended):**
```bash
aws configure sso
```
Follow the prompts to configure your SSO session.

**Option B - Access Keys:**
```bash
aws configure
```
Enter your Access Key ID and Secret Access Key when prompted.

**Enable Bedrock Model Access:**

1. Serverless models are now available by default and no other configuration is required. 

**Verify Setup:**
```bash
aws bedrock list-foundation-models --query "modelSummaries[?contains(modelId, 'claude')]" --output table
```

**Expected Result:** You see Claude models listed in the output.

### Step 10b: Install AWS SDK Packages

1. Install the AWS Bedrock SDK

```bash
npm install @aws-sdk/client-bedrock-runtime @aws-sdk/credential-providers
```

**Expected Result:** You successfully install the @aws-sdk/client-bedrock-runtime and @aws-sdk/credential-providers.

### Step 11a: Implement Task 1 - Bedrock Service Client

Next we will create the Bedrock Service Client with Kiro

1. In the Kiro chat panel, provide the following prompt:

```
Implement Task 1 from the weekly-nutrition-summary spec.
```

2. Kiro will read tasks.md, run npm install @aws-sdk/client-bedrock-runtime, and propose creating
  src/lib/bedrock.ts. You will see:
    
    - The terminal output from the npm install (or a confirmation it's already installed)    
    - A diff for the new bedrock.ts file
  
3. Review the diff before clicking Apply. Confirm Kiro's output has all of these — if anything is missing, click
  Reject and ask Kiro to fix it.

4. In the Specs panel, verify **Task 1 as complete**

**Expected Result:** Bedrock client with retry logic is ready to use.

### Step 11b: Implement Task 1 - Smoke-test the Bedrock Client

1. In the Kiro chat panel, provide the following prompt:

```
Create a one-off test script at `scripts/test-bedrock.ts` that imports invokeBedrock from `src/lib/bedrock.ts`,
calls it with the prompt "Say hello in one short sentence." and prints the response. Then run it with `npx tsx
scripts/test-bedrock.ts`.
```

2. Kiro will create the script and execute it. Expected output (in the terminal) — something like:
Hello! I'm here to help if you need anything.

2. During this test, you may run into issues if you are using a --profile on your AWS CLI. Kiro can/will fix this for use with the SDK.

3. You may also encounter errors related to cross-region interference profile IDs. Kiro will also fix this automatically. 

4. Once it works, you can ask Kiro to clean up:

```
Delete scripts/test-bedrock.ts — the smoke test passed.
```

### Step 12: Implement Task 2 - Summarization Prompt

1. In the Kiro chat panel, provide the following prompt:

```
Implement Task 2 from the weekly-nutrition-summary spec.
```

2. Kiro will propose creating src/lib/nutrition-summary.ts with the prompt builder, the summarization function, and
  the inline TypeScript types. You'll see a diff.
  
3. Review the diff before clicking Apply.

4. In the Specs panel, verify **Task 2 as complete**

**Expected Result:** Summarization service is ready to process reviews.

### Step 13: Implement Task 3 - Generate Weekly Summary server function

1. In the Kiro chat panel, provide the following prompt:

```
Implement Task 3 from the weekly-nutrition-summary spec.
```

2. Kiro will edit src/routes/food-tracker.tsx and propose a diff that adds a new server function alongside the
  existing createFoodEntry / getFoodEntries / deleteFoodEntry ones.

3. Review the diff before clicking Apply. 

**Expected Result:** API endpoint handles requests with validation, caching, and error handling.

### Step 14: Implement Task 4 - Frontend UI: button, loading state, result card

1. In the Kiro chat panel, provide the following prompt:

```
Implement Task 4 from the weekly-nutrition-summary spec.
```

2. Kiro will edit src/routes/food-tracker.tsx and propose a diff that adds React component(s) for the summary
  feature plus wires them into the existing FoodTracker component. You'll see a sizeable diff.

3. Review the diff before clicking Apply.

**Expected Result:** All tasks are complete. The feature is fully implemented.

### Step 15: End-to-end test

1. Restart your web server if it's not running

2. Open your browser at http://localhost:3000/food-tracker.

3. Confirm you have at least 3 food entries with createdAt in the last 7 days. If your entries are older or fewer
  than 3, add new ones via the form first.

5. Click Generate Weekly Summary.

6. If you get an error such as: "Failed to prase Bedrock Response as JSON", simply paste the error into Kiro and it will fix it. 
---

## Validation Checklist

Verify your lab completion by confirming:

- [ ] Specs panel shows approved requirements document
- [ ] Specs panel shows approved design document
- [ ] Specs panel shows all tasks marked complete
- [ ] Food entries with EXPIRING SOON badge
- [ ] Summary shows 2-3 sentence overview
- [ ] Summary shows total of nutritional values
- [ ] Summary provides suggestions

---

## Troubleshooting

### Issue: "Access Denied" when calling Bedrock
**Solution:**
1. Run `aws configure` to verify credentials are set
2. In the AWS Console, go to **Bedrock** > **Model access** and ensure Claude models are enabled
3. Verify your IAM role/user has `bedrock:InvokeModel` permission

### Issue: Requirements document seems incomplete
**Solution:** You can edit the document directly or ask Kiro to add specific requirements. The document is editable until approved.

### Issue: Bedrock returns malformed JSON
**Solution:** The prompt may need adjustment. Ensure the prompt clearly specifies JSON output format. Check that the response is not being truncated (increase `max_tokens` if needed).

### Issue: Summary takes longer than 3 seconds
**Solution:**
1. Verify caching is working (second load should be fast)
2. Check network latency to Bedrock in your region
3. Consider reducing the number of reviews sent to Bedrock

### Issue: "Insufficient reviews" error for products with reviews
**Solution:** Verify the reviews are being fetched correctly from DynamoDB. Check that the table name matches your environment configuration.

### Issue: Component shows loading spinner indefinitely
**Solution:**
1. Check browser console for errors
2. Verify the API endpoint is deployed and accessible
3. Check Lambda function logs in CloudWatch

---

## Summary

In this lab, you accomplished the following:

1. **Generated Requirements** - Transformed a natural language feature description into formal requirements with user stories, acceptance criteria, and edge cases using Kiro's spec workflow

2. **Created Technical Design** - Generated architecture documentation, TypeScript interfaces, and error handling strategies that serve as a blueprint for implementation

3. **Sequenced Implementation Tasks** - Let Kiro break down the work into discrete, dependency-ordered tasks for systematic implementation

4. **Integrated Amazon Bedrock** - Built a reusable Bedrock client with retry logic and proper error handling

5. **Implemented Complete Feature** - Created summarization service, API endpoint with caching, and frontend component following the spec-driven approach

You now have:
- A working AI-powered feature integrated with Amazon Bedrock
- Requirements documentation explaining WHAT was built and WHY
- Design documentation explaining HOW it is built
- Task history showing the implementation sequence
- Code that handles edge cases and errors gracefully

This spec-driven approach ensures your features are documented, testable, and maintainable - ready for production deployment and team collaboration.
