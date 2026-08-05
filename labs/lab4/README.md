# Lab 4: Chat Panel and Production Deployment

**Objective:** Two goals. First, use Kiro's spec-driven workflow (the same one from Lab 2) to build an in-app chat panel that calls `InvokeAgent` against the `MealRecommendationAgent` from Lab 3, proving the spec process works just as well for an integration feature as for a UI feature. Second, promote the app off your developer-tied sandbox: push the code to GitHub and connect the repo to AWS Amplify Hosting, so every push to `trunk` automatically redeploys both backend and frontend.

**Time:** 90 minutes<BR>
**Course repo:** https://github.com/AWSClassroom-com/kiro_on_aws

---

## Prerequisites

### 1. Lab 3 complete

The `MealRecommendationAgent` exists in the Bedrock Console with a `FoodEntryTools` action group, and the trace panel showed correct tool selection.

### 2. Sandbox + dev server running

From `kiro-project/food-tracker`: `npm run amplify:sandbox` (terminal 1) and `npm run dev` (terminal 2). App at `http://localhost:3000`.

### 3. AWS CLI session valid

```bash
aws sts get-caller-identity --no-cli-pager
```

If expired: `aws login --region <your-region>`.

### 4. GitHub account

You need a GitHub account to host the repo Amplify deploys from. If you do not have one, sign up at https://github.com/signup.

---

## Part A: Generate Requirements

### Step 1: Start a spec session

Open the chat panel: Cmd+L (macOS) / CTRL+L (Windows/Linux). In the bottom-left corner of the chat input box, click the agent selector and change it to **Spec**.

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
- The agent and its v1 alias already exist: they are deployed by the MealAgent construct, instantiated in amplify/backend.ts as the mealAgent variable (you studied it in Lab 3).
- Do NOT hardcode any agent or alias IDs anywhere. The backend wires them into the Lambda at deploy time from mealAgent.agent.attrAgentId and mealAgent.alias.attrAgentAliasId.
- Use @aws-sdk/client-bedrock-agent-runtime (BedrockAgentRuntimeClient + InvokeAgentCommand).
- Iterate response.completion (async iterable of chunk events), decode each chunk's bytes with TextDecoder, concatenate into a single string.

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
> `requirements.md` is approved and contains your real Agent ID and Alias ID, not bracket placeholders.

---

## Part B: Generate Design

### Step 4: Generate the design

In chat:

```
The requirements for the meal-agent-chat spec are approved. Please generate design.md now. The design must cover:

1. Architecture flow: from button click through every layer to the rendered response. Flow: React panel -> AppSync custom query -> invoke-meal-agent Lambda -> Bedrock InvokeAgent -> MealRecommendationAgent -> action group Lambda -> DynamoDB -> back through the same path.
2. TypeScript interfaces: message shape, panel state shape, AppSync return type (AgentResponse with sessionId and completion).
3. Backend integration: define the Amplify Function in amplify/functions/invoke-meal-agent/ (resource.ts and handler.ts) with timeoutSeconds: 60 (agent invocations routinely take 5-15 seconds; the defineFunction default of 3 seconds would always time out) and resourceGroupName: "data" (the agent construct and the FoodItem table live in the data stack; placing this function in any other stack creates a circular cross-stack dependency that fails the deploy), expose via custom query in amplify/data/resource.ts using a.handler.function() with allow.publicApiKey() authorization, set AGENT_ID and AGENT_ALIAS_ID env vars in amplify/backend.ts from the existing mealAgent construct (mealAgent.agent.attrAgentId and mealAgent.alias.attrAgentAliasId; never hardcoded strings), and grant the function bedrock:InvokeAgent on mealAgent.alias.attrAgentAliasArn. The handler MUST be typed as Schema["invokeMealAgent"]["functionHandler"] (import type { Schema } from "../../data/resource") and read prompt and sessionId from event.arguments; AppSync delivers custom query arguments there, not at the top level of the event.
4. Error handling: explicitly map (a) Bedrock call failure (log the real error with console.error so it appears in the Lambda logs, then return a friendly fallback completion; do not throw), (b) network error in the React client (show fallback message, don't break the chat).

Hard constraint on credentials: same rule as requirements. The Lambda uses its execution role.
```

### Step 5: Review and approve

Open `design.md` and confirm all four sections are present.

Then run these critical review checks with Find (Cmd+F / CTRL+F):

1. Search for `attrAgentId` and `attrAgentAliasId`. The backend wiring must read both IDs from the `mealAgent` construct; there must be no hardcoded or invented ID strings anywhere in the design.
2. Search for `timeoutSeconds` and `resourceGroupName`. The function resource example must set `timeoutSeconds: 60` and `resourceGroupName: "data"`; the wrong stack placement fails the whole deploy with a circular dependency.
3. Search for `AWS_ACCESS_KEY_ID`. It may only appear in a clearly marked incorrect-pattern example. SDK clients are constructed with no arguments.
4. Search for `publicApiKey`. The custom query must be authorized with `allow.publicApiKey()`.
5. Search for `console.error`. InvokeAgent failures must be logged before returning the fallback, or you cannot debug them from the Lambda logs.

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
- @aws-sdk/client-bedrock-agent-runtime is already installed in the starter project; do not add an install task.
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

In Lab 2, you implemented tasks one at a time to practice the review protocol. Here you run the whole plan in one go: open `tasks.md` in the spec and click the **Run all tasks** button at the top of the tasks view.

While it runs:

1. Approve any commands Kiro asks to run.
2. Watch terminal 1: backend tasks trigger sandbox redeploys as they land. If it reports `MultipleSandboxInstancesError`, press CTRL+C and rerun `npm run amplify:sandbox` (known stale-lock glitch).

When all tasks show complete, review the full changeset before moving on. Open each of the six allowed files and rerun the Step 5 Find checks against the real code: `attrAgentId`/`attrAgentAliasId` wiring in `amplify/backend.ts`, `timeoutSeconds: 60` in the function resource, `event.arguments` in the handler, `console.error` before the fallback, and no hardcoded IDs anywhere.

> **Checkpoint. Validate before continuing:**
> 1. Every task in `tasks.md` is marked complete.
> 2. Terminal 1 shows `Deployment completed` with no errors.
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

> If anything fails: Terminal 1 has the Lambda logs streaming. Paste any error into Kiro's chat to diagnose. An `AccessDeniedException` on `InvokeAgent` usually means the grant in `backend.ts` is not using `mealAgent.alias.attrAgentAliasArn`; check the wiring.

> If the very first message after a deploy returns the fallback message, the Lambda's new IAM permission may still be propagating. Wait about 30 seconds and send the message again before debugging further.

> **Checkpoint. Validate before continuing:**
> The chat panel works end-to-end against the live agent, with session threading and reset, before you move to Part E.

---

## Part E: Deploy via GitHub-Connected Amplify Hosting

The sandbox is tied to your developer machine. Now push your work to GitHub and connect the repo to AWS Amplify Hosting; every push to `trunk` will redeploy both backend and frontend automatically.

> Region rule: Do everything in this part in the same region you have used all class (your `aws login` region). The Bedrock agent, its Lambda, and your data all live there; deploying the app to a different region would break the chat feature.

### Step 9: Stop the sandbox watcher

Terminal 1 > CTRL+C. The cloud resources persist until you run the sandbox delete command; you clean them up at the end of the course.

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

```bash
npm run amplify:sandbox:delete
aws logout
```

The first command asks for confirmation; type `y`. It removes everything the sandbox created, including the sandbox's Bedrock agent. To remove the production deployment too: AWS Console > Amplify > your app > App settings > Delete app (the production agent is part of that backend and is removed with it).

---

## Summary

You used Kiro's spec workflow to add a chat panel to the food-tracker (a Lambda + AppSync custom query + React panel) calling the Bedrock Agent from Lab 3, with session IDs threading multi-turn conversations. Then you promoted the backend off the developer-tied sandbox by pushing to GitHub and connecting the repo to AWS Amplify Hosting, which now redeploys both backend and frontend automatically on every push to `trunk`.

Take-homes:

- Spec-driven development works the same for an integration feature (calling another AWS service via Lambda) as for a UI feature.
- A versioned alias on a Bedrock Agent gives you the rollback boundary you want the first time something goes wrong in production.
- Connecting Amplify Hosting to a Git repo gives you a CI/CD pipeline for free. Amplify auto-detects Gen 2 build settings, runs `ampx pipeline-deploy` for you, and stores no AWS credentials outside its managed service role.
- This lab authorized the chat query with the public API key to match the class schema. In a real product you would put Cognito authentication in front of it (`allow.authenticated()`) so only signed-in users can invoke the agent; the wiring is identical, only the authorization rule changes.
