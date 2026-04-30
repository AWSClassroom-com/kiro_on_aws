# Lab 4: Chat Panel and Production Deployment

Use Kiro's spec-driven workflow to build a chat panel into the food-tracker that calls `InvokeAgent` against the `MealRecommendationAgent` from Lab 3. Then deploy the app to AWS Amplify Hosting by connecting your GitHub repo, following the [AWS Amplify Next.js getting-started guide](https://docs.aws.amazon.com/amplify/latest/userguide/getting-started-next.html). Every push to `trunk` redeploys both the backend and frontend automatically.

**Time:** ~90 minutes
**Course repo:** https://github.com/AWSClassroom-com/kiro_on_aws

## Working with Kiro

- Open chat: `Cmd+L` (macOS) / `Ctrl+L` (Windows/Linux). Open command palette: `Cmd+Shift+P` / `Ctrl+Shift+P`.
- Prefer chat and command palette over clicking buttons — button labels change between versions.
- Agent output varies between runs. Expected results describe outcomes, not exact text. If something looks wrong, tell Kiro in chat.
- Always read diffs before accepting.

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

You'll need a GitHub account to host the repo Amplify deploys from. If you don't already have one, sign up at https://github.com/signup.

### 5. Create a Bedrock Agent alias and capture IDs

The test alias from Lab 3 (`TSTALIASID`) only works in the Console test panel. Create a real alias.

Bedrock Console → **Agents** → **MealRecommendationAgent** → **Aliases** → **Create**:
- **Alias name:** `v1`
- **Associate a version:** **Create a new version and associate it to this alias**

Click **Create alias**. After it provisions, capture:
- **Agent ID** — top of the agent overview page.
- **Alias ID** — in the Aliases table.

You'll paste these into the spec in Part A.

---

## Part A: Generate Requirements

### Step 1: Create a new spec

`Cmd+Shift+P` / `Ctrl+Shift+P` → `Kiro: create a new spec`.

### Step 2: Describe the feature

Paste as your initial prompt, Kiro should ask you for your Agent ID and Alias ID:

```
Create a new spec "meal-agent-chat" for a chat panel feature on the food-tracker page that lets the user converse with the MealRecommendationAgent (Bedrock Agent) deployed in Lab 3.

Requirements:
- Floating "Ask the meal assistant" button in the bottom-right of the food-tracker page that opens a side panel.
- The side panel slides in from the right and contains:
  - Header with title "Meal Assistant", a "New conversation" button, and a close button.
  - Scrollable messages list (user and assistant messages alternating).
  - Input box pinned to the bottom with a Send button.
  - Typing indicator while waiting for a response.
- Each message exchange calls a new AppSync custom query invokeMealAgent(prompt, sessionId) that returns { sessionId, completion }.
- The query is handled by a new Amplify Function invoke-meal-agent that calls Bedrock InvokeAgent for the MealRecommendationAgent.
- sessionId is generated client-side with crypto.randomUUID() on first use and persists across messages until "New conversation" is clicked.
- The query is authorized for authenticated users only.
- On error the chat shows a friendly fallback message; it does NOT throw.

Bedrock specifics:
- Agent ID: [AGENT ID]
- Alias ID: [ALIAS ID]
- Use @aws-sdk/client-bedrock-agent-runtime (BedrockAgentRuntimeClient + InvokeAgentCommand).
- Iterate response.completion (async iterable of chunk events), decode each chunk's bytes with TextDecoder, concatenate into a single string.

Hard constraint on credentials: At runtime, the Amplify Function uses its Lambda execution role for AWS calls — the AWS SDK's default credential chain resolves to that role automatically. Do NOT design anything that reads AWS_ACCESS_KEY_ID, AWS_SECRET_ACCESS_KEY, AWS_PROFILE, AWS_REGION, or any AWS credential environment variables.
---
Before beginning as the user for their Agents ID and the Alias ID
```

Answer Kiro's follow-up questions as they come.

### Step 3: Review and approve requirements

Open `requirements.md`. Confirm it covers user stories, acceptance criteria for the happy path, the new-conversation reset, and error handling. Approve through the spec workflow when satisfied.

---

## Part B: Generate Design

### Step 4: Generate the design

In chat:

```
The requirements for the meal-agent-chat spec are approved. Please generate design.md now. The design must cover:

1. Architecture flow — from button click through every layer to the rendered response. Flow: React panel → AppSync custom query → invoke-meal-agent Lambda → Bedrock InvokeAgent → MealRecommendationAgent → action group Lambda → DynamoDB → back through the same path.
2. TypeScript interfaces — message shape, panel state shape, AppSync return type (AgentResponse with sessionId and completion).
3. Backend integration — define the Amplify Function in amplify/functions/invoke-meal-agent/ (resource.ts and handler.ts), expose via custom query in amplify/data/resource.ts using a.handler.function() with allow.authenticated() authorization, set AGENT_ID and AGENT_ALIAS_ID env vars in amplify/backend.ts, and grant the function bedrock:InvokeAgent on the agent alias ARN. Construct the ARN at synth time from the env vars using cdk Stack.of(...).region/.account in the form arn:aws:bedrock:<region>:<account>:agent-alias/<agent-id>/<alias-id>.
4. Error handling — explicitly map: (a) Bedrock call failure (return a friendly fallback completion, do not throw), (b) network error in the React client (show fallback message, don't break the chat).

Hard constraint on credentials: same rule as requirements. The Lambda uses its execution role.
```

### Step 5: Review and approve

Open `design.md` and confirm all four sections are present. Approve when satisfied.

---

## Part C: Generate Tasks

### Step 6: Generate tasks

Send in chat:

```
The design for the meal-agent-chat spec is approved. Please generate tasks.md now. This is a time-boxed lab — keep the plan to the smallest scope that delivers the feature.

Rules:
- Tasks ordered by dependency. Each task is one diff.
- Each task lists the files it touches and the design section it implements.
- First task installs any new dependencies (@aws-sdk/client-bedrock-agent-runtime).
- Do not create Property-based tests

The implementation may create or edit ONLY these files:
1. amplify/functions/invoke-meal-agent/resource.ts
2. amplify/functions/invoke-meal-agent/handler.ts
3. amplify/data/resource.ts (edit)
4. amplify/backend.ts (edit)
5. src/components/MealAgentChat.tsx
6. src/routes/food-tracker.tsx (edit — to integrate the panel and floating button)

Behavioral constraints:
- The Lambda buffers the full Bedrock response into one string before returning. No streaming.
- Validation, if any, happens inline in the handler — no separate schema modules.
- The Lambda accepts the agent's response as-is. No post-processing.

Credentials hard rule:
The Lambda uses its execution role via the SDK's default credential chain. Do NOT add any task that reads AWS_ACCESS_KEY_ID, AWS_SECRET_ACCESS_KEY, AWS_PROFILE, AWS_REGION, or any AWS credential env vars.

When done, reply with the ordered task list (title + files touched per task). Do not start implementing — wait for my approval.
```

Read Kiro's recap and push back if anything's off ("task 4 modifies a file not in the allow-list", "fold this into a single task").

---

## Part D: Implement the Feature

Kiro installs dependencies as part of its tasks — don't run `npm install` yourself.

### Step 7: Implement tasks one at a time

For the **first** task, send:

```
Show me the unchecked tasks remaining in the meal-agent-chat spec, then prepare to implement the next one in order.

Before making any code changes, reply in chat with:
- The task number and title you are starting
- The files you will create or modify
- Any shell commands you need to run

Implement only that one task. Do not bundle multiple tasks together. Do not add files or features the task does not explicitly require. Wait for my approval of the diff before moving on.
```

Once Kiro responds, type "Approve" in chat to begin.

For each subsequent task:

```
Implement the next unchecked task using the same protocol.
```

For each task:
1. Verify the recap matches `tasks.md`.
2. Approve any commands.
3. Review and accept the diff (or push back).
4. Watch the sandbox terminal — wait for "Deployment completed" before the next task.

> Or press **Run all tasks** in the IDE when viewing `tasks.md`.

### Step 8: End-to-end test

1. Browser → `http://localhost:3000/food-tracker`.
2. Click **Ask the meal assistant** (bottom-right). The panel slides in.
3. Send: `What should I make for dinner tonight?` — confirm the response **names actual items** from your FoodItem table.
4. Send a follow-up: `Of those, which would be quickest?` — confirm the agent references its previous answer (sessionId threading).
5. Click **New conversation** and resend the follow-up — confirm the agent has no context now (fresh session).

If anything fails, the sandbox terminal has the Lambda logs streaming. Paste any error into Kiro's chat to diagnose.

---

## Part E: Deploy via GitHub-Connected Amplify Hosting

The sandbox is tied to your developer machine. Push your work to GitHub and connect the repo to AWS Amplify Hosting — every push to `trunk` will redeploy both backend and frontend automatically. This follows the [AWS Amplify Next.js getting-started guide](https://docs.aws.amazon.com/amplify/latest/userguide/getting-started-next.html).

### Step 9: Stop the sandbox watcher

Terminal 1 → `Ctrl+C`. Resources persist until you run `ampx sandbox delete`.

### Step 10: Verify CDK is bootstrapped

Amplify Gen 2 builds use CDK under the hood, so the toolkit must be bootstrapped in your account/region.

```bash
aws cloudformation describe-stacks \
  --stack-name CDKToolkit \
  --query "Stacks[0].StackStatus" \
  --output text --no-cli-pager
```

Expect `CREATE_COMPLETE` or `UPDATE_COMPLETE`. If not:

```bash
npx cdk bootstrap aws://$(aws sts get-caller-identity --query Account --output text --no-cli-pager)/$(aws configure get region)
```

### Step 11: Push your code to GitHub

Fork `https://github.com/AWSClassroom-com/kiro_on_aws` to your account. Then from your local food-tracker directory:

```bash
cd ~/class-projects/kiro_on_aws/kiro-project/food-tracker
git remote add fork https://github.com/<your-username>/kiro_on_aws.git
git checkout -b trunk
git add .
git commit -m "lab 4 work"
git push fork trunk
```

> If your local isn't a Git repo yet: run `git init` first, then the commands above. Use `--force` if needed.

Confirm on GitHub that the `trunk` branch on your fork has your food-tracker code (including the `amplify/` folder).

### Step 12: Bootstrap and Connect the repo to Amplify Hosting

In the AWS Console, top-right region selector → US West (Oregon) us-west-2                                                                                                                    
Top-right toolbar → click the >_ CloudShell icon (next to the bell/notifications)                                                                                                             
Wait ~10 seconds for the shell to launch, then paste:

```
cdk bootstrap aws://$(aws sts get-caller-identity --query Account --output text)/$AWS_REGION
```

Next navigate in the Mangagement Console to: **AWS Amplify** and click **Deploy an app** (or **Create new app** if you've used Amplify in this region before) → choose **GitHub** → **Next**.

Authorize the **AWS Amplify GitHub App** on your fork when prompted. Amplify uses deploy keys scoped to that one repository — your GitHub token isn't stored on AWS servers.

On **Add repository branch**:
- **Repository:** `<your-username>/kiro_on_aws`
- **Branch:** `trunk`
- **My app is a monorepo**: Tick the box
  - **Monorepo root directory**: kiro-project/food-tracker
- Click **Next**.

On **App settings**:
- **App name:** `food-tracker-<your-username>`
- **Frontend build command** and **Build output directory:** Amplify auto-detects these from `package.json` and the `amplify/` folder. It will add `npx ampx pipeline-deploy --branch $AWS_BRANCH --app-id $AWS_APP_ID` to the build phase for the Gen 2 backend. Leave the detected settings as-is.
- **My monorepo uses Amplify Gen2 Backend**: Tick the box
- **Service role:** choose **Create and use a new service role**. Amplify attaches the `AmplifyBackendDeployFullAccess` managed policy automatically so the build can deploy your backend.
- Click **Next**.

On **Review**: confirm everything, then click **Save and deploy**.

### Step 13: Wait for the first deploy and capture the App ID

The first build provisions the backend (Cognito, AppSync, DynamoDB, the `meal-recommendations` Lambda, the `invoke-meal-agent` Lambda) and then deploys the frontend. Watch the build logs on the `trunk` branch page. Total: 5–10 minutes.

When **Provision**, **Build**, **Deploy**, and **Verify** all show green, capture the **App ID** from the top of the app overview page. You'll see it in the URL too: `https://<region>.console.aws.amazon.com/amplify/apps/<APP_ID>/...`.

### Step 14: Re-point the agent's action group at the new Lambda

The deploy created a new `mealrecommendations` Lambda with a new name. The agent's action group still points at the sandbox one from Lab 3.

```bash
aws lambda list-functions \
  --query "Functions[?starts_with(FunctionName,'amplify-foodstarter')&&contains(FunctionName,'mealrecommendations')].FunctionName" \
  --output text
```

Copy the name. Then in Bedrock Console → **Agents** → **MealRecommendationAgent** → **Edit in Agent Builder** → **FoodEntryTools** action group → change Lambda name to the new one → **Save** → back on the agent overview → **Prepare**.

Then **Aliases** → click `v1` → **Edit** → **Associate a new version** → **Create a new version and associate it** → **Save**.

### Step 15: Test the public URL

The branch page shows a URL like `https://trunk.d1a2b3c4d5e6f7.amplifyapp.com`. Open it. Add a few food items. Test the chat panel — it should now hit the agent's `v1` alias backed by your production Lambda.

From here, every `git push fork trunk` triggers an automatic redeploy of both backend and frontend. No keys, no zip uploads, no manual `pipeline-deploy` calls.

---

## Validation Checklist

- [ ] Approved `requirements.md`, `design.md`, and `tasks.md` for the meal-agent-chat spec
- [ ] All tasks in `tasks.md` complete
- [ ] Sandbox redeployed cleanly with the new function
- [ ] Chat panel opens, accepts messages, returns responses naming real items from FoodItem
- [ ] sessionId threads turns within a conversation; "New conversation" resets it
- [ ] Code pushed to GitHub fork on the `trunk` branch
- [ ] GitHub repo connected to Amplify Hosting; first build (Provision, Build, Deploy, Verify) all green
- [ ] Agent's `v1` alias re-pointed at a new version targeting the production `meal-recommendations` Lambda
- [ ] Public Amplify URL loads, signup works, chat panel works against production backend
- [ ] A second `git push fork trunk` triggers an automatic redeploy

---

## Summary

You used Kiro's spec workflow to add a chat panel feature to the food-tracker — a Lambda + AppSync custom query + React panel — calling the Bedrock Agent from Lab 3. Then you promoted the backend off the developer-tied sandbox by pushing your code to GitHub and connecting the repo to AWS Amplify Hosting. Amplify now redeploys both backend and frontend automatically on every push to `trunk`.

Take-homes from this lab:

- Spec-driven works the same for an integration feature (calling another AWS service via Lambda) as for a UI feature.
- A versioned alias on a Bedrock Agent gives you the rollback boundary you'll want the first time something goes wrong in production.
- Connecting Amplify Hosting to a Git repo gives you a CI/CD pipeline for free — Amplify auto-detects Gen 2 build settings, runs `ampx pipeline-deploy` for you, and stores no AWS credentials anywhere outside its managed service role.
