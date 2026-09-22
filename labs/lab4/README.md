# Lab 4: Chat Panel and Production Deployment

**Objective:** Two goals. First, use Kiro's spec-driven workflow (the same one from Lab 2) to build an in-app chat panel that calls `InvokeAgent` against the `MealRecommendationAgent` from Lab 3, proving the spec process works just as well for an integration feature as for a UI feature. Second, promote the app off your developer-tied sandbox: push the code to GitHub and connect the repo to AWS Amplify Hosting, so every push to `trunk` automatically redeploys both backend and frontend.

**Time:** 90 minutes<BR>
**Course repo:** https://github.com/AWSClassroom-com/kiro_on_aws

---

## Prerequisites

### 1. Lab 3 complete

The `MealRecommendationAgent` runtime is deployed on Amazon Bedrock AgentCore with status `READY`, and you saw it choose the right tool for the question you asked.

### 2. Sandbox + dev server running

From `kiro-project/food-tracker`: `npm run amplify:sandbox -- --identifier <your-sandbox-name>` in the `sandbox` terminal and `npm run dev` in the `dev` terminal. If the tabs are not named, right click each one and choose **Rename** now. This lab refers to them by name, and by this point you may have four or five tabs open, all of which Kiro labels after whatever process happens to be running. App at `http://localhost:3000`.

Use the same sandbox name you chose in Lab 1 Step 7.

### 3. AWS CLI session valid

```bash
aws sts get-caller-identity --no-cli-pager
```

If expired: `aws login --region <your-region>`.

### 4. GitHub account

You need a GitHub account to host the repo Amplify deploys from. If you do not have one, sign up at https://github.com/signup.

### 5. Chat model set to Haiku 4.5

> [!WARNING]
> ⚠️ **Confirm the chat model is Haiku 4.5, not Auto, before starting the spec session.**
>
> In the chat panel (Cmd+L / CTRL+L), check the model selector at the bottom of the input box. If it reads **Auto**, change it to **Haiku 4.5**.
>
> This is the most credit-hungry lab in the course: a full spec workflow followed by **Run all tasks** in Part D, which executes every remaining task back to back. If your credits run out mid-run you will be left with a partially implemented feature and a broken sandbox deploy.

---

## Part A: Generate Requirements

### Step 1: Start a spec session

Open a new chat session: Cmd+L (macOS) / CTRL+L (Windows/Linux), or the **+** button in the chat panel.

The new session screen offers two cards, **Vibe** and **Spec**. Choose **Spec**.

> Note: there is no agent selector in the chat input box. Spec mode is chosen on the new session screen.

### Step 2: Describe the feature

Paste as your initial prompt:

```
Create a new spec "meal-agent-chat" for a chat panel feature on the food-tracker page that lets the user converse with the MealRecommendationAgent (Bedrock Agent) deployed in Lab 3.

Requirements:
- A floating "Ask the meal assistant" button in the bottom right of the food-tracker page that opens a panel fixed to the right side of the screen.
- The panel contains:
  - Header with title "Meal Assistant", a "New conversation" button, and a close button.
  - Scrollable messages list (user and assistant messages alternating).
  - Input box pinned to the bottom with a Send button.
  - A simple "thinking..." indicator while waiting for a response.
- Keep the styling simple and consistent with the page's dark slate theme. No animations required. No emojis anywhere in the UI.
- Each message exchange calls a new AppSync custom query invokeMealAgent(prompt, sessionId) that returns { sessionId, completion }.
- The query is handled by a new Amplify Function invoke-meal-agent that calls Bedrock InvokeAgent for the MealRecommendationAgent.
- sessionId is generated client-side with crypto.randomUUID() on first use and persists across messages until "New conversation" is clicked.
- The query is authorized with allow.publicApiKey() to match the existing schema.
- On error the chat shows a friendly fallback message; it does NOT throw.
- Keep the requirements focused on user-facing behavior. Do NOT add IAM policy or permission-scoping requirements; permissions are decided in the design phase.

Bedrock specifics:
- The agent runtime already exists: it is deployed by the MealAgent construct, instantiated in amplify/backend.ts as the mealAgent variable (you studied it in Lab 3).
- Do NOT hardcode the runtime ARN anywhere. The backend wires it into the Lambda at deploy time from mealAgent.agentRuntimeArn.
- Use @aws-sdk/client-bedrock-agentcore (BedrockAgentCoreClient + InvokeAgentRuntimeCommand).
- The payload is bytes, not a string: encode JSON.stringify({ prompt }) with TextEncoder.
- The response body is a streaming blob. Read it with await response.response.transformToString(), then JSON.parse it. The agent returns { sessionId, completion }.
- runtimeSessionId must be at least 33 characters. InvokeAgentRuntime rejects anything shorter. crypto.randomUUID() produces 36, so generate the session id that way and never invent a short one.

Hard constraint on credentials: At runtime, the Amplify Function uses its Lambda execution role for AWS calls; the AWS SDK's default credential chain resolves to that role automatically. Do NOT design anything that reads AWS_ACCESS_KEY_ID, AWS_SECRET_ACCESS_KEY, AWS_PROFILE, AWS_REGION, or any AWS credential environment variables.
```

Kiro may ask follow-up questions before it generates anything. Typical questions and the answers to give:

- Is this spec for a new feature or a bug fix? A new feature.
- Start with requirements or technical design? Requirements.

### Step 3: Review and approve requirements

Open `requirements.md`. Confirm it covers user stories, acceptance criteria for the happy path, the new-conversation reset, and error handling.

Then run these critical review checks with Find (Cmd+F / CTRL+F):

1. Search for `Agent ID` and scan any code-like strings. There must be NO hardcoded or invented agent/alias ID values anywhere; the backend wires real IDs from the `mealAgent` construct at deploy time, and an invented ID fails at runtime with AccessDeniedException.
2. Search for `IAM` and `policy`. The requirements must not contain IAM or permission-scoping criteria; those belong to the design phase.

Approve through the spec workflow when satisfied.

> Note: Agent output varies between runs. Review what Kiro actually wrote.

> **Checkpoint. Validate before continuing:**
> `requirements.md` is approved and contains **no** agent or alias ID values at all. The backend supplies them at deploy time from the `mealAgent` construct, so any ID written into the requirements is invented and will fail at runtime.

---

## Part B: Generate Design

### Step 4: Generate the design

As in Lab 2, the prompt is long because it pins decisions that fail in specific ways. The two that matter most here:

| Constraint | Why |
| --- | --- |
| `timeoutSeconds: 60` | Agent invocations take 5 to 15 seconds, sometimes longer. Measured at about 11 seconds for a single tool call in this project |
| `resourceGroupName: "data"` | The agent construct and the FoodItem table live in the data stack. Placing this function anywhere else creates a circular cross-stack dependency and the whole deploy fails |

In chat:

```
The requirements for the meal-agent-chat spec are approved. Please generate design.md now. The design must cover:

1. Architecture flow: from button click through every layer to the rendered response. Flow: React panel -> AppSync custom query -> invoke-meal-agent Lambda -> InvokeAgentRuntime -> MealRecommendationAgent on AgentCore Runtime -> meal-recommendations Lambda -> DynamoDB -> back through the same path.
2. TypeScript interfaces: message shape, panel state shape, AppSync return type (AgentResponse with sessionId and completion).
3. Backend integration: define the Amplify Function in amplify/functions/invoke-meal-agent/ (resource.ts and handler.ts) with timeoutSeconds: 60 (agent invocations routinely take 5-15 seconds; the defineFunction default of 3 seconds would always time out) and resourceGroupName: "data" (the agent construct and the FoodItem table live in the data stack; placing this function in any other stack creates a circular cross-stack dependency that fails the deploy), expose via custom query in amplify/data/resource.ts using a.handler.function() with allow.publicApiKey() authorization, set an AGENT_RUNTIME_ARN env var in amplify/backend.ts from the existing mealAgent construct (mealAgent.agentRuntimeArn; never a hardcoded string), and grant the function permission to invoke it by calling mealAgent.runtime.grantInvokeRuntime() with the Lambda, rather than writing an IAM policy by hand. The handler MUST be typed as Schema["invokeMealAgent"]["functionHandler"] (import type { Schema } from "../../data/resource") and read prompt and sessionId from event.arguments; AppSync delivers custom query arguments there, not at the top level of the event.
4. Error handling: explicitly map (a) Bedrock call failure (log the real error with console.error so it appears in the Lambda logs, then return a friendly fallback completion; do not throw), (b) network error in the React client (show fallback message, don't break the chat).

Hard constraint on credentials: same rule as requirements. The Lambda uses its execution role.
```

### Step 5: Review and approve

Open `design.md` and confirm all four sections are present.

Then run these critical review checks with Find (Cmd+F / CTRL+F):

1. Search for `agentRuntimeArn`. The backend wiring must read the ARN from the `mealAgent` construct; there must be no hardcoded or invented ARN strings anywhere in the design. Search for `grantInvokeRuntime` as well: the design should use it instead of a hand-written IAM policy.
2. Search for `timeoutSeconds` and `resourceGroupName`. The function resource example must set `timeoutSeconds: 60` and `resourceGroupName: "data"`; the wrong stack placement fails the whole deploy with a circular dependency.
3. Search for `AWS_ACCESS_KEY_ID`. It may only appear in a clearly marked incorrect-pattern example. SDK clients are constructed with no arguments.
4. Search for `publicApiKey`. The custom query must be authorized with `allow.publicApiKey()`.
5. Search for `console.error`. InvokeAgent failures must be logged before returning the fallback, or you cannot debug them from the Lambda logs.

> [!WARNING]
> ⚠️ **Before approving, confirm the design can actually be built.**
>
> The five checks above confirm the design says the right things. They do not confirm it compiles. A design can pass every one of them and still fail to deploy, because the model can invent APIs that do not exist in the installed version of Amplify.
>
> Three things to look for in the code examples:
>
> 1. **Every Amplify schema call must be real.** `a.customType()`, `a.ref()`, `a.json()`, `a.enum()`, `a.string()` and `a.integer()` exist. `a.object()` does not. If you see a call you do not recognise, ask Kiro to confirm it exists in `@aws-amplify/data-schema` before approving.
> 2. **Custom query arguments cannot reference a model.** `a.ref("FoodItem")` as an argument fails at deploy time, because AppSync accepts only custom types and enums there. Arguments here should be plain scalars: `prompt` and `sessionId` are both strings.
> 3. **The return type must be a named custom type.** `{ sessionId, completion }` are two strings, and the query has to hand them back as an object the frontend can read. Do not accept a design that nests `a.customType()` inside `.returns()`; that produces a generated type the Lambda handler cannot satisfy, and the deploy fails type checking. Do not accept `.returns(a.json())` either. It compiles, but AppSync exposes it as `AWSJSON` and sends the result as one JSON-encoded string, and the chat panel in Part D then displays raw JSON instead of the answer. The shape that works is a custom type declared at the top level of the schema and referenced with `a.ref()`.
>
> **Two specific faults have been seen in real runs of this step.** Check for both, and if you find either, paste the correction below rather than trying to work out the wording yourself.
>
> **Fault A: `resourceGroupName` present but commented out.** The code example reads:
>
> ```ts
> timeoutSeconds: 60,
> memory: 512,
> // resourceGroupName: "data" - scoped to data stack to avoid circular dependency
> ```
>
> The prose underneath still claims the function is scoped to the data stack, so the design contradicts itself and review check 2 passes anyway, because searching for `resourceGroupName` finds the commented line. A commented property does nothing, the function lands in the wrong stack, and the deploy fails with a circular dependency.
>
> **Fault B: the return type wrapped in `a.customType()`.** The code example reads:
>
> ```ts
> .returns(
>   a.customType({
>     sessionId: a.string().required(),
>     completion: a.string().required(),
>   })
> )
> ```
>
> A nested custom type inside `.returns()` generates a `Schema` type the Lambda handler cannot satisfy, and the deploy fails type checking.
>
> **The shape that works declares the type at the top level of the schema and references it:**
>
> ```ts
> const schema = a.schema({
>   MealAgentResponse: a.customType({
>     sessionId: a.string().required(),
>     completion: a.string().required(),
>   }),
>
>   invokeMealAgent: a
>     .query()
>     .arguments({ prompt: a.string().required(), sessionId: a.string().required() })
>     .returns(a.ref("MealAgentResponse"))
>     .authorization((allow) => [allow.publicApiKey()])
>     .handler(a.handler.function(invokeMealAgent)),
> });
> ```
>
> ⚠️ **`.returns(a.json())` is the trap here.** It is a real API and it compiles, so it survives every check in this step and every check in Part D. AppSync then serialises the whole object into a single string, and in Step 8 the chat panel renders `{"sessionId":"...","completion":"..."}` with escaped newlines instead of the answer. This was observed in a real run, after everything else had passed.
>
> **If you find either, send this in chat:**
>
> ```
> Two corrections to design.md before I approve it.
>
> 1. In the resource.ts example, resourceGroupName: "data" is commented out. It must be an active property, not a comment. The prose below the example already says the function is scoped to the data stack, so the code and the prose currently disagree.
>
> 2. The custom query wraps its return in a.customType({ sessionId, completion }) inside .returns(). A nested custom type there produces a generated Schema type that the Lambda handler cannot satisfy, and the deploy fails type checking. Do not replace it with a.json(), because AppSync serialises that into a single JSON string that the chat UI cannot read. Instead declare MealAgentResponse as a top-level custom type in the schema, with sessionId and completion as required strings, and have the query use .returns(a.ref("MealAgentResponse")).
>
> Do not change anything else.
> ```
>
> Then confirm `design.md` shows `resourceGroupName: "data",` with no leading `//`, a top-level `MealAgentResponse: a.customType({ ... })` in the schema, and `.returns(a.ref("MealAgentResponse"))` on the query, with no `a.customType(` inside `.returns()` and no `a.json()`.
>
> Correcting these now takes one message. Finding them in Part D costs several failed deploys, and Part D runs every task at once rather than one at a time.

Approve when satisfied.

---

## Part C: Generate Tasks

### Step 6: Generate tasks

Send in chat:

```
The design for the meal-agent-chat spec is approved. Please generate tasks.md now. This is a time-boxed lab; keep the plan to the smallest scope that delivers the feature.

Rules:
- Tasks ordered by dependency. Each task is one diff.
- Each task lists the files it touches and the design section it implements.
- @aws-sdk/client-bedrock-agentcore is already installed in the starter project; do not add an install task.
- Do NOT write any tests (no unit tests, no property-based tests, no test files).

The implementation may create or edit ONLY these files:
1. amplify/functions/invoke-meal-agent/resource.ts
2. amplify/functions/invoke-meal-agent/handler.ts
3. amplify/data/resource.ts (edit)
4. amplify/backend.ts (edit)
5. src/components/MealAgentChat.tsx
6. src/routes/food-tracker.tsx (edit only to integrate the panel and floating button)

Behavioral constraints:
- The Lambda buffers the full Bedrock response into one string before returning. No streaming.
- Validation, if any, happens inline in the handler; no separate schema modules.
- The Lambda accepts the agent's response as-is. No post-processing.
- Keep MealAgentChat simple: plain React state, no external state libraries, no animation libraries.

Credentials hard rule:
The Lambda uses its execution role via the SDK's default credential chain. Do NOT add any task that reads AWS_ACCESS_KEY_ID, AWS_SECRET_ACCESS_KEY, AWS_PROFILE, AWS_REGION, or any AWS credential env vars.

When done, reply with the ordered task list (title + files touched per task). Do not start implementing; wait for my approval.
```

Read Kiro's recap and push back if anything is off (for example: "task 4 modifies a file not in the allow-list").

> **Checkpoint. Validate before continuing:**
> The task list is short (typically 4-6 tasks), touches only the six allowed files, and contains no test tasks.

---

## Part D: Implement the Feature

### Step 7: Run all tasks

In Lab 2, you implemented tasks one at a time to practice the review protocol. Here you run the whole plan in one go.

**To find the tasks view:** click the **Kiro icon (ghost)** in the activity bar, open the **Specs** section, expand **meal-agent-chat**, and click **tasks**. The **Run all tasks** button sits at the top of that view.

**Run all tasks opens a menu with two choices.** Pick **Run required and optional tasks**. Your task list has no optional tasks, so both choices run the same six, but this is the one that matches what the step is asking for and it stays correct if a task list ever does include optional work.

> [!NOTE]
> ℹ️ **Use the Specs panel, not the file tree.** The underlying file is `.kiro/specs/meal-agent-chat/tasks.md`, but opening it from the Explorer gives you plain markdown with no buttons. The Run all tasks control only appears in the Specs panel view.
>
> `.kiro` is a hidden-style folder, so in the Explorer it sorts above `amplify` and `src` and is easy to scroll past. The Specs panel avoids the problem entirely.

While it runs:

1. Approve any commands Kiro asks to run. The dialog offers **Reject**, **Trust** and **Run**. Click **Run**. **Trust** permits the command for later but does not execute it now, so the task will appear to stall.
2. Watch the `sandbox` terminal: backend tasks trigger redeploys as they land. If it reports `MultipleSandboxInstancesError`, rerunning will not clear it. Read the PID in the error message. If other sandbox processes are running, close them all and start one again with your own sandbox name:

```
Get-CimInstance Win32_Process -Filter "Name='node.exe'" | Where-Object { $_.CommandLine -match 'amplify:sandbox|ampx.js' } | Stop-Process -Force
```

If the PID in the error is the only sandbox running, it has deadlocked against its own lock file, which happens when files change while a deploy is in progress. Press CTRL+C, clear the lock, then restart the sandbox in that same terminal:

```
Remove-Item ".amplify\artifacts\cdk.out\read.*.lock" -Force -ErrorAction SilentlyContinue
```

Your cloud resources are unaffected. Note that after this error the sandbox prints `Watching for file changes...` and looks healthy while nothing reaches AWS, so if a deploy you expect never appears, check here first.

When all tasks show complete, review the generated code before moving on. The Step 5 checks verified the plan; these verify the build.

Open the files and check each item:

| File | Look for | Must be |
| --- | --- | --- |
| `amplify/functions/invoke-meal-agent/resource.ts` | `timeoutSeconds` | `60` |
| | `resourceGroupName` | `"data"`, not commented out |
| `amplify/functions/invoke-meal-agent/handler.ts` | handler type | `Schema["invokeMealAgent"]["functionHandler"]` |
| | `event.arguments` | present |
| | `console.error` | present, before the fallback is returned |
| | `AWS_ACCESS_KEY_ID` | absent |
| `amplify/backend.ts` | `agentRuntimeArn` | present, read from `mealAgent` |
| | the invoke grant | `mealAgent.runtime.grantInvokeRuntime(...)`, not a hand-written policy |
| `amplify/functions/invoke-meal-agent/handler.ts` | `runtimeSessionId` | present, and at least 33 characters |

> [!WARNING]
> ⚠️ **Two faults have appeared in real runs of this step. Check for both.** Neither stops the deploy, and both break Step 8.
>
> **Fault A: the IAM grant is written by hand instead of using the construct.** In `amplify/backend.ts`, look for a `PolicyStatement` with a template-literal ARN, something like:
>
> ```ts
> const runtimeArn = `arn:aws:bedrock-agentcore:${lambdaStack.region}::runtime/${name}`;
> ```
>
> Two things go wrong. An empty account field, the `::` in the middle, produces an ARN that matches nothing. And invoking a runtime needs permission on both the runtime ARN **and** `ARN/*`, because endpoints are separate resources. Miss either and Step 8 fails with `AccessDeniedException` on `bedrock-agentcore:InvokeAgentRuntime`.
>
> `mealAgent.runtime.grantInvokeRuntime(backend.invokeMealAgent.resources.lambda)` gets both right. Prefer it over any hand-written policy.
>
> **Fault B: the handler uses a hand-rolled event interface.** Look for:
>
> ```ts
> interface AppSyncEvent { arguments: { prompt: string; sessionId: string } }
> export const handler = async (event: AppSyncEvent) => {
> ```
>
> The design requires `Schema["invokeMealAgent"]["functionHandler"]`. A hand-rolled interface compiles even when it is wrong about where AppSync puts the arguments, which is the mistake it is meant to prevent.
>
> **If you find either, send this in chat:**
>
> ```
> Two corrections to the generated code.
>
> 1. In amplify/backend.ts, the invoke permission is granted with a hand-written IAM policy and a constructed ARN. Replace it with mealAgent.runtime.grantInvokeRuntime(backend.invokeMealAgent.resources.lambda), which grants bedrock-agentcore:InvokeAgentRuntime on both the runtime ARN and ARN/* without building any string.
>
> 2. In amplify/functions/invoke-meal-agent/handler.ts, the handler uses a hand-rolled AppSyncEvent interface. Type it as Schema["invokeMealAgent"]["functionHandler"] with import type { Schema } from "../../data/resource", as the design requires, and read prompt and sessionId from event.arguments.
>
> Do not change anything else.
> ```
>
> Wait for `Deployment completed` in the `sandbox` terminal after the corrections land.

> [!NOTE]
> ℹ️ **Kiro will tell you the code is ready before it is. Check for yourself.**
>
> After making corrections Kiro commonly reports something like "The handler is now fully type-safe. Ready for deployment." That statement is a prediction, not a verification. In real runs of this step it has been wrong more than once, with type errors still present.
>
> Two things are true at the same time, and it is easy to conflate them:
>
> - **Tasks complete** means Kiro finished writing files.
> - **Deployment completed** means AWS accepted them.
>
> Between the two sits a type check that can fail silently as far as the chat panel is concerned. Kiro reports the first and does not always notice the second.
>
> **Verify it yourself before moving on.** The `sandbox` terminal type checks the backend on every save and then deploys it, so it already does this work for you. You only have to read it.
>
> Switch to the `sandbox` terminal and look at the last few lines. A healthy run looks like this:
>
> ```
> 9:43:56 AM  Backend synthesized in 13.97 seconds
> 9:44:05 AM  Type checks completed in 8.99 seconds
> 9:44:08 AM  Built and published assets
> 9:44:08 AM  Deployment in progress...
> ```
>
> | What you see | What it means |
> |---|---|
> | `Type checks completed`, then `Deployment completed` | Compiled, and AWS accepted it. Move on |
> | `Type checks completed`, then `Deployment in progress...` | Still working. A backend deploy takes two to four minutes |
> | A block of `error TS....` lines | It did not compile. Nothing reached AWS, whatever the chat panel said |
> | `[MultipleSandboxInstancesError]`, then `Watching for file changes...` | The deploy was abandoned. Use the recovery steps earlier in this step |
> | Nothing new since before Kiro's last edit | The save was not picked up. Open `handler.ts`, add a space, save, and watch again |
>
> The fourth row is the dangerous one, because the terminal looks healthy afterwards while nothing you save reaches AWS.
>
> If you see type errors, paste them into chat and add: *"These came from the sandbox terminal after your last change. Fix them and tell me what you changed."*
>
> ⚠️ **Check the session id length.** `InvokeAgentRuntime` requires `runtimeSessionId` to be **at least 33 characters** and rejects anything shorter with a validation error that does not mention length. A short id such as `"session-1"` looks perfectly reasonable in generated code and fails every call.
>
> `crypto.randomUUID()` gives 36 characters, so the React panel should generate it that way and pass it through unchanged. The correct command shape is:
>
> ```ts
> const command = new InvokeAgentRuntimeCommand({
>   agentRuntimeArn: process.env.AGENT_RUNTIME_ARN,
>   runtimeSessionId: sessionId,
>   contentType: "application/json",
>   payload: new TextEncoder().encode(JSON.stringify({ prompt })),
> });
>
> const response = await client.send(command);
> const body = JSON.parse(await response.response.transformToString());
> // body is { sessionId, completion }
> ```
>
> The body is a streaming blob, not a string and not an async iterable of chunks. Reading it with anything other than `transformToString()` is the other easy mistake here.

> **Checkpoint. Validate before continuing:**
> 1. Every task in `tasks.md` is marked complete.
> 2. The `sandbox` terminal shows `Deployment completed` with no errors.
> 3. The browser at `http://localhost:3000/food-tracker` loads with no error overlay.

### Step 8: End-to-end test

1. Browser > `http://localhost:3000/food-tracker`.
2. Click **Ask the meal assistant** (bottom right). The panel opens.
3. Send: `What should I make for dinner tonight?`

**Expected result:** A "thinking..." indicator, then a response that names actual items from your FoodItem table.

4. Send a follow-up: `Of those, which would be quickest?`

**Expected result:** The agent references its previous answer. That is the sessionId threading working.

5. Click **New conversation** and resend the follow-up.

**Expected result:** The agent has no context now (fresh session) and asks what you mean or answers generically.

> [!WARNING]
> ⚠️ **If the reply arrives as raw JSON, the backend is fine and the return type is wrong.**
>
> A bubble that begins like this:
>
> ```
> {"sessionId":"06f6307f-64db-4bd9-95d8-46c2e305a4bf","completion":"You've got a great variety of ingredients to work with!\n\n---\n\n
> ```
>
> means the whole chain worked, AppSync to Lambda to Bedrock Agent to DynamoDB, and only the presentation failed. The query returned `a.json()`, so AppSync sent one JSON-encoded string, and `MealAgentChat.tsx` assigned that string straight into the message body. The session ID leaks into the chat, newlines show as `\n`, and the markdown never renders.
>
> **The proper fix is the schema change from Step 5:** a top-level `MealAgentResponse` custom type returned with `a.ref("MealAgentResponse")`. That is the shape the design asked for, and it costs another sandbox deploy of two to four minutes.
>
> **If you are short of time,** send this instead. It changes only the frontend, so Vite hot reloads in seconds:
>
> ```
> In src/components/MealAgentChat.tsx the result of invokeMealAgent arrives as a JSON-encoded string, because the query returns a.json(). Parse it before reading the answer: if the result is a string, JSON.parse it and read completion from the parsed object, falling back to the raw string if parsing fails. Do not change anything else.
> ```
>
> Note which of these two you chose. The schema fix is the one that matches `design.md`, and the gap between a design that was approved and code that was deployed is worth noticing.

> If anything fails: the `sandbox` terminal has the Lambda logs streaming. Paste any error into Kiro's chat to diagnose. An `AccessDeniedException` on `bedrock-agentcore:InvokeAgentRuntime` usually means the grant in `backend.ts` was written by hand instead of using `mealAgent.runtime.grantInvokeRuntime()`; check the wiring. A `ValidationException` on the session id means it is shorter than 33 characters.

> If the very first message after a deploy returns the fallback message, the Lambda's new IAM permission may still be propagating. Wait about 30 seconds and send the message again before debugging further.

> **Checkpoint. Validate before continuing:**
> The chat panel works end-to-end against the live agent, with session threading and reset, before you move to Part E.

---

## Part E: Deploy via GitHub-Connected Amplify Hosting

> [!NOTE]
> ℹ️ **Optional homework. Everything from here on is bonus work.**
>
> The course objectives are met at the end of Part D. You have used Kiro to author a spec, review a design, generate an implementation, correct it, and verify it against a running backend.
>
> This part is for people who already work with Git and GitHub, because it needs a GitHub account, a repository you own, and a push. It is not taught in class and there is no instructor checkpoint for it. If you are not a Git user, stop at the end of Part D and go to the cleanup section, which you should complete either way so your account stops billing.
>
> If you do continue, expect roughly 30 to 45 minutes, most of it waiting for the first Amplify Hosting build.

The sandbox is tied to your developer machine. Now push your work to GitHub and connect the repo to AWS Amplify Hosting; every push to `trunk` will redeploy both backend and frontend automatically.

> Region rule: Do everything in this part in the same region you have used all class (your `aws login` region). The Bedrock agent, its Lambda, and your data all live there; deploying the app to a different region would break the chat feature.

### Step 9: Stop the sandbox watcher

In the `sandbox` terminal, press CTRL+C. The cloud resources persist until you run the sandbox delete command; you clean them up at the end of the course.

### Step 10: Verify CDK is bootstrapped

Amplify Gen 2 builds use CDK under the hood, so the CDK toolkit must be bootstrapped in your account/region:

```bash
aws cloudformation describe-stacks \
  --stack-name CDKToolkit \
  --query "Stacks[0].StackStatus" \
  --output text --no-cli-pager
```

Expect `CREATE_COMPLETE` or `UPDATE_COMPLETE`. If you get an error that the stack does not exist, bootstrap now (one command, about 2 minutes):

```bash
npx cdk bootstrap aws://$(aws sts get-caller-identity --query Account --output text --no-cli-pager)/$(aws configure get region)
```

### Step 11: Push your code to GitHub

Fork `https://github.com/AWSClassroom-com/kiro_on_aws` to your GitHub account (Fork button, top right of the repo page). Then from your local food-tracker directory:

```bash
cd ~/class-projects/kiro_on_aws/kiro-project/food-tracker
git remote add fork https://github.com/<your-username>/kiro_on_aws.git
git checkout -b trunk
git add .
git commit -m "lab 4 work"
git push fork trunk
```

> If your local folder is not a Git repo yet, run `git init` first, then the commands above. Use `git push fork trunk --force` if the push is rejected.

> **Checkpoint. Validate before continuing:**
> On GitHub, your fork's `trunk` branch shows the food-tracker code, including the `amplify/` folder.

### Step 12: Connect the repo to Amplify Hosting

In the AWS Console (same region), navigate to AWS Amplify and click **Deploy an app** (or **Create new app** if you have used Amplify in this region before) > choose **GitHub > Next**.

Authorize the AWS Amplify GitHub App on your fork when prompted. Amplify uses deploy keys scoped to that one repository; your GitHub token is not stored on AWS servers.

On "Add repository branch":

- Repository: `<your-username>/kiro_on_aws`
- Branch: `trunk`
- "My app is a monorepo": tick the box
  - Monorepo root directory: `kiro-project/food-tracker`
- Click Next.

On "App settings":

- App name: `food-tracker-<your-username>`
- Build settings: Amplify auto-detects the build from `package.json` and the `amplify/` folder, and adds `npx ampx pipeline-deploy --branch $AWS_BRANCH --app-id $AWS_APP_ID` for the Gen 2 backend. Leave the detected settings as-is.
- "My monorepo uses Amplify Gen2 Backend": tick the box
- Service role: choose "Create and use a new service role". Amplify attaches the `AmplifyBackendDeployFullAccess` managed policy automatically so the build can deploy your backend.
- Click Next.

On "Review": confirm everything, then click "Save and deploy".

### Step 13: Wait for the first deploy

The first build provisions the backend (AppSync, DynamoDB, Cognito, the `meal-recommendations` Lambda, the `invoke-meal-agent` Lambda) and then deploys the frontend. Watch the build logs on the `trunk` branch page. Total: 5-10 minutes.

> **Checkpoint. Validate before continuing:**
> Provision, Build, Deploy, and Verify all show green on the `trunk` branch page.

> Note: the production build deployed its own complete Bedrock agent (the MealAgent construct is part of the backend), pointing at the production Lambda, with its own `v1` alias, and the chat Lambda's env vars already reference it. There is nothing to re-point or re-configure. Your sandbox agent and the production agent coexist under different name suffixes.

### Step 14: Test the public URL

The `trunk` branch page shows a URL like `https://trunk.d1a2b3c4d5e6f7.amplifyapp.com`. Open it.

1. The homepage and food-tracker page load. The production database starts empty (it is a separate backend from your sandbox); add a few food items on the food-tracker page.
2. Open the chat panel and ask what to make for dinner.

**Expected result:** The response names the items you just added. The chat is now flowing through the agent's `v1` alias, backed by your production Lambda and production DynamoDB table.

From here, every `git push fork trunk` triggers an automatic redeploy of both backend and frontend.

---

## Cleanup (end of course)

When the course is fully wrapped up:

```
npm run amplify:sandbox:delete -- --identifier <your-sandbox-name>
```

```
aws logout
```

> [!WARNING]
> ⚠️ **Use the same sandbox name you chose in Lab 1 Step 7.** Deleting without it, or with a different name, targets a sandbox that does not exist and leaves yours running and billing in the shared class account.

The first command asks for confirmation; type `y`. It removes everything the sandbox created, including the sandbox's Bedrock agent. To remove the production deployment too: AWS Console > Amplify > your app > App settings > Delete app (the production agent is part of that backend and is removed with it).

---

## Summary

You used Kiro's spec workflow to add a chat panel to the food-tracker (a Lambda + AppSync custom query + React panel) calling the Bedrock Agent from Lab 3, with session IDs threading multi-turn conversations. Then you promoted the backend off the developer-tied sandbox by pushing to GitHub and connecting the repo to AWS Amplify Hosting, which now redeploys both backend and frontend automatically on every push to `trunk`.

Take-homes:

- Spec-driven development works the same for an integration feature (calling another AWS service via Lambda) as for a UI feature.
- A versioned alias on a Bedrock Agent gives you the rollback boundary you want the first time something goes wrong in production.
- Connecting Amplify Hosting to a Git repo gives you a CI/CD pipeline for free. Amplify auto-detects Gen 2 build settings, runs `ampx pipeline-deploy` for you, and stores no AWS credentials outside its managed service role.
- This lab authorized the chat query with the public API key to match the class schema. In a real product you would put Cognito authentication in front of it (`allow.authenticated()`) so only signed-in users can invoke the agent; the wiring is identical, only the authorization rule changes.
