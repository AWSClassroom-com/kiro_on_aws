# Lab 4: Chat Panel and Production Deployment

Use Kiro's spec-driven workflow to build a chat panel into the food-tracker that calls `InvokeAgent` against the `MealRecommendationAgent` from Lab 3. Then deploy the app to AWS Amplify Hosting with a manual zip upload — no GitHub account required. An optional final part covers the GitHub Actions + OIDC pipeline.

**Time:** ~90 minutes (Part G adds ~30 more)
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

### 4. Create a Bedrock Agent alias and capture IDs

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

## Part E: Promote the Backend with `ampx pipeline-deploy`

The sandbox is tied to your developer machine. Move the backend onto a durable Amplify app + branch combo before deploying the frontend publicly.

### Step 9: Stop the sandbox watcher

Terminal 1 → `Ctrl+C`. Resources persist until you run `ampx sandbox delete`.

### Step 10: Verify CDK is bootstrapped

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

### Step 11: Create the Amplify app and branch

```bash
APP_ID=$(aws amplify create-app \
  --name food-tracker-$(whoami) \
  --platform WEB \
  --query "app.appId" --output text --no-cli-pager)
echo "App ID: $APP_ID"

aws amplify create-branch \
  --app-id $APP_ID --branch-name trunk --no-cli-pager
```

Save the App ID.

### Step 12: Deploy the backend

```bash
npx ampx pipeline-deploy --branch trunk --app-id $APP_ID
```

5–10 minutes. Writes a fresh `amplify_outputs.json` pointing at the new stack.

### Step 13: Re-point the agent's action group at the new Lambda

`pipeline-deploy` created a new `meal-recommendations` Lambda with a new ARN. The agent's action group still points at the sandbox one.

```bash
aws lambda list-functions \
  --query "Functions[?contains(FunctionName,'mealrecommendations')&&contains(FunctionName,'trunk')].FunctionArn" \
  --output text --no-cli-pager
```

Bedrock Console → **Agents** → **MealRecommendationAgent** → **Edit in Agent Builder** → **FoodEntryTools** action group → change Lambda ARN to the new one → **Save** → back on agent overview → **Prepare**.

Then **Aliases** → click `v1` → **Edit** → **Associate a new version** → **Create a new version and associate it** → **Save**.

---

## Part F: Deploy the Frontend with "Deploy without Git"

### Step 14: Build

```bash
npm run build
```

### Step 15: Zip the build output

Zip the *contents* of `dist/`, not the folder.

```bash
cd dist
zip -r ../food-tracker.zip .
cd ..
```

Windows PowerShell: `Compress-Archive -Path dist\* -DestinationPath food-tracker.zip`.

### Step 16: Upload via the Amplify Console

Console → **AWS Amplify** → click your app (`food-tracker-<your-username>`) → click into the **trunk** branch → use the manual deploy / drop zone for that branch → upload `food-tracker.zip`.

If the Console UI for re-uploading to an existing branch isn't surfacing, fall back to the CLI:

```bash
aws s3 cp food-tracker.zip s3://<your-bucket>/food-tracker.zip
aws amplify start-deployment \
  --app-id $APP_ID --branch-name trunk \
  --source-url s3://<your-bucket>/food-tracker.zip --no-cli-pager
```

Wait 1–2 minutes.

### Step 17: Test the public URL

App overview shows a URL like `https://trunk.d1a2b3c4d5e6f7.amplifyapp.com`. Open it. Sign up (Cognito state doesn't carry from sandbox). Add a few food items. Test the chat panel.

---

## Part G (Optional): Deploy via GitHub Actions with OIDC

Skip if you don't have a GitHub account. Adds 30–45 minutes.

### Step 18: Fork the course repo and push your work

Fork `https://github.com/AWSClassroom-com/kiro_on_aws` to your account. Then:

```bash
cd path/to/your/local/food-tracker
git remote add fork https://github.com/<your-username>/kiro_on_aws.git
git push fork trunk
```

> If your local isn't a Git repo: `git init && git checkout -b trunk && git add . && git commit -m "lab work"`, then push. Use `--force` if needed.

### Step 19: Create the OIDC identity provider

IAM Console → **Identity providers** → **Add provider**:
- Type: **OpenID Connect**
- URL: `https://token.actions.githubusercontent.com`
- Audience: `sts.amazonaws.com`

### Step 20: Create the deploy role

IAM → **Roles** → **Create role** → **Web identity**:
- Provider: the GitHub provider above
- Audience: `sts.amazonaws.com`
- GitHub org: your username
- Repository: `kiro_on_aws`
- Branch: `trunk`

Attach `AdministratorAccess` (lab simplicity — production would scope down). Name it `food-tracker-github-deploy`. Copy the role ARN.

### Step 21: Generate the workflow file

In Kiro chat:

```
Create .github/workflows/deploy.yml. Trigger on push to trunk and PRs targeting trunk. Four jobs: lint, test, security, deploy.

- lint: npx biome ci src/ amplify/
- test: npm test
- security: npm audit --audit-level=high; plus a grep-based check for AKIA/ASIA prefixes in src/, amplify/, scripts/.
- deploy: needs [lint, test, security] AND if: github.ref == 'refs/heads/trunk'.
  - permissions: id-token: write, contents: read.
  - Steps: actions/checkout@v4, actions/setup-node@v4 (Node 20), aws-actions/configure-aws-credentials@v4 (role from secrets.AWS_DEPLOY_ROLE_ARN, region from secrets.AWS_REGION).
  - npm ci.
  - npx ampx pipeline-deploy --branch trunk --app-id ${{ secrets.AWS_AMPLIFY_APP_ID }}.
  - npm run build.
  - curl POST to ${{ secrets.AMPLIFY_FRONTEND_WEBHOOK_URL }} to trigger the Amplify hosted frontend build.

Pin all third-party actions to a major version (@v4). No @main / @master.
```

Confirm the generated file has both `id-token: write` AND `contents: read` (the second is silently required for `actions/checkout` once any explicit permission is set), and that the `if:` line is `'refs/heads/trunk'`, not `'refs/heads/main'`.

### Step 22: Configure the Amplify webhook and GitHub secrets

Amplify Console → your app → **App settings** → **Build settings** → **Incoming webhooks** → **Create webhook** → name `trunk-deploy`, branch `trunk` → copy the curl URL.

GitHub fork → **Settings** → **Secrets and variables** → **Actions** → add:
- `AWS_DEPLOY_ROLE_ARN` (from Step 20)
- `AWS_REGION`
- `AWS_AMPLIFY_APP_ID` (from Step 11)
- `AMPLIFY_FRONTEND_WEBHOOK_URL` (the URL portion of the curl command above)

### Step 23: Push and watch it run

```bash
git add .github/workflows/deploy.yml
git commit -m "ci: add deployment workflow"
git push fork trunk
```

GitHub fork → **Actions** tab. Lint, test, and security run in parallel. Deploy waits on all three. Total runtime 5–10 minutes.

### Step 24: Validate the safety net

Introduce a deliberate test failure. Push. Confirm:
- The failing job: red.
- The deploy job: marked **Skipped**, not Failed.

Revert the failure. Push. Deploy resumes.

---

## Validation Checklist

- [ ] Approved `requirements.md`, `design.md`, and `tasks.md` for the meal-agent-chat spec
- [ ] All tasks in `tasks.md` complete
- [ ] Sandbox redeployed cleanly with the new function
- [ ] Chat panel opens, accepts messages, returns responses naming real items from FoodItem
- [ ] sessionId threads turns within a conversation; "New conversation" resets it
- [ ] `ampx pipeline-deploy --branch trunk --app-id $APP_ID` completed
- [ ] Agent's `v1` alias re-pointed at a new version targeting the production `meal-recommendations` Lambda
- [ ] `food-tracker.zip` deployed to Amplify (Console or CLI fallback)
- [ ] Public Amplify URL loads, signup works, chat panel works against production backend
- [ ] (Optional, Part G) Workflow in `.github/workflows/deploy.yml`, secrets configured, deploy completes from a Git push, deploy is Skipped when an earlier job fails

---

## Summary

You used Kiro's spec workflow to add a chat panel feature to the food-tracker — a Lambda + AppSync custom query + React panel — calling the Bedrock Agent from Lab 3. Then you promoted the backend off the developer-tied sandbox onto a durable Amplify app and branch with `ampx pipeline-deploy`, and shipped the frontend with a manual zip upload. Optional Part G replaced the manual flow with GitHub Actions + OIDC, so every push to `trunk` runs lint, test, security, and deploy automatically with no AWS keys stored in GitHub.

Take-homes from this lab:

- Spec-driven works the same for an integration feature (calling another AWS service via Lambda) as for a UI feature.
- A versioned alias on a Bedrock Agent gives you the rollback boundary you'll want the first time something goes wrong in production.
- Manual zip deploy and GitHub Actions + OIDC are the same `ampx pipeline-deploy` underneath — different operational ceremony around it.
