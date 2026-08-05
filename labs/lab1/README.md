# Lab 1: Getting Started with Kiro

**Objective:** By the end of this lab, you will have a complete working environment: Kiro installed and signed in, the AWS CLI authenticated, and the food-tracker starter app running against your own personal AWS Amplify sandbox. You will then complete your first vibe coding session: describing a change in plain language, reviewing the diff Kiro proposes, and accepting or pushing back. Every later lab builds on the environment and habits you set up here.

**Time:** 60 minutes<br>
**Course repo:** https://github.com/AWSClassroom-com/kiro_on_aws
The course repo has been pre-fetched and Node dependencies installed to prevent class day-of network errors blocking lab progress.

---

## Prerequisites

- [Git](https://git-scm.com)
- [Node.js 20+](https://nodejs.org) (npm comes bundled)
- [AWS CLI v2.32.0 or later](https://docs.aws.amazon.com/cli/latest/userguide/getting-started-install.html) (the `aws login` command requires this version)
- AWS Management Console credentials provided by your instructor (used in Part B)
- An [AWS Builder ID](https://profile.aws.amazon.com/) (free, separate from your AWS account, used to sign in to Kiro)

> Cost note: the Amplify sandbox you start in Part C provisions a small DynamoDB table, an AppSync API, two Lambda functions, and a Bedrock agent in the AWS account your instructor provided. Costs during this lab are typically a few cents at most, and you tear the sandbox down at the end.

---

## Part A: Install Kiro

If you are using the Course VM, Kiro has already been downloaded to your /downloads folder. Run the `.exe` installer with default settings and skip to "On the install wizard" below.

### Step 1: Download Kiro (own machine only)

Download from https://kiro.dev for your OS:

- Windows (class VM option): "Download for Windows (x64)" and run the downloaded 194mb `.exe` installer with default settings.
- macOS: open the `.dmg`, drag Kiro to Applications. If macOS blocks it, go to System Preferences > Security & Privacy and click Open Anyway.
- Linux (Debian/Ubuntu): `sudo dpkg -i kiro_*.deb`
- Linux (Fedora/RHEL): `sudo rpm -i kiro_*.rpm`

On the install wizard:

1. Accept the licence agreement.
2. Leave the default destination folder and choose **Next**.
3. Keep all defaults and keep pressing **Next** until Kiro is installed.
4. Make sure **Launch Kiro** is checked and press **Finish**.

### Step 2: Sign in with Builder ID

On the Kiro welcome screen, choose **Sign in**, then select **AWS Builder ID**.

- Existing Builder ID: enter email and password; complete MFA if enabled.
- New Builder ID: choose **Create one** and follow the email-verification flow.

After entering your Builder ID information:

1. Choose **Never** if Chrome offers to save your password.
2. On the "Allow Kiro IDE to access your data?" screen, press **Allow Access**.
3. Close the browser and return to Kiro.
4. Choose **Skip All** for Configuration Imports.

> Note: Builder ID is free and separate from an AWS account. It only authenticates you to Kiro itself. The AWS credentials you set up in Part B are what give the Amplify sandbox access to AWS services.

> **Checkpoint. Validate before continuing:**
> Hover over the profile icon in the bottom-left of the Kiro interface. It must show you are signed in with your Builder ID. If it does not, repeat Step 2.

### Step 3: Get the project onto your machine

If you are using the Course VM, the course repo is already cloned at `c:/class-projects/kiro_on_aws`. Skip to Step 4.

On your own machine, clone it from a terminal:

```bash
mkdir -p ~/class-projects && cd ~/class-projects
git clone https://github.com/AWSClassroom-com/kiro_on_aws
```

### Step 4: Open the project

On the Kiro start screen, press **Open a project** and select the `class-projects/kiro_on_aws/kiro-project/food-tracker` folder (on the Course VM: `c:/class-projects/kiro_on_aws/kiro-project/food-tracker`). When prompted, trust the authors.

The status bar shows an indexing indicator while Kiro analyzes the codebase.

---

## Part B: Set Up AWS Credentials

The Amplify sandbox needs to call AWS services on your behalf. You authenticate the AWS CLI by signing in to the Management Console first, then running `aws login` from your terminal: a browser-based flow that hands the CLI a temporary 12-hour session. Full reference: [Sign in through the AWS CLI](https://docs.aws.amazon.com/signin/latest/userguide/command-line-sign-in.html).

### Step 5: Sign in to the AWS Management Console

In your browser, go to https://console.aws.amazon.com and sign in using the credentials your instructor provided (account ID or alias, IAM username, and password). Complete MFA if prompted.

Check the region selector in the top-right corner and set it to the region your instructor specified. You use the same region in the next step.

> Note: keep this browser tab open. The `aws login` command in Step 6 reuses this signed-in session so the CLI can authenticate without asking for your password again.

### Step 6: Authenticate the AWS CLI with `aws login`

In Kiro, open the integrated terminal: Ctrl+` (backtick), or Terminal > New Terminal from the menu bar.

1. Verify your AWS CLI version is at least 2.32.0 (earlier versions do not have the `aws login` command):

```bash
aws --version
```

If the version is too old (or the CLI is not installed), follow the [AWS CLI install/upgrade guide](https://docs.aws.amazon.com/cli/latest/userguide/getting-started-install.html), then re-check.

2. Log in. Replace `<your-region>` with the region from Step 5 (for example `us-east-1` or `ap-southeast-2`):

```bash
aws login --region <your-region>
```

Your default browser opens a confirmation page. Review what is being authorized and click **Allow (or Confirm)**. When the page reports success, return to your terminal.

3. Verify:

```bash
aws sts get-caller-identity
```

> **Checkpoint. Validate before continuing:**
> `aws sts get-caller-identity` must print your account ID and IAM user ARN. If it fails with a permissions error, your IAM user is probably missing the [SignInLocalDevelopmentAccess](https://docs.aws.amazon.com/aws-managed-policy/latest/reference/SignInLocalDevelopmentAccess.html) managed policy; ask your instructor.

---

## Part C: Run the Starter App

The food-tracker is an AWS Amplify Gen 2 app: a React + Vite frontend talking to an AppSync GraphQL API backed by DynamoDB. Getting it running takes two terminals, one for the cloud backend and one for the frontend dev server. Leave both running for the rest of the lab.

### Step 7: Start the Amplify sandbox

Open the integrated terminal (CTRL+`) and run:

```bash
npm install && npm run amplify:sandbox
```

This provisions a per-developer cloud backend (AppSync API, DynamoDB, Cognito) using the AWS credentials from Part B, and writes `amplify_outputs.json` to the project root: the config file the frontend reads to find your backend.

The first deploy takes roughly 3-5 minutes. Leave this terminal running afterward; it watches the `amplify/` folder and automatically redeploys when backend files change.

> If the command fails with a credentials error, your `aws login` session may have expired. Rerun `aws login --region <your-region>` from Part B and try again.

> If the sandbox reports `MultipleSandboxInstancesError` (this can happen even with a single sandbox, due to a stale lock), press CTRL+C and rerun `npm run amplify:sandbox`. Your cloud resources are unaffected; the watcher just restarts.

> **Checkpoint. Validate before continuing:**
> 1. Terminal 1 shows the line `✔ Deployment completed`.
> 2. The file `amplify_outputs.json` exists in the project root (visible in the File Explorer).

### Step 8: Seed sample data and start the dev server

The sandbox terminal from Step 7 must stay running. Do not close it, do not press CTRL+C in it, and do not type this step's command into it.

Open a second terminal: Terminal > New Terminal from the menu bar (or CTRL+SHIFT+`). You now have two terminals; the sandbox keeps running in the first while you work in the new one.

In the new terminal, run:

```bash
npm run seed && npm run dev
```

The seed script loads 30 sample food items (with realistic added and expiration dates relative to today) into your DynamoDB table, then the Vite dev server starts. The seed is safe to rerun; it skips itself if the table already has data.

> **Checkpoint. Validate before continuing:**
> 1. Open `http://localhost:3000` in your browser. You must see the Food Tracker homepage.
> 2. Click **Start Tracking Food** (or open `http://localhost:3000/food-tracker`). The food-tracker page must show "30 items tracked" and a grid of food entry cards.
>
> Leave both terminals running for the rest of the lab. Vite hot-reloads any changes Kiro makes under `src/`; no manual restart is needed.

---

## Part D: Explore Kiro

### Step 9: Get oriented and install the Biome extension

Open each panel once so you know where things live:

- File Explorer (folder icon, left sidebar). Expand these folders one at a time:
  - Expand `src/`. You should see `routes/` and `components/` folders, plus `main.tsx` (the app entry point).
  - Expand `src/routes/`. You should see `index.tsx` (the homepage) and `food-tracker.tsx` (the main page).
  - Expand `amplify/`. You should see `backend.ts`, plus `auth/` and `data/` folders.
  - Expand `amplify/data/`. You should see `resource.ts` (the FoodItem schema).
- Kiro Panel (ghost icon in the activity bar): Specs, Agent Hooks, Steering, Skills, MCP Servers.
- Chat Panel: Cmd+L (macOS) / CTRL+L (Windows/Linux), or via command palette "Kiro: Open Chat".

Now install the Biome extension. This is required: Biome is the formatter and linter this project uses, and the format-on-save hook you build in Lab 3 depends on this tooling.

1. Open the Extensions panel: Cmd+SHIFT+X (macOS) / CTRL+SHIFT+X (Windows/Linux).
2. Search for "Biome" (publisher: biomejs).
3. Click **Install**.

> **Checkpoint. Validate before continuing:**
> The Biome extension shows as Installed in the Extensions panel.

### Step 10: Skim the codebase

| File | What to notice |
| --- | --- |
| `README.md` | Tech stack overview and the npm scripts you just ran |
| `amplify/data/resource.ts` | The `FoodItem` schema. Note the `expirationDate` and `addedAt` fields; you use `expirationDate` in Part E |
| `src/routes/index.tsx` | The homepage. You restyle it in Part E |
| `src/routes/food-tracker.tsx` | The food-tracker page where most edits happen. Note the `FoodEntriesList` component |

### Step 11: Generate steering files

Steering files are project-level markdown that Kiro loads on every interaction so it knows what your project is, what tech stack to stick to, and how the code is organized, without you having to explain it each time.

Open the command palette (Cmd+SHIFT+P / CTRL+SHIFT+P), search for "Steering", and select **Kiro: Generate project steering documents**.

> Note: Throughout these labs, prefer the command palette (Cmd+SHIFT+P / CTRL+SHIFT+P) over clicking buttons. Button labels change between Kiro versions; palette command names are stable.

Kiro explores key files (`README.md`, `package.json`, `amplify/`, `src/`) and creates a `.kiro/steering/` folder with three files:

- `product.md`: what the project is, in plain language.
- `tech.md`: the tech the project uses (React 19, TanStack Router, AWS Amplify Gen 2, Tailwind v4, Biome, etc.). Keeps Kiro from suggesting divergent tools.
- `structure.md`: key folders and files. Helps Kiro find the right place to make a change.

Open each file and skim it. If something is wrong (for example it lists a library you do not use), edit the file directly. These are plain markdown and your edits stick.

Now add one more instruction via the chat panel (Cmd+L / CTRL+L). Paste this prompt and press ENTER:

```
Add an instruction to the steering files: whenever you create or edit files under amplify/, remind the user to watch the Amplify sandbox terminal and wait for it to print "Deployment completed" before testing the change or moving on to the next task. If the sandbox terminal shows a failed deployment instead, tell the user to fix or restart the sandbox with npm run amplify:sandbox before continuing.
```

Review the diff Kiro proposes and accept it.

> Note: Backend changes are not live the moment a file is saved; the sandbox has to redeploy them first. This steering instruction makes Kiro remind you to wait at the right moments in every future lab.

> **Checkpoint. Validate before continuing:**
> 1. `.kiro/steering/` contains `product.md`, `tech.md`, and `structure.md`.
> 2. One of them includes the sandbox-deployment instruction you just added.

---

## Part E: Vibe Coding

Work in Supervised mode (Autopilot off) so you review each diff before accepting. Vite picks up edits under `src/` automatically; refresh the browser to see each change.

The loop for every step below is the same: prompt, read the diff, push back if needed, accept, refresh and verify.

> Note: Agent output varies between runs. The expected results below describe outcomes, not exact code or text. Always read the full diff before accepting. If anything looks wrong, say so in chat and let Kiro fix it before you accept.

### Step 12: Add an "EXPIRING SOON" badge

Open a new session in the chat panel and send:

```
On the food tracker page (src/routes/food-tracker.tsx), add an "EXPIRING SOON" badge to each food entry card. The badge should appear only when the entry's expirationDate is within the next 3 days (today through 3 days from now). Style it as a small orange pill with white text, absolutely positioned at the top-right corner of the card (for example -top-2 -right-2) so it slightly overlaps the card edge and does not cover the category pill inside the card. Handle the case where expirationDate is null gracefully (do not show the badge). Do not change any other behavior.
```

Review the diff. If the date logic, styling, or null-handling looks off, push back in chat (for example: "the badge is showing for entries 5 days out, please fix" or "items expiring exactly 3 days from now are not getting the badge, the window should include the full third day"). If the badge covers the category pill, say so. Accept when correct, then refresh `http://localhost:3000/food-tracker`.

**Expected result:** Items expiring within 3 days (several of the seeded items qualify) show the orange badge; shelf-stable items with no expiration date show nothing.

### Step 13: Iterate on the badge

In the same chat, send:

```
Add a subtle pulse animation to the "EXPIRING SOON" badge to draw attention.
```

Review and accept. If the animation feels too aggressive, follow up:

```
Make the pulse animation slower and less pronounced.
```

### Step 14: Add a sort and filter bar

Start a new chat session, then send:

```
On the food tracker page (food-tracker.tsx), add a sort and filter bar above the food entry cards inside FoodEntriesList.
- A text input that filters entries by name (case-insensitive)
- A dropdown to sort by: Default (newest first), Name (A-Z), Calories (high to low), Expiration Date (soonest first)
The filtering and sorting should be done in-memory using React state. Do not change the Amplify data client calls or the schema in amplify/data/resource.ts. Entries with a null expiration date should appear last when sorting by expiration date. The bar should match the existing dark slate styling of the page.
```

Review and accept. Refresh the browser.

**Expected result:** Typing in the filter box narrows the cards live; each sort option reorders them; items without an expiration date sink to the bottom when sorting by expiration.

### Step 15: Restyle the homepage palette

Navigate to `http://localhost:3000` (the homepage) so you can see the change live. Start a new chat session, then send:

```
On the homepage only (src/routes/index.tsx), change the color theme from emerald/cyan to a warm sunset palette using amber, orange, and rose. Replace every emerald and cyan Tailwind class on this page (gradients, button backgrounds, hover states, accent colors, glow shadows, the pulsing dot in the badge, etc.) with appropriate amber/orange/rose equivalents. Keep the dark slate base and the overall structure exactly as-is; only the accent colors change. Do not modify any other route or component.
```

Review and accept. Refresh the homepage.

**Expected result:** the hero gradient, the "Start Tracking Food" button, the feature-card hover state and accent bars, and the bottom CTA button all show the new warm palette. The food-tracker page and the nav bar are unchanged.

### Step 16: Add a footer to the homepage

In the same chat, send:

```
Add a footer to the homepage (src/routes/index.tsx), placed below the existing CTA section.
Contents:
- Left: "© 2026 Food Tracker" plus a small tagline "Built with React, TanStack Router, and AWS Amplify".
- Right: three placeholder links (Docs, GitHub, Privacy) pointing to https://example.com for now (the project's linter rejects empty "#" hrefs).
Styling: match the rest of the page. Dark slate background, slate-300 text, subtle top border (border-slate-700). Compact vertical padding. Single row on desktop (md and up), stacked on mobile.
Do not change anything else.
```

Review and accept. Refresh and resize the browser to confirm the layout switches from row to stacked at the mobile breakpoint.

---

## Lab 1 Outcomes

Lab 2 depends on all of these. Confirm them before moving on:

- [ ] Both terminals still running: the sandbox (terminal 1) and the dev server (terminal 2)
- [ ] App at `http://localhost:3000` with the seeded data and your Part E features working
- [ ] `.kiro/steering/` populated, including the sandbox-deployment instruction
- [ ] AWS CLI session valid (`aws sts get-caller-identity` succeeds)

---

## Summary

You installed Kiro, signed in with Builder ID, authenticated the AWS CLI with `aws login`, ran the food-tracker starter app on a personal AWS Amplify sandbox, seeded it with sample data, generated steering files so Kiro understands the project on every future prompt, and used vibe coding (natural language prompts with diff-by-diff review) to add features. In Lab 2, you move from vibe coding to spec-driven development: building features with formal requirements, design documents, and sequenced tasks.
