# Lab 3: Hooks, Steering, and a Meal Recommendation Agent

**Objective:** This lab covers two distinct kinds of automation. First, workflow automation inside Kiro: you refine your steering files with a security policy and build two hooks, one Ask Kiro hook (AI judgment: "is this a real credential?") and one Run Command hook (deterministic: "format this file"), experiencing both action types and how hooks and steering work together. Second, AI automation on AWS: you study the working Amazon Bedrock Agent that ships with the starter project, reading each of its building blocks (the tool Lambda, the agent instructions, the OpenAPI schema that drives tool selection, and the CDK code that deploys it), reviewing the deployed result in the Bedrock Console, and smoke-testing it with the trace panel open.

**Time:** 60 minutes<br>
**Course repo:** https://github.com/AWSClassroom-com/kiro_on_aws

---

## Prerequisites

### 1. Lab 2 complete

The weekly nutrition summary feature works end-to-end. Foundational steering files (`product.md`, `tech.md`, `structure.md`) exist in `.kiro/steering/` from Lab 1.

### 2. Sandbox + dev server running

From `kiro-project/food-tracker`, both terminals are still up: `npm run amplify:sandbox` (terminal 1) and `npm run dev` (terminal 2). The food-tracker app is reachable at `http://localhost:3000`.

### 3. AWS CLI session valid

```bash
aws sts get-caller-identity --no-cli-pager
```

If it fails with an expired-token error, rerun `aws login --region <your-region>` from Lab 1.

### 4. Bedrock Claude Sonnet 4.5 access

You verified you can invoke Claude in Lab 2's smoke test. Confirm the inference profile the agent will use is still active in your region:

```bash
aws bedrock list-inference-profiles --query "inferenceProfileSummaries[?inferenceProfileId=='global.anthropic.claude-sonnet-4-5-20250929-v1:0'].[inferenceProfileId,status]" --output table --no-cli-pager
```

You should see the profile with status `ACTIVE`. If the result is empty, model access has not been enabled in this account/region; ask your instructor.

---

## Part A: Refine Steering with a Security File

Lab 1 created the three foundational steering files. Now you add a fourth, `security.md`, that captures rules the security hook in Part B will reference, including an allowlist of strings that look like credentials but are not.

### Step 1: Open the Steering panel

Click the **Kiro icon (ghost)** in the activity bar. Find the Steering section. You should see your three foundational files.

### Step 2: Add a security steering file

In the Steering section, click the **plus** button to add a new file. Select **food-tracker agent steering**. Name it `security`.

Once the file has been created, replace the default contents with:

```markdown
---
inclusion: always
---

# Security Rules

## What counts as a credential in this codebase

Treat any of the following as a hardcoded credential and flag it:

- AWS access key IDs: strings matching `AKIA[A-Z0-9]{16}` (long-term IAM user keys) or `ASIA[A-Z0-9]{16}` (temporary STS keys). Both prefixes are equally important; ASIA keys are now the majority in modern AWS deployments.
- Private keys: anything containing `-----BEGIN ... PRIVATE KEY-----` (RSA, EC, OpenSSH, PGP variants).
- Database connection strings with embedded credentials: `postgres://user:password@...`, `mongodb://...`, `mysql://...`.
- GitHub tokens: strings beginning with `ghp_`, `gho_`, `ghu_`, `ghs_`, or `ghr_`.
- Plain password assignments where the value is a real secret: `password = "..."`, `passwd: ...`, `pwd: ...`.

## Where credentials must NOT live

Source files (`.ts`, `.tsx`, `.js`, `.jsx`, `.json`, `.yaml`, `.yml`, `.env*`). Anything under `amplify/`, `src/`, or `scripts/`.

## Where credentials SHOULD live

- For service-to-service calls inside AWS: IAM roles. The default credential chain picks them up; no static keys in code.
- For configuration: AWS Systems Manager Parameter Store.
- For credentials that need rotation: AWS Secrets Manager.

## Allowlist: known-safe strings that may match credential patterns

These are documentation/test values and must NOT be flagged as real credentials:

- `AKIAIOSFODNN7EXAMPLE`: AWS's reserved example access key ID. Cannot be activated; safe to commit anywhere.
- `wJalrXUtnFEMI/K7MDENG/bPxRfiCYEXAMPLEKEY`: AWS's reserved example secret access key.
- Any string ending in the literal word `EXAMPLE` (case-sensitive).
- Strings inside files under `__tests__/` or matching `*.test.ts` / `*.spec.ts`: test fixtures intentionally use placeholder credentials.
```

Save the file.

> Note: the frontmatter `inclusion: always` means Kiro loads this file into context on every interaction, including when the security hook in Part B fires. The hook says "scan now"; this file tells it what counts and what does not.

> **Checkpoint. Validate before continuing:**
> `.kiro/steering/security.md` exists and starts with the `inclusion: always` frontmatter.

---

## Part B: A File-Save Security Hook (Ask Kiro action)

Kiro hooks have two action types:

| Action type | What it does | Cost | Use when |
| --- | --- | --- | --- |
| Ask Kiro (`askAgent`) | Sends a natural-language prompt to the agent | Slow, uses tokens | The question requires judgment ("is this a real secret or a test fixture?") |
| Run Command (`runCommand`) | Runs a shell command | Fast, free, deterministic | There is a single right answer ("does this file pass the formatter?") |

This part builds an Ask Kiro hook. Part C builds a Run Command hook, so you use both.

### Step 3: Open the Hooks panel

In the Kiro pane (ghost icon in the activity bar), find Agent Hooks. Click the **plus** button, then **Ask Kiro to create a hook**.

### Step 4: Describe the hook

In the chat session that opens, paste this prompt and press ENTER:

```
Create a hook named "security-scan" that fires when a TypeScript, JavaScript, JSON, YAML, or .env file is saved. Trigger type: fileEdited. File patterns: **/*.ts, **/*.tsx, **/*.js, **/*.jsx, **/*.json, **/*.yaml, **/*.yml, **/.env, **/.env.*. Exclude node_modules, dist, build, and amplify_outputs.json.

Action type: askAgent (Ask Kiro). The prompt to the agent should:
- Ask it to read the saved file and identify any hardcoded credentials, applying the rules in the security.md steering file.
- Tell it to use file path and surrounding context to distinguish real credentials from test fixtures, documentation examples, and the allowlisted strings in security.md.
- For each finding, report: file path, line number, what kind of credential, and the recommended fix (IAM role, Parameter Store, or Secrets Manager, per security.md).
- If nothing is found, say so briefly so the developer knows the scan ran.

Save the hook to .kiro/hooks/security-scan.kiro.hook.
```

Kiro generates a JSON hook file. Review it before saving:

- The `when` block uses `type: fileEdited` and the patterns listed above.
- The `then` block uses `type: askAgent` (not `runCommand`).
- The prompt references the steering file and asks for context-based judgment.

If anything is off, ask Kiro to fix it in chat (for example: "the include patterns are missing .env files, please add them"). Save when correct.

### Step 5: Test the hook with two strings, one safe and one not

In the Explorer (files icon in the activity bar), create a new file in the `src/` directory named `scratch-credentials.ts`, and paste:

```typescript
// Two strings that match the AWS access key pattern.
// One is the documented EXAMPLE value (allowlisted in security.md).
// The other is fabricated but pattern-real.
const exampleKey = "AKIAIOSFODNN7EXAMPLE";
const fabricatedKey = "AKIA2QHFZ6PXVMK3WYJN";
```

Save the file. The hook fires; watch the chat panel.

**Expected result:** the agent flags `AKIA2QHFZ6PXVMK3WYJN` as a real-looking AWS access key ID, and explicitly identifies `AKIAIOSFODNN7EXAMPLE` as the documented test value from the allowlist (and does not flag it). It suggests IAM roles or Secrets Manager as the right home for real credentials. Exact wording varies between runs; judge the outcome, not the phrasing.

### Step 6: Clean up

Delete `src/scratch-credentials.ts`.

> **Checkpoint. Validate before continuing:**
> 1. The hook file exists at `.kiro/hooks/security-scan.kiro.hook` with the `fileEdited` trigger and `askAgent` action.
> 2. The test flagged exactly one of the two keys.
> 3. The scratch file is deleted.

---

## Part C: A File-Save Format Hook (Run Command action)

Now the deterministic counterpart: a hook that runs Biome's formatter on save. No model call, no tokens, just a shell command.

### Step 7: Create the format hook

In the Kiro pane > Agent Hooks > plus button > "Ask Kiro to create a hook":

```
Create a hook named "format-on-save" that fires when a TypeScript or TypeScript-React file is saved. Trigger type: fileEdited. File patterns: **/*.ts, **/*.tsx. Exclude node_modules, dist, src/routeTree.gen.ts, and amplify_outputs.json.

Action type: runCommand. Command: npx biome format --write src/ amplify/ scripts/

Save to .kiro/hooks/format-on-save.kiro.hook.
```

Review before saving: the generated file uses `type: runCommand` (not `askAgent`) and the command is the exact `npx biome format --write src/ amplify/ scripts/` line above. Save.

### Step 8: Test it

Create a scratch file `src/scratch-format.ts` (a scratch file keeps test junk out of your real code) and paste this deliberately ugly line:

```typescript
export const   foo  =      'bar'   ;
```

Save. The Run Command hook fires Biome silently. Within a moment the line reformats to clean spacing and double quotes: `export const foo = "bar";`

Then delete `src/scratch-format.ts`.

> Note: both hook files now live under `.kiro/hooks/` and travel with the repo. A teammate who clones the project gets both hooks running automatically.

> **Checkpoint. Validate before continuing:**
> 1. `.kiro/hooks/format-on-save.kiro.hook` exists with the `runCommand` action.
> 2. The ugly line auto-reformatted on save.
> 3. The scratch file is deleted.

---

## Part D: Study the Prebuilt Agent

The starter project ships a complete, working Bedrock Agent; it has been deployed in your sandbox since your first deploy in Lab 1. This is not an agent-authoring course, so you do not build it. Instead you read it end to end, because these four building blocks are what you would design in any real agent project, and the trace panel in Part F shows them working together.

### Step 9: Read the agent's building blocks

Open each file and find the things listed:

| File | What it is | What to notice |
| --- | --- | --- |
| `amplify/functions/meal-recommendations/handler.ts` | The Lambda behind both tools | Two operations keyed on `event.apiPath`; DynamoDB Scans with different FilterExpressions (`addedAt` vs `expirationDate`); every response echoes `actionGroup`, `apiPath`, and `httpMethod` from the incoming event, because Bedrock rejects mismatches |
| `amplify/functions/meal-recommendations/agent-instructions.md` | The agent's system prompt | Names both tools, orders the agent to always ground answers in tool results, forbids inventing food items, and says what to do when a tool returns nothing |
| `amplify/functions/meal-recommendations/openapi.json` | The action group schema | Each operation's `description` says WHEN to use it, not just what it returns; these descriptions are the agent's only signal for choosing a tool |
| `amplify/custom/meal-agent.ts` | The deployment code (CDK) | Creates the agent's service role, the agent itself (reading the two files above), the FoodEntryTools action group, a `v1` alias, and the permission letting Bedrock invoke the Lambda |
| `amplify/backend.ts` | The wiring | Registers the function, passes the table name as an env var, grants table read access, and instantiates `MealAgent` as the `mealAgent` variable (Lab 4 uses it) |

> **Checkpoint. Validate before continuing:**
> This command prints exactly one agent name starting with MealRecommendationAgent:
>
> ```bash
> aws bedrock-agent list-agents --query "agentSummaries[?starts_with(agentName,'MealRecommendationAgent')].agentName" --output text --no-cli-pager
> ```
>
> If it prints nothing, check terminal 1 for a failed deployment and ask your instructor.

---

## Part E: Review the Deployed Agent in the Bedrock Console

### Step 10: Walk through the deployed agent

Open the AWS Console > Amazon Bedrock. Confirm the region (top-right selector) matches your `aws login` region. Left navigation > Agents. Click the agent whose name starts with `MealRecommendationAgent-`.

Match each console section to the file it came from:

1. Instructions for the Agent: the text of `agent-instructions.md`.
2. The model: Claude Sonnet 4.5, served through the global inference profile.
3. Action groups > `FoodEntryTools`: open it and confirm the schema is your `openapi.json` and the Lambda is `meal-recommendations`.
4. Aliases: a `v1` alias exists.

> Note: if you change `agent-instructions.md` or `openapi.json` and save, the sandbox redeploys the agent with the new content automatically. The console is a read-only window onto what the code deployed; there is nothing to configure here.

---

## Part F: Smoke-Test the Agent with Trace On

### Step 11: First prompt, inspect the trace

On the agent overview, find the Test agent panel on the right. Expand the panel so you can see the Trace. Enter this prompt and press ENTER:

```
What should I make for dinner tonight based on what I have in the food tracker?
```

Watch the trace as the agent responds. You should see, in order:

1. The agent's reasoning step (for example: "the user is asking about meal ideas; I should check what's currently tracked").
2. A tool call. Typically `getRecentEntries` for this prompt; calling both tools is also valid since the instructions tell the agent to consider expiring items.
3. The tool response: the Lambda returns real food items from the FoodItem table (the 30 items you seeded in Lab 1).
4. The agent reasoning over those items.
5. The final response: concrete suggestions that name actual items from your inventory.

The two signals that prove it worked: the trace shows a sensible tool picked (driven by the OpenAPI descriptions you read in Step 9), and the response names real items from your DynamoDB table (driven by the Lambda actually executing).

### Step 12: Second prompt, different intent, different tool

Send a prompt designed to push the agent toward the other tool:

```
What's expiring soon that I should use this week?
```

**Expected result:** the trace shows `findExpiringSoon` this time. The Lambda runs a Scan with a different FilterExpression (against `expirationDate` instead of `addedAt`), and the response calls out specific items by name, for example "your yogurt expires in 2 days".

> Note: This is the connection to take away. The tool the agent picks is driven entirely by the `description` fields you read in `openapi.json`. If you ever build an agent whose tool selection misbehaves, those descriptions are the first place to look.

---

## Lab 3 Outcomes

Lab 4 depends on all of these. Confirm them before moving on:

- [ ] The agent (name starting with `MealRecommendationAgent-`) is deployed, with the `FoodEntryTools` action group and a `v1` alias
- [ ] The trace showed tool calls returning real FoodItem data for both test prompts
- [ ] Both terminals still running: the sandbox (terminal 1) and the dev server (terminal 2)
- [ ] AWS CLI session valid (`aws sts get-caller-identity` succeeds)

---

## Summary

You did three distinct kinds of work. First, you turned the foundational steering files into a working security policy by adding `security.md` with rules and an allowlist, a file Kiro now loads on every interaction. Second, you built two hooks side by side: an Ask Kiro hook for context-sensitive credential detection (which leans on the steering allowlist to suppress false positives) and a Run Command hook for deterministic Biome formatting. Third, you studied a complete working Bedrock Agent from the inside out: the Lambda that serves its tools, the instructions that govern it, the OpenAPI descriptions that drive its tool selection, and the CDK construct that deploys all of it, then watched real, grounded tool calls flow through the trace panel. Infrastructure from code, reviewed in the console: the same division of labor you would use in production.

Two takeaways:

- Hooks and steering work together. The security hook only does the right thing because the steering file tells it what counts and what to ignore. Both ship with the repo, so every teammate gets the same enforcement automatically.
- Bedrock Agents pick tools based on what you tell them about those tools. The `description` fields in your OpenAPI schema are the agent's only signal for tool selection. Treat them as code, not marketing copy.
