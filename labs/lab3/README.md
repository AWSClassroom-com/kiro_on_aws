# Lab 3: Hooks, Steering, and a Meal Recommendation Agent

**Objective:** This lab covers two distinct kinds of automation. First, workflow automation inside Kiro: you refine your steering files with a security policy and build two hooks, one Ask Kiro hook (AI judgment: "is this a real credential?") and one Run Command hook (deterministic: "format this file"), experiencing both action types and how hooks and steering work together. Second, AI automation on AWS: you author the behaviour of the agent that ships with the starter project, which runs on Amazon Bedrock AgentCore. The agent loop and the tool Lambda are written for you; you write the two files that decide whether the agent is any good, its instructions and its tool descriptions. Then you deploy them, confirm what reached AWS, invoke the agent and read its own logs to see which tool it chose, and deliberately break tool selection to prove what drives it.

**Time:** 60 minutes<br>
**Course repo:** https://github.com/AWSClassroom-com/kiro_on_aws

---

## Prerequisites

> [!NOTE]
> ℹ️ **Parts A, B and C need only Kiro and this project open.** They make no AWS calls. If you fell behind in Lab 2, you can still do them.
>
> Prerequisites 2, 3 and 4 below are required only for Parts D, E and F, which use the deployed agent.

### 1. Lab 2 complete

The weekly nutrition summary feature works end-to-end. Foundational steering files (`product.md`, `tech.md`, `structure.md`) exist in `.kiro/steering/` from Lab 1.

### 2. Sandbox + dev server running

From `kiro-project/food-tracker`, both terminals are still up: `npm run amplify:sandbox -- --identifier <your-sandbox-name>` in the `sandbox` terminal and `npm run dev` in the `dev` terminal. If the tabs are not named, right click each one and choose **Rename**; Kiro renames tabs after the running process, so neither position nor label can be relied on. The food-tracker app is reachable at `http://localhost:3000`.

Use the same sandbox name you chose in Lab 1 Step 7.

### 3. AWS CLI session valid

```bash
aws sts get-caller-identity --no-cli-pager
```

If it fails with an expired-token error, rerun `aws login --region <your-region>` from Lab 1.

### 4. Bedrock Claude Sonnet 4.6 access

You verified you can invoke Claude in Lab 2's smoke test. Confirm the inference profile the agent will use is still active in your region:

```bash
aws bedrock list-inference-profiles --query "inferenceProfileSummaries[?inferenceProfileId=='global.anthropic.claude-sonnet-4-6'].[inferenceProfileId,status]" --output table --no-cli-pager
```

You should see the profile with status `ACTIVE`. If the result is empty, model access has not been enabled in this account/region; ask your instructor.

### 5. Chat model set to Haiku 4.5

> [!WARNING]
> ⚠️ **Confirm the chat model is Haiku 4.5, not Auto, before building the hooks.**
>
> In the chat panel (Cmd+L / CTRL+L), check the model selector at the bottom of the input box. If it reads **Auto**, change it to **Haiku 4.5**.
>
> This matters more in this lab than anywhere else. The security hook you build in Part B is an **Ask Kiro** hook, which sends a prompt to the agent on **every file save** for the rest of the course. On Auto, ordinary editing burns credits in the background without you noticing.

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

## Part B: A Security Hook on Agent Writes (Ask Kiro action)

Kiro hooks have two action types:

| Action type | What it does | Cost | Use when |
| --- | --- | --- | --- |
| Ask Kiro | Sends a natural-language prompt to the agent | Slow, uses tokens | The question requires judgment ("is this a real secret or a test fixture?") |
| Run Command | Runs a shell command | Fast, free, deterministic | There is a single right answer ("does this file pass the formatter?") |

This part builds an Ask Kiro hook. Part C builds a Run Command hook, so you use both.

One thing to know before you start, because it shapes how both hooks are tested: **file triggers fire on files Kiro writes, not on files you save yourself.** Kiro's documentation is explicit that manually saving, creating or deleting a file in the editor does not fire `PostFileSave`, `PostFileCreate` or `PostFileDelete`. Hooks guard the agent's output, which is exactly what you want in Labs 2 and 4 where Kiro writes most of the backend code.

### Step 3: Open the Hooks panel

In the Kiro pane (ghost icon in the activity bar), find Agent Hooks. Click the **plus** button, then **Ask Kiro to create a hook**.

### Step 4: Describe the hook

In the chat session that opens, paste this prompt and press ENTER:

```
Create a hook named "security-scan" that fires after Kiro saves or edits a TypeScript, JavaScript, JSON, YAML, or .env file. Use the PostFileSave trigger. Match these files: **/*.ts, **/*.tsx, **/*.js, **/*.jsx, **/*.json, **/*.yaml, **/*.yml, **/.env, **/.env.*. Exclude node_modules, dist, build, and amplify_outputs.json. Make sure the hook is enabled.

The hook must run an agent prompt rather than a shell command. The prompt to the agent should:
- Ask it to read the saved file and identify any hardcoded credentials, applying the rules in the security.md steering file.
- Tell it to use file path and surrounding context to distinguish real credentials from test fixtures, documentation examples, and the allowlisted strings in security.md.
- For each finding, report: file path, line number, what kind of credential, and the recommended fix (IAM role, Parameter Store, or Secrets Manager, per security.md).
- If nothing is found, say so briefly so the developer knows the scan ran.

Save the hook to .kiro/hooks/security-scan.kiro.hook.
```

Kiro generates a JSON hook file under `.kiro/hooks/`. Review it before saving.

> [!NOTE]
> ℹ️ **Kiro writes hooks in more than one format, and the filename varies.** You may get `security-scan.json` or `security-scan.kiro.hook`, and the keys inside may be either of these shapes:
>
> | Current | Legacy |
> | --- | --- |
> | `"trigger": "PostFileSave"` | `"when": { "type": "fileEdited" }` |
> | `"action": { "type": "agent" }` | `"then": { "type": "askAgent" }` |
> | a single regex `matcher` | a `patterns` array |
>
> **Use the current form.** `fileEdited` is not a valid trigger in this build; the valid file triggers are `PostFileSave`, `PostFileCreate` and `PostFileDelete`. If Kiro produces the legacy shape, ask it to rewrite the hook using `PostFileSave`.
>
> Check the behaviour rather than the exact keys: it fires on save, and it prompts the agent.

Whichever shape you get, confirm three things:

- It fires **when a file is saved**, not on a manual trigger or a chat prompt.
- It sends a **prompt to the agent**, rather than running a shell command. Part C builds the shell-command kind.
- The prompt references `security.md` and asks the agent to use context to tell real credentials from test values.

If anything is off, ask Kiro to fix it in chat (for example: "the hook should also cover .env files, please add them"). Save when correct.

> [!WARNING]
> ⚠️ **Restart Kiro after saving the hook.** Kiro will tell you the hook "will be active on your next session start". It means it. A newly created hook does not fire until you reload.
>
> Use the command palette (Cmd+SHIFT+P / CTRL+SHIFT+P) and run **Developer: Reload Window**.
>
> Skipping this is the most common reason Step 5 appears to do nothing. Your sandbox and dev server terminals survive the reload. Re-select **Haiku 4.5** afterwards, because the model choice is per window.

### Step 5: Test the hook with two strings, one safe and one not

> [!WARNING]
> ⚠️ **File hooks fire on files Kiro writes, not on files you save yourself.**
>
> This is the single most important thing to understand about hooks, and it is easy to get wrong. From Kiro's documentation:
>
> > File triggers respond only to changes made by the agent. Saving, creating, or deleting a file manually in the editor does not trigger `PostFileSave`, `PostFileCreate`, or `PostFileDelete`.
>
> So creating this file by hand in the Explorer and saving it will do nothing, no matter how correct your hook is. You ask Kiro to write the file instead.
>
> That is also the realistic use. In Labs 2 and 4 Kiro writes backend code for you, and a credential scan on what the agent just wrote is exactly the guard you want.

Open the chat panel (Cmd+L / CTRL+L) and send:

```
Create a file src/scratch-credentials.ts with exactly this content:

// Two strings that match the AWS access key pattern.
// One is the documented EXAMPLE value (allowlisted in security.md).
// The other is fabricated, but pattern-real.
const exampleKey = "AKIAIOSFODNN7EXAMPLE";
const fabricatedKey = "AKIA2QHFAKIA2QHFZ6PXVMK3WYJN";
```

Accept the change. As soon as Kiro writes the file, the hook fires. Watch the chat panel for a block headed **Ask Kiro Hook** with `security-scan` beneath it.

**Expected result:** the agent flags `fabricatedKey` as a credential that should not be in source, and explicitly identifies `AKIAIOSFODNN7EXAMPLE` as the documented test value from the allowlist in `security.md`, and does not flag it. It suggests IAM roles or Secrets Manager as the right home for real credentials. Exact wording varies between runs; judge the outcome, not the phrasing.

This is the payoff of Parts A and B together. The hook says "scan this"; the steering file decides what counts. Neither would produce this result alone: without `security.md` the agent would flag both keys, and without the hook nothing would scan at all.

### Step 6: Clean up

Delete `src/scratch-credentials.ts`. Deleting it by hand is fine; file hooks ignore manual changes, so this will not trigger another scan.

> **Checkpoint. Validate before continuing:**
> 1. A hook file exists under `.kiro/hooks/`. The filename may be `security-scan.json` or `security-scan.kiro.hook`. It uses the `PostFileSave` trigger and sends a prompt to the agent.
> 2. The scan ran on its own after Kiro wrote the file, and flagged exactly one of the two keys: the fabricated one, not the EXAMPLE one.
> 3. The scratch file is deleted.

---

## Part C: A Format Hook on Agent Writes (Run Command action)

Now the deterministic counterpart: a hook that runs Biome's formatter on save. No model call, no tokens, just a shell command.

### Step 7: Create the format hook

This time use the other creation path. In the Kiro pane > Agent Hooks > plus button, the menu offers two options:

| Option | What it does |
| --- | --- |
| Manually create a hook | Fills in a form. No model call, no credits |
| Ask Kiro to create a hook | Describes it in natural language. Spends credits |

You used **Ask Kiro** in Part B, where the hook needed judgment about what counts as a credential. This hook has a fixed trigger, two file patterns and one shell command, so there is nothing for a model to reason about. Choose **Manually create a hook**.

Fill in the form:

- **Name**: `format-on-save`
- **Trigger**: under **FILE HOOKS**, choose **File Saved**. The form groups triggers as File Hooks (File Created, File Saved, File Deleted), Tool Hooks (Pre Tool Use, Post Tool Use), and Prompt & Lifecycle Hooks (Prompt Submit, Session Start, Agent Stop). **File Saved** is written as `PostFileSave` in the JSON, and like every File Hook it fires on files Kiro writes, not on your own saves.
- **File path pattern**: `\.(ts|tsx)$`

  This field takes a **regular expression**, not glob patterns. Entering `**/*.ts, **/*.tsx` produces `Matcher must be a valid regular expression`. The expression above matches any path ending in `.ts` or `.tsx`. Leaving the field blank matches every file.
- **Action type**: the run-a-shell-command option
- **Command**: `npx biome format --write src/ amplify/ scripts/`

Save it. Kiro writes it under `.kiro/hooks/`; the exact filename and the field names in the form may differ slightly by version, which is fine as long as it fires on save and runs a command.

> [!WARNING]
> ⚠️ **Reload Kiro before testing.** As in Part B, a newly created hook does not fire until the window reloads. Command palette (Cmd+SHIFT+P / CTRL+SHIFT+P), then **Developer: Reload Window**. Re-select **Haiku 4.5** afterwards.

Building it by hand also shows you the JSON structure behind every hook, including the one Kiro generated for you in Part B. Open both files under `.kiro/hooks/` and compare them. They may not even use the same keys, because Kiro writes hooks in more than one format.

### Step 8: Test it

This test has four moves, and the third one is the point. You will make a mess by hand, watch nothing happen, then have Kiro touch the file and watch the mess get cleaned up.

**1. Have Kiro create the file, correctly formatted.**

In chat:

```
Create a new file /src/scratch-format.ts with this exact file content:

export const foo = "bar";

Save the file.
```

Accept the change. If Kiro asks permission to run a command, click **Run**, not **Trust**.

**2. Now break the formatting yourself.**

Open `src/scratch-format.ts` in the editor and edit it by hand so the line is badly spaced, with single quotes and a space before the semicolon:

```
export const   foo  =      'bar'   ;
```

Save it.

**Nothing happens.** The file stays exactly as you typed it.

That is not a failure. You are a person, and file hooks only watch the agent. This is the rule from Part B, and now you have seen it rather than been told it: your own saves are invisible to the hook, however badly formatted the file is.

**3. Ask Kiro to touch the same file.**

In chat:

```
Add a comment at the top of src/scratch-format.ts saying that this is a temporary test file.
```

Accept the change.

**4. Watch the formatting revert.**

Open the file again. Kiro added your comment, and the line beneath it has been repaired:

```
export const foo = "bar";
```

You did not fix it. Kiro did not fix it either; it only added a comment. **Biome fixed it**, because Kiro's write fired the hook, and the hook ran the formatter across the whole file.

That is the difference between the two hook action types you have now built. Part B sent a prompt to a model and got back a judgment that needed reading. This one ran a shell command and produced a deterministic result, with no tokens spent and no model involved.

Then delete `src/scratch-format.ts`.

> Note: both hook files now live under `.kiro/hooks/` and travel with the repo. A teammate who clones the project gets both hooks running automatically.

> **Checkpoint. Validate before continuing:**
> 1. A `format-on-save` hook file exists under `.kiro/hooks/` and runs a shell command rather than prompting the agent.
> 2. The ugly line auto-reformatted on save.
> 3. The scratch file is deleted.

---

## Part D: Author the Agent's Behaviour

The starter project ships a working Amazon Bedrock Agent, deployed in your sandbox since Lab 1. The Lambda behind its tools is written for you, because plumbing a Lambda to DynamoDB is not what makes an agent good or bad.

What makes an agent good or bad is what you write in two files: the instructions that govern it, and the tool descriptions it uses to decide what to call. In this part you write both, deploy them, and watch the agent's behaviour change.

### Step 9: Read the parts you are not writing

Open these three files and find the things listed. You need to understand them to write the other two, but you will not change them.

| File | What it is | What to notice |
| --- | --- | --- |
| `amplify/functions/meal-recommendations/handler.ts` | The Lambda behind both tools | Two operations keyed on `event.apiPath`; DynamoDB Scans with different FilterExpressions (`addedAt` vs `expirationDate`); every response echoes `actionGroup`, `apiPath`, and `httpMethod` from the incoming event, which is the contract the agent calls it with |
| `amplify/custom/meal-agent.ts` | The deployment code (CDK) | Creates the agent's execution role and the AgentCore Runtime that hosts it, bundles `agent/app.ts` with esbuild, and copies `agent-instructions.md` and `openapi.json` into the deployment package. Editing either of those two files redeploys the agent |
| `amplify/custom/agent/app.ts` | The agent itself | The tool-calling loop. It reads your instructions as the system prompt, turns each `openapi.json` operation into a tool, asks the model what to do, calls the tools Lambda, and feeds the results back. Under 200 lines, and worth reading once: this is what an agent actually is |
| `amplify/backend.ts` | The wiring | Registers the function, passes the table name as an env var, grants table read access, and instantiates `MealAgent` |

So the agent has two tools available. Whether it calls the right one, and whether it tells the truth about your food, is decided entirely by the two files you are about to write.

### Step 10: Write the agent's instructions

Open `amplify/functions/meal-recommendations/agent-instructions.md`. Read what is there, then **replace it with your own version**.

**Two things are fixed and must appear exactly, because they are facts about the system rather than choices:**

| Tool name | What it returns |
| --- | --- |
| `getRecentEntries` | food items the user added recently |
| `findExpiringSoon` | items whose expiration date is approaching |

Those are the only two tools the agent has. They are defined in `openapi.json` and served by `handler.ts`. If you rename them, describe a third tool, or leave them out, the agent will either call nothing or try to call something that does not exist.

**Everything else is yours.** Structure, tone, length and emphasis are choices. What you must cover:

1. **Role.** What this agent is for.
2. **Which tool, when.** Cooking and inventory questions go to `getRecentEntries`; freshness, waste and use-it-up questions go to `findExpiringSoon`.
3. **Grounding.** Answer only from what the tools return. Models will otherwise invent plausible food items, and a confident wrong answer is worse than no answer.
4. **Empty results.** What to say when a tool returns nothing. Without this the agent tends to apologise vaguely or invent something.

The version that ships is one long paragraph. Here is a different take on the same requirements, to show the range available:

```markdown
# MealRecommendationAgent

You help people cook with the food they already have, using their food tracker as
the only source of truth.

## Tools

- `getRecentEntries` returns what the user has added recently. Use it for "what can
  I cook", "what do I have", and anything about their current inventory.
- `findExpiringSoon` returns items approaching their expiration date. Use it for
  "what should I use up", "what is going off", and anything about waste or freshness.

Call a tool before every answer. Never answer from memory.

## Rules

- Only mention food items a tool returned in this conversation. Do not add
  ingredients the user did not tell you they have, even obvious ones like salt.
- Name the items you are using, so the user can check you.
- Prefer suggestions that use several items at once.
- If a tool returns nothing, say so plainly and stop. Do not guess, and do not
  suggest a shopping trip unless asked.

## Style

Two or three sentences. Practical, not chatty. No emoji.
```

Both versions satisfy the same four requirements. Yours does not need to look like either one, as long as it names the two real tools and covers the four points.

Save the file. Watch the `sandbox` terminal and wait for `Deployment completed`.

> **Checkpoint. Validate before continuing:**
> 1. Your instructions name `getRecentEntries` and `findExpiringSoon`, spelled exactly, and no other tool.
> 2. They say when to use each one.
> 3. They forbid inventing items and say what to do when a tool returns nothing.
> 4. The `sandbox` terminal shows `Deployment completed` after your edit. If it does not, the agent still has the old instructions and the tests in Part F will not reflect your work.

### Step 11: Write the tool descriptions

Open `amplify/functions/meal-recommendations/openapi.json`. Find the `description` field on each of the two operations, `getRecentEntries` and `findExpiringSoon`.

**These descriptions are the only information the agent has when choosing a tool.** It cannot read the Lambda. It cannot see your data. It sees two names and two sentences, and picks.

Rewrite both descriptions. A useful description says **when to use this**, not what it returns. Compare:

| Weak | Better |
| --- | --- |
| "Returns food items." | "Use this when the user asks what they have on hand, what they could cook, or anything about their current inventory." |
| "Returns items with expiration dates." | "Use this when the user asks about freshness, spoilage, waste, or what they should use up soon." |

The first pair describes the return value. The second pair describes the decision. Only the second helps an agent choose.

Save the file and wait for `Deployment completed`.

> **Checkpoint. Validate before continuing:**
> 1. Both `description` fields are in your own words.
> 2. Each one says when to use the tool, not only what it returns.
> 3. The `sandbox` terminal shows `Deployment completed`.

---

---

## Part E: Review the Deployed Agent

### Step 12: Confirm what actually deployed

Your agent does not live in the Bedrock Agents console, because it is not a Bedrock Agent. It is an **AgentCore Runtime**: a small service, built from `amplify/custom/agent/app.ts`, running the code your construct bundled and uploaded.

In the `dev` terminal, find it:

```
aws bedrock-agentcore-control list-agent-runtimes --region us-east-1 --query "agentRuntimes[?starts_with(agentRuntimeName,'MealRecommendationAgent')].[agentRuntimeName,status]" --output table
```

You should see one runtime with status `READY`. Now capture its ARN, because every later step needs it:

```
$arn = aws bedrock-agentcore-control list-agent-runtimes --region us-east-1 --query "agentRuntimes[?starts_with(agentRuntimeName,'MealRecommendationAgent')].agentRuntimeArn" --output text
```

```
$arn
```

Then look at what was deployed:

```
aws bedrock-agentcore-control get-agent-runtime --agent-runtime-id $arn.Split('/')[-1] --region us-east-1 --query "agentRuntimeArtifact.codeConfiguration"
```

Match each field to the construct you read in Step 9:

| Field | What it tells you |
|---|---|
| `runtime` | `NODE_22`. The agent is plain JavaScript, not a container |
| `entryPoint` | `["app.js"]`, the esbuild bundle the construct produced at deploy time |
| `code.s3` | The bundle in the CDK assets bucket. `agent-instructions.md` and `openapi.json` are inside it |

> [!NOTE]
> ℹ️ **There is nothing to configure here.** Your instructions and your tool descriptions were packaged into that zip at deploy time. Editing either file and saving makes the sandbox rebuild the bundle and update the runtime. The AWS side is a read-only window onto what your code deployed, which is the point of infrastructure from code.

---

## Part F: Smoke-Test the Agent and Watch It Choose

Bedrock Agents had a trace panel. AgentCore does not. What it has instead is better for a real debugging habit: **every conversation gets its own CloudWatch log stream**, named after the session id you pass in. The agent logs which tool it chose and what arguments it passed, so you can read one conversation from start to finish.

Set up the log group name once:

```
$logGroup = "/aws/bedrock-agentcore/runtimes/" + $arn.Split('/')[-1] + "-DEFAULT"
```

```
$logGroup
```

### Step 13: First prompt, then read the trace

Write the prompt to a file. Use this exact command, because PowerShell's `Out-File` adds a byte order mark that breaks the JSON:

```
[IO.File]::WriteAllText("$PWD\prompt1.json", '{"prompt":"What should I make for dinner tonight based on what I have in the food tracker?"}')
```

Generate a session id. A GUID is 36 characters, which clears the minimum no matter what, and the prefix makes your stream easy to find in a class where everyone is running this lab:

```
$session1 = "lab3-step13-" + [guid]::NewGuid().ToString()
```

Now invoke the agent:

```
aws bedrock-agentcore invoke-agent-runtime --agent-runtime-arn $arn --runtime-session-id $session1 --content-type "application/json" --payload fileb://prompt1.json --region us-east-1 answer1.json
```

> [!WARNING]
> ⚠️ **The session id must be at least 33 characters.** `InvokeAgentRuntime` rejects anything shorter with `Invalid length for parameter runtimeSessionId, valid min length: 33`. Nothing in the agent is wrong when this happens, but it reads like a broken agent if you are not expecting it. Never hand-type a session id and never build one from something variable like a user name; generate it, as above. Lab 4 hits the same rule from the React panel, where `crypto.randomUUID()` does the same job.

Read the answer:

```
Get-Content answer1.json -Raw -Encoding UTF8
```

The `-Encoding UTF8` matters. The agent's replies contain emoji and dashes, and without it PowerShell reads the file in the Windows ANSI codepage and you get `ðŸŸ` instead of a fish.

**Expected result:** a `completion` naming actual items from your FoodItem table, the 30 items you seeded in Lab 1.

Now read what the agent did to produce it:

```
aws logs tail $logGroup --since 10m --format short --region us-east-1
```

You are looking for a line like:

```
tool call: getRecentEntries {"days":7}
tool result: getRecentEntries returned 4812 bytes
```

Two signals prove it worked. The agent **picked a sensible tool**, which is driven by the OpenAPI descriptions you wrote in Step 11. And the response **names real items**, which is driven by the Lambda actually executing against DynamoDB. A convincing answer with no `tool call` line in the log would mean the model invented your groceries.

### Step 14: Second prompt, different intent, different tool

```
[IO.File]::WriteAllText("$PWD\prompt2.json", '{"prompt":"What is expiring soon that I should use this week?"}')
```

```
$session2 = "lab3-step14-" + [guid]::NewGuid().ToString()
```

```
aws bedrock-agentcore invoke-agent-runtime --agent-runtime-arn $arn --runtime-session-id $session2 --content-type "application/json" --payload fileb://prompt2.json --region us-east-1 answer2.json
```

```
aws logs tail $logGroup --since 5m --format short --region us-east-1
```

**Expected result:** `tool call: findExpiringSoon` this time. The same Lambda runs a Scan with a different FilterExpression, against `expirationDate` rather than `addedAt`, and the answer calls out specific items, for example "your yogurt expires in 2 days".

Nothing about the agent changed between Step 13 and Step 14. The same two tools were offered. The question was different, and the descriptions you wrote were enough for the model to route it correctly.

### Step 15: Break it on purpose

You have been told that tool descriptions drive tool selection. Now prove it.

Open `openapi.json` and replace the `description` on **`findExpiringSoon`** with something deliberately useless:

```
Returns food data.
```

Save, and wait for `Deployment completed` in the `sandbox` terminal. The bundle is rebuilt and the runtime updated, so give it a moment longer than a code-only change.

Send the expiring-soon prompt again, with a new session id so you get a clean log stream:

```
$session3 = "lab3-step15-" + [guid]::NewGuid().ToString()
```

```
aws bedrock-agentcore invoke-agent-runtime --agent-runtime-arn $arn --runtime-session-id $session3 --content-type "application/json" --payload fileb://prompt2.json --region us-east-1 answer3.json
```

```
aws logs tail $logGroup --since 5m --format short --region us-east-1
```

**Expected result:** `tool call: getRecentEntries`, or the agent calling both and hedging. Nothing else changed. The Lambda is identical, the data is identical, your instructions are identical. One vague sentence was enough to make the agent choose wrongly.

Put your good description back, save, and wait for the redeploy.

> **Checkpoint. Validate before continuing:**
> You saw the tool call change in the log as a direct result of editing one description, and you restored the working version.

> Note: This is the lesson to take away, and you have now seen it rather than been told it. Tool descriptions are the agent's only basis for choosing. When an agent calls the wrong tool in production, those descriptions are the first place to look, before the model, the prompt, or the data.

---

## Lab 3 Outcomes

Lab 4 depends on all of these. Confirm them before moving on:

- [ ] The agent runtime (name starting with `MealRecommendationAgent_`) is deployed with status `READY`
- [ ] `agent-instructions.md` and both `openapi.json` descriptions are in your own words
- [ ] The trace showed tool calls returning real FoodItem data for both test prompts
- [ ] You saw tool selection change when you degraded a description, and restored it
- [ ] Both terminals still running: `sandbox` and `dev`
- [ ] AWS CLI session valid (`aws sts get-caller-identity` succeeds)

---

## Summary

You did three distinct kinds of work. First, you turned the foundational steering files into a working security policy by adding `security.md` with rules and an allowlist, a file Kiro now loads on every interaction. Second, you built two hooks side by side: an Ask Kiro hook for context-sensitive credential detection (which leans on the steering allowlist to suppress false positives) and a Run Command hook for deterministic Biome formatting. Third, you authored the behaviour of a working agent on AgentCore: you wrote its instructions and its tool descriptions, deployed them through the same CDK construct that ships with the project, read the agent's own logs to watch real grounded tool calls, and then degraded one description to see tool selection fail. Infrastructure from code, behaviour from the two files you control: the same division of labor you would use in production.

Two takeaways:

- Hooks and steering work together. The security hook only does the right thing because the steering file tells it what counts and what to ignore. Both ship with the repo, so every teammate gets the same enforcement automatically.
- File hooks watch the agent, not you. `PostFileSave` fires when Kiro writes a file, and manual editor saves are ignored. That is the right boundary for an agentic IDE: the code you review yourself is already under your eye, and the code the agent writes is the code worth scanning automatically.
- Bedrock Agents pick tools based on what you tell them about those tools. You proved this in Step 15 by making one description vague and watching the agent choose wrongly. The `description` fields in your OpenAPI schema are the agent's only signal for tool selection. Treat them as code.
