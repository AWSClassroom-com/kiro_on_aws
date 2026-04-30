# Lab 3: Hooks, Steering, and a Meal Recommendation Agent

Use Kiro for two distinct kinds of automation. First, refine your steering files and create two hooks — one **Ask Kiro** (security scan) and one **Run Command** (format on save) — so you've used both action types and the hook-plus-steering pairing the module covered. Then build an **Amazon Bedrock Agent** that recommends meals from the user's food entries: have Kiro generate the agent instructions, the action-group OpenAPI schema, and the Lambda tool code, then configure the agent in the AWS Console and smoke-test it with the trace panel open.

**Time:** 70 minutes
**Course repo:** https://github.com/AWSClassroom-com/kiro_on_aws

## Working with Kiro

- Open chat: `Cmd+L` (macOS) / `Ctrl+L` (Windows/Linux). Open command palette: `Cmd+Shift+P` / `Ctrl+Shift+P`.
- Prefer chat and command palette over clicking buttons — button labels change between versions.
- Agent output varies between runs. Expected results describe outcomes, not exact text. If something looks wrong, tell Kiro in chat.
- Always read diffs before accepting.

---

## Prerequisites

### 1. Lab 2 complete
The weekly nutrition summary feature is working end-to-end. Foundational steering files (`product.md`, `tech.md`, `structure.md`) exist in `.kiro/steering/` from Lab 1.

### 2. Sandbox + dev server running
From `kiro-project/food-tracker`, both terminals are still up: `npm run amplify:sandbox` (terminal 1) and `npm run dev` (terminal 2). The food-tracker app is reachable at `http://localhost:3000`.

### 3. AWS CLI session valid

```bash
aws sts get-caller-identity --no-cli-pager
```

If it fails with an expired-token error, re-run `aws login --region <your-region>` from Lab 1.

### 4. Bedrock Claude Sonnet 4.5 access

Confirm the agent's foundation model is available in your region:

```bash
aws bedrock list-foundation-models \
  --query "modelSummaries[?modelId=='anthropic.claude-sonnet-4-5-20250929-v1:0']" \
  --output table --no-cli-pager
```

If the result is empty, model access hasn't been enabled in this account/region — your instructor will help.

---

## Part A: Refine Steering with a Security File

Lab 1 created the three foundational steering files. Now you'll add a fourth — `security.md` — that captures rules the security hook in Part B will reference, including an allowlist of strings that *look* like credentials but aren't.

### Step 1: Open the Steering panel

Click the **Kiro** icon (ghost) in the activity bar. Find the **Steering** section. You should see your three foundational files.

### Step 2: Add a security steering file

In the Steering section, click **+** to add a new file. Then select **food-tracker agent steering**. Name it `security`.

Once the file has been created replace the default contents with:

```markdown
---
inclusion: always
---

# Security Rules

## What counts as a credential in this codebase

Treat any of the following as a hardcoded credential and flag it:

- AWS access key IDs — strings matching `AKIA[A-Z0-9]{16}` (long-term IAM user keys) or `ASIA[A-Z0-9]{16}` (temporary STS keys). Both prefixes are equally important; ASIA keys are now the majority in modern AWS deployments.
- Private keys — anything containing `-----BEGIN ... PRIVATE KEY-----` (RSA, EC, OpenSSH, PGP variants).
- Database connection strings with embedded credentials — `postgres://user:password@…`, `mongodb://…`, `mysql://…`.
- GitHub tokens — strings beginning with `ghp_`, `gho_`, `ghu_`, `ghs_`, or `ghr_`.
- Plain password assignments where the value is a real secret — `password = "…"`, `passwd: …`, `pwd: …`.

## Where credentials must NOT live

Source files (`.ts`, `.tsx`, `.js`, `.jsx`, `.json`, `.yaml`, `.yml`, `.env*`). Anything under `amplify/`, `src/`, or `scripts/`.

## Where credentials SHOULD live

- For service-to-service calls inside AWS: IAM roles. The default credential chain picks them up — no static keys in code.
- For configuration: AWS Systems Manager Parameter Store.
- For credentials that need rotation: AWS Secrets Manager.

## Allowlist — known-safe strings that may match credential patterns

These are documentation/test values and must NOT be flagged as real credentials:

- `AKIAIOSFODNN7EXAMPLE` — AWS's reserved example access key ID. Cannot be activated; safe to commit anywhere.
- `wJalrXUtnFEMI/K7MDENG/bPxRfiCYEXAMPLEKEY` — AWS's reserved example secret access key.
- Any string ending in the literal word `EXAMPLE` (case-sensitive).
- Strings inside files under `__tests__/` or matching `*.test.ts` / `*.spec.ts` — test fixtures intentionally use placeholder credentials.
```

**Save the file**.

The frontmatter `inclusion: always` means Kiro will load this file into context on every interaction (including when the security hook in Part B fires). This is the concrete form of the allowlist-via-steering pattern from the module: the hook says "scan now"; this file tells it what counts and what doesn't.

---

## Part B: A File-Save Security Hook (Ask Kiro action)

The module covered two hook action types. **Ask Kiro** sends a natural-language prompt to the agent — slow, costs tokens, but the agent reads context and uses judgment. **Run Command** runs a shell command — fast, free, deterministic. Use Ask Kiro when the question requires judgment ("is this a real secret or a test fixture?"). Use Run Command when there's a single right answer ("does this file pass the linter?").

This part builds an Ask Kiro hook. Part C builds a Run Command hook so you've used both.

### Step 3: Open the Hooks panel

In the Kiro pane (ghost icon in the activity bar), find **Agent Hooks**. Click **+** → **Ask Kiro to create a hook**.

### Step 4: Describe the hook

In the chat session that just opened, paste the below prompt and press ENTER:

```
Create a hook named "security-scan" that fires when a TypeScript, JavaScript, JSON, YAML, or .env file is saved. Trigger type: fileEdited. File patterns: **/*.ts, **/*.tsx, **/*.js, **/*.jsx, **/*.json, **/*.yaml, **/*.yml, **/.env, **/.env.*. Exclude node_modules, dist, build, and amplify_outputs.json.

Action type: askAgent (Ask Kiro). The prompt to the agent should:
- Ask it to read the saved file and identify any hardcoded credentials, applying the rules in the security.md steering file.
- Tell it to use file path and surrounding context to distinguish real credentials from test fixtures, documentation examples, and the allowlisted strings in security.md.
- For each finding, report: file path, line number, what kind of credential, and the recommended fix (IAM role, Parameter Store, or Secrets Manager — per security.md).
- If nothing is found, say so briefly so the developer knows the scan ran.

Save the hook to .kiro/hooks/security-scan.kiro.hook.
```

Kiro will generate a JSON hook file. Review it before saving:

- The `when` block uses `type: fileEdited` and the patterns listed above.
- The `then` block uses `type: askAgent` (not `runCommand`).
- The prompt references the steering file and asks for context-based judgment.

If anything's off, ask Kiro to fix it in chat ("the include patterns are missing `.env` files — please add them"). Save when correct.

### Step 5: Test the hook with two strings — one safe, one not

Click the **Explorer** icon (files at the top) in the activity bar. Create a test file in the **src/** directory named **scratch-credentials.ts**.

Open `src/scratch-credentials.ts` and paste:

```typescript
// Two strings that match the AWS access key pattern.
// One is the documented EXAMPLE value (allowlisted in security.md).
// The other is fabricated but pattern-real.
const exampleKey = "AKIAIOSFODNN7EXAMPLE";
const fabricatedKey = "AKIA2QHFZ6PXVMK3WYJN";
```

Save the file. The hook fires. Watch the chat panel.

**Expected behavior:** the agent flags `AKIA2QHFZ6PXVMK3WYJN` as a real-looking AWS access key ID, and explicitly identifies `AKIAIOSFODNN7EXAMPLE` as the documented test value from the allowlist (and does *not* flag it). It suggests IAM roles or Secrets Manager as the right home for real credentials.

That's the hook-plus-steering pairing in action — the same hook prompt would have produced two false positives without `security.md` loading into context. With Always-mode steering, the agent has the rules and the allowlist on every fire.

### Step 6: Clean up

Delete the file **src/scratch-credentials.ts**

---

## Part C: A File-Save Format Hook (Run Command action)

Now create the deterministic counterpart: a hook that runs Biome's formatter on save. No model call, no tokens, just a shell command.

### Step 7: Create the format hook

In the Kiro pane → **Agent Hooks** → **+** → **Ask Kiro to create a hook**:

```
Create a hook named "format-on-save" that fires when a TypeScript or TypeScript-React file is saved. Trigger type: fileEdited. File patterns: **/*.ts, **/*.tsx. Exclude node_modules, dist, and amplify_outputs.json.

Action type: runCommand. Command: npx biome format --write src/ amplify/ scripts/

The {file} placeholder is replaced with the path of the file that triggered the hook.

Save to .kiro/hooks/format-on-save.kiro.hook.
```

Verify the generated file uses `type: runCommand` (not `askAgent`) and that the command references `{file}`. Save.

### Step 8: Test it

Open any `.ts` file under `src/` and add a deliberately ugly line:

```typescript
const   foo  =      'bar'   ;
```

Save. The Run Command hook fires Biome silently. Reopen the file (or watch the editor refresh) — the line is reformatted to clean spacing and proper quotes.

Both hook files now live under `.kiro/hooks/` and travel with the repo. A teammate who clones the project gets both hooks running automatically — no setup.

---

## Part D: Build and Deploy the Agent's Tool Lambda

Switch contexts to the second half of the module: Bedrock Agents. You'll have Kiro generate four artifacts in one chat turn — agent instructions, OpenAPI schema, a `defineFunction` resource, and the Lambda handler — plus the `amplify/backend.ts` edits that wire the function to the FoodItem DynamoDB table and let Bedrock invoke it. Then the Amplify sandbox in terminal 1 redeploys the function automatically.

### Step 9: Have Kiro generate and wire up the function

Start a new chat session for clean context. Send:

```
I'm building a Bedrock Agent named MealRecommendationAgent that recommends meals from the user's food entries. The data lives in the FoodItem DynamoDB table managed by Amplify Gen 2 (defined in amplify/data/resource.ts). Each item has: name, category, quantity, unit, calories, protein, carbs, fat, expirationDate (ISO datetime, nullable), and addedAt (ISO datetime).

I want this agent fully working in this lab. Generate the following:

1. AGENT INSTRUCTIONS — a 5-8 sentence paragraph that names the agent, describes its role, lists the two tools by name (getRecentEntries and findExpiringSoon), and tells it: always call a tool to ground answers in real data; never invent food items; if no entries are found, say so plainly. Output inline in chat.

2. OPENAPI 3.0 SCHEMA — for an action group named FoodEntryTools with exactly two operations:
   - getRecentEntries(days?: number = 7) — food entries added in the last N days
   - findExpiringSoon(days?: number = 3) — food entries with expirationDate within the next N days
   Each operation needs a clear, distinctive `description` — the agent reads these to pick which tool to call. Save to amplify/functions/meal-recommendations/openapi.json.

3. FUNCTION RESOURCE — amplify/functions/meal-recommendations/resource.ts with a defineFunction declaration: name "meal-recommendations", entry "./handler.ts", timeoutSeconds 30.
  - In the defineFunction call, set resourceGroupName: "data" since the function reads from the data stack.

4. LAMBDA HANDLER — amplify/functions/meal-recommendations/handler.ts.
   - Use @aws-sdk/lib-dynamodb (DynamoDBDocumentClient + ScanCommand with FilterExpression).
   - Read the table name from process.env.FOOD_ITEM_TABLE_NAME.
   - Handle the Bedrock Agent event format (event.apiPath, event.parameters as array of {name, value, type}, event.httpMethod).
   - Return responses in the Bedrock Agent format with messageVersion, response, and sessionAttributes.
   - On any error, return a Bedrock Agent error response — do not throw.

5. BACKEND WIRING — edits to amplify/backend.ts:
   - Import the new function and add it to defineBackend.
   - After defineBackend, look up the FoodItem table via backend.data.resources.tables['FoodItem'].
   - Set the env var: backend.mealRecommendations.addEnvironment('FOOD_ITEM_TABLE_NAME', foodItemTable.tableName).
   - Grant read access: foodItemTable.grantReadData(backend.mealRecommendations.resources.lambda).
   - Add a Lambda resource-based policy permitting the Bedrock service to invoke the function:
     backend.mealRecommendations.resources.lambda.addPermission('AllowBedrockInvoke', { principal: new iam.ServicePrincipal('bedrock.amazonaws.com'), action: 'lambda:InvokeFunction' });
     (Import iam from 'aws-cdk-lib/aws-iam'.)

If @aws-sdk/client-dynamodb and @aws-sdk/lib-dynamodb aren't already in package.json, install them as the first task.

When done, reply with a recap listing every file created or edited and paste the agent instructions inline.
```

### Step 10: Review the artifacts and wait for the sandbox to redeploy

Open each generated file and confirm:

- `amplify/functions/meal-recommendations/openapi.json` — both operations are present, each with a non-trivial `description`. Vague or near-identical descriptions are the #1 cause of bad tool selection later.
- `amplify/functions/meal-recommendations/resource.ts` — exports a `defineFunction` named `mealRecommendations` (or similar — Kiro names it).
- `amplify/functions/meal-recommendations/handler.ts` — uses `@aws-sdk/lib-dynamodb`, reads `process.env.FOOD_ITEM_TABLE_NAME`, returns properly wrapped Bedrock Agent responses.
- `amplify/backend.ts` — function imported and registered, env var set, `grantReadData` called, and the Bedrock `addPermission` block present.

If anything's wrong, push back in chat ("the handler doesn't include the messageVersion field — please fix").

Now watch terminal 1 (the `amplify/sandbox` watcher). It detects the `amplify/` changes and starts a redeploy. The first time it deploys this function it'll take a minute or two — bundling, IAM policy creation, Lambda upload. Wait for the "Deployment completed" line before continuing.

### Step 11: Capture the deployed Lambda's ARN

You'll need the Lambda function name to wire the action group to the deployed function. From a third terminal (or split your existing one):

```bash
aws lambda list-functions \
  --query "Functions[?starts_with(FunctionName,'amplify-foodstarter')&&contains(FunctionName,'mealrecommendations')].FunctionName" \
  --output text

```

Copy the name — you'll paste it into the Bedrock Console in Step 13.

> Why this works: the sandbox is a real cloud deployment scoped to your account. The Lambda is fully provisioned with an IAM role, DynamoDB read access, and an env var pointing at the FoodItem table. Bedrock can invoke it because of the resource-based policy you added in `backend.ts`. Nothing about this is mocked or stubbed.

Copy the agent instructions Kiro printed in chat — you'll paste them into the AWS Console next.

---

## Part E: Configure the Agent in the Bedrock Console

### Step 12: Create the agent

Open the AWS Console → **Amazon Bedrock** → confirm the region matches your `aws login` region. Left navigation → **Agents** → **Create Agent**.

- **Name:** `MealRecommendationAgent`

Click **Create**.

Fill out the rest of the form:

- **Select model:** Untick "Bedrock Agents optimized" and select Antropic -> Claude Sonnet 4.5 -> Apply
- **Instructions for the Agent:** paste the instructions Kiro generated in Step 9.

Click **Save** at the top.

### Step 13: Add the action group pointing at your deployed Lambda

On the agent overview page, scroll to **Action groups** → **Add**.

- **Name:** `FoodEntryTools`
- **Action group type:** Define with API schemas
- **Lambda function:** **Use an existing Lambda function**, then paste the name you captured in Step 11.
- **API schema:** **Define with in-line schema editor**. Paste the contents of `amplify/functions/meal-recommendations/openapi.json`.

Click **Create**.

### Step 14: Prepare the agent

Back on the agent overview, click **Prepare** (top right). This compiles the agent's instructions and action group into a runnable form. You must Prepare again after every configuration change — the easiest step in the lab to forget.

> If **Prepare** is greyed out then try clicking **Save** again first.

> One sanity check before testing: open your deployed Lambda in the Lambda Console (search using your Lambda name) and confirm the **Configuration → Permissions → Resource-based policy statements** tab shows an entry granting `bedrock.amazonaws.com` permission to invoke. If it's missing, the `addPermission` block in `backend.ts` didn't make it through; instruct Kiro what the problem is and to fix that file and let the sandbox redeploy.

---

## Part F: Smoke-Test the Agent with Trace On

The module said: "Build with trace on. Always." This is where you see why.

### Step 15: First prompt and inspect the trace

In the agent overview, find the **Test agent** panel on the right. Make sure **Trace** is toggled on (it usually is by default in the console). Send:

```
What should I make for dinner tonight based on what I have in the food tracker?
```

Watch the trace panel as the agent responds. You should see, in order:

1. The agent's reasoning step ("the user is asking about meal ideas; I should check what's currently tracked").
2. A tool call — typically `getRecentEntries` for this prompt.
3. The tool response — your deployed Lambda returns real food items from the FoodItem table (the 30 items the Amplify sandbox seeded).
4. The agent reasoning over those items ("I see chicken, rice, and broccoli all added recently — I can suggest a stir-fry").
5. The final response — concrete suggestions that name actual items from your inventory.

The two signals that prove the lab worked: the trace shows the **right tool** picked (driven by the OpenAPI `description`), and the response **names real items** from your DynamoDB table (driven by the Lambda actually executing). If you've ever debugged a "the agent gives generic answers" issue in production, those two signals are usually what you're looking for in trace.

### Step 16: Second prompt — different intent, different tool

Send a different prompt designed to push the agent toward the *other* tool:

```
What's expiring soon that I should use this week?
```

Watch the trace. The agent should pick `findExpiringSoon` this time, not `getRecentEntries`. The Lambda runs a Scan with a different FilterExpression (against `expirationDate` instead of `addedAt`), and the response calls out specific items by name — "your yogurt expires in 2 days," that kind of thing.

If the agent picks the wrong tool for either prompt, the OpenAPI descriptions are too similar or too vague. Fix `openapi.json`, re-upload the schema in the action group, and re-Prepare the agent.

> What this proves: the agent reaches Bedrock, the OpenAPI descriptions correctly map natural-language intent to the right tool, your deployed Lambda has DynamoDB read access (granted via `grantReadData`) and the right env var (set via `addEnvironment`), and Bedrock can invoke it (allowed by the resource-based policy). End-to-end. No mocks.

---

## Validation Checklist

- [ ] `.kiro/steering/security.md` exists with `inclusion: always` frontmatter and an allowlist section
- [ ] `.kiro/hooks/security-scan.kiro.hook` exists; uses `fileEdited` trigger and `askAgent` action
- [ ] Saving a file with `AKIAIOSFODNN7EXAMPLE` does NOT trigger a finding; saving a fabricated `AKIA…` key DOES
- [ ] `.kiro/hooks/format-on-save.kiro.hook` exists; uses `fileEdited` trigger and `runCommand` action
- [ ] Saving a deliberately ugly `.ts` file auto-reformats it via Biome
- [ ] `amplify/functions/meal-recommendations/{resource.ts, handler.ts, openapi.json}` all exist
- [ ] `amplify/backend.ts` registers the function, sets `FOOD_ITEM_TABLE_NAME`, calls `grantReadData`, and adds the Bedrock `addPermission` block
- [ ] Sandbox redeploy succeeded; `aws lambda list-functions` returns a `meal-recommendations` ARN
- [ ] `MealRecommendationAgent` exists in the Bedrock Console with a `FoodEntryTools` action group pointing at the deployed Lambda's ARN, and the agent has been Prepared
- [ ] Trace panel shows the agent picking `getRecentEntries` for a meal-ideas prompt and `findExpiringSoon` for an expiration prompt
- [ ] Final responses name **specific items** from the FoodItem table (not generic suggestions)

---

## Troubleshooting

**Hook doesn't fire on save.** Open the Hooks panel and confirm the hook's toggle is on. Confirm the saved file matches the hook's pattern globs (a `.tsx` file won't match a hook scoped to `**/*.ts` only). Check **View → Output → Kiro** for hook execution logs.

**Security hook flags the EXAMPLE value as a real credential.** The `security.md` steering file isn't loading. Confirm the frontmatter is exactly `inclusion: always` (not `inclusion: Always`, not missing the dashes). Re-save the steering file and re-trigger the hook by saving a test file again.

**Bedrock Console says "Action group not configured" on test.** You added or modified the action group but didn't re-Prepare. Click **Prepare** at the top of the agent overview after every change.

**Trace shows tool call failed with an `AccessDeniedException` from Lambda.** Bedrock can't invoke your function. Open the Lambda Console for `meal-recommendations` → **Configuration → Permissions → Resource-based policy statements**. If `bedrock.amazonaws.com` isn't listed there, the `addPermission` block in `backend.ts` didn't apply. Check the file, re-save it, and let the sandbox redeploy.

**Trace shows tool returned an error mentioning the table name.** The handler's reading `process.env.FOOD_ITEM_TABLE_NAME` but the env var isn't set on the deployed function. Confirm `backend.ts` calls `addEnvironment('FOOD_ITEM_TABLE_NAME', foodItemTable.tableName)` — typos in the env var name on either side are the usual cause.

**Trace shows tool returned successfully but with zero items.** The seeded items might have `addedAt` timestamps outside your default 7-day window. Try the prompt with a longer window ("what have I tracked in the last 30 days?") and confirm items show up.

**Agent picks neither tool, just answers from training data.** The OpenAPI operation descriptions are too vague. Open `openapi.json`, write more concrete descriptions ("Returns food items added by the user in the last N days, including their name, category, and expiration date"), re-upload the schema, re-Prepare.

**Test panel returns a permissions error.** Your IAM user is missing `bedrock:InvokeAgent`. Your instructor will help.

---

## Summary

You did three distinct kinds of work here. First, you turned the foundational steering files into a working security policy by adding `security.md` with rules and an allowlist — the file Kiro now loads on every interaction. Second, you built two hooks side-by-side: an Ask Kiro hook for context-sensitive credential detection (which leans on the steering allowlist to suppress false positives) and a Run Command hook for deterministic Biome formatting. Third, you generated a Bedrock Agent's instructions, OpenAPI schema, function definition, and Lambda handler with Kiro; deployed the Lambda through the Amplify sandbox with proper DynamoDB access and a Bedrock-invocable resource policy; configured the agent in the Console; and watched real, grounded tool calls flow through the trace panel.

The two takeaways the module was building toward:

- **Hooks and steering work together.** The security hook only does the right thing because the steering file tells it what counts and what to ignore. Either piece in isolation is weaker than both together. Both are markdown/JSON files that ship with your repo — every teammate gets the same enforcement automatically.
- **Bedrock Agents pick tools based on what you tell them about those tools.** The `description` fields in your OpenAPI schema are the agent's only signal for tool selection. Treat them as code, not as marketing copy.

---

## Next Steps

In Lab 4 you'll move from "agent works in the Bedrock Console" to "agent works in the actual app": building a chat panel into the food-tracker page that calls `InvokeAgent` against the `MealRecommendationAgent` you just deployed, threading session IDs correctly so conversations stay coherent within a single user's chat, and rendering the structured suggestions in the UI. The trace plumbing you set up in Part F carries forward — same agent, same Lambda, same tools, just driven by your app's UI instead of the Console test panel.

---

## Additional Resources

- [Kiro Hooks documentation](https://kiro.dev/docs/hooks)
- [Kiro Steering documentation](https://kiro.dev/docs/steering)
- [Amazon Bedrock Agents](https://docs.aws.amazon.com/bedrock/latest/userguide/agents.html)
- [AWS Secrets Manager vs Parameter Store](https://docs.aws.amazon.com/systems-manager/latest/userguide/integration-ps-secretsmanager.html)
