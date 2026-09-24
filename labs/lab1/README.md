# Lab 1: Getting Started with Kiro

**Objective:** By the end of this lab, you will have a complete working environment: Kiro installed and signed in, the AWS CLI authenticated, and the food-tracker starter app running against your own personal AWS Amplify sandbox. You will then complete your first vibe coding session: describing a change in plain language, reviewing the diff Kiro proposes, and accepting or pushing back. Every later lab builds on the environment and habits you set up here.

**Time:** 60 minutes<br>
**Course repo:** https://github.com/AWSClassroom-com/kiro_on_aws
The course repo has been prefetched and Node dependencies installed to prevent class day-of network errors blocking lab progress.

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

- Windows (class VM option): "Download for Windows (x64)" and run the downloaded `.exe` installer with default settings.
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

```
New-Item -ItemType Directory -Force "$HOME\class-projects"
```

```
cd "$HOME\class-projects"
```

```
git clone https://github.com/AWSClassroom-com/kiro_on_aws
```

### Step 4: Open the project

On the Kiro start screen, press **Open a project** and select the `class-projects/kiro_on_aws/kiro-project/food-tracker` folder (on the Course VM: `c:/class-projects/kiro_on_aws/kiro-project/food-tracker`). When prompted, trust the authors.

The status bar shows an indexing indicator while Kiro analyzes the codebase.

> [!WARNING]
> ⚠️ **Open the `/food-tracker/` folder, which is located inside of the `/kiro-project` folder within the repo you just cloned to your machine.**
>
> The repository contains several folders. The application lives in `kiro-project/food-tracker`, and that is the folder Kiro must have open. Opening the repository root instead looks correct and breaks the rest of the course in two ways.
>
> **Commands fail.** Kiro's terminal opens in whatever folder you opened. `package.json` lives in `food-tracker`, so Step 7 fails straight away:
>
> ```
> npm error code ENOENT
> npm error Could not read package.json
> ```
>
> **Kiro learns the wrong things about the project.** With the repository root open, Kiro reads the `labs/` folder as part of your codebase. In Step 11 it then writes steering files describing *the training course* rather than the food-tracker application, and it may generate Lab 2's specification before you reach Lab 2. Nothing warns you, and every later prompt inherits that wrong context.
>
> **Check before continuing:**
>
> 1. The Kiro window title reads **food-tracker**.
> 2. The File Explorer shows `src/`, `amplify/`, `scripts/` and `package.json` at the top level. If you can see a `labs/` folder, you have opened the wrong one.
>
> If either check fails, use **File > Open Folder** and select `kiro-project/food-tracker`. Do this now rather than later; steering files written from the wrong folder have to be deleted and regenerated.

---

## Part B: Set Up AWS Credentials

The Amplify sandbox needs to call AWS services on your behalf. You authenticate the AWS CLI by signing in to the Management Console first, then running `aws login` from your terminal: a browser-based flow that hands the CLI a temporary 12-hour session. Full reference: [Sign in through the AWS CLI](https://docs.aws.amazon.com/signin/latest/userguide/command-line-sign-in.html).

### Step 5: Sign in to the AWS Management Console

In your browser, go to https://console.aws.amazon.com and sign in using the credentials your instructor provided (account ID or alias, IAM username, and password). Complete MFA if prompted.

Check the region selector in the top-right corner and set it to the region your instructor specified. You use the same region in the next step.

> Note: keep this browser tab open. The `aws login` command in Step 6 reuses this signed-in session so the CLI can authenticate without asking for your password again.

### Step 6: Authenticate the AWS CLI with `aws login`

In Kiro, open the integrated terminal: CTRL+` (backtick), or Terminal > New Terminal from the menu bar.

1. Verify your AWS CLI version is at least 2.32.0 (earlier versions do not have the `aws login` command):

```bash
aws --version
```

If the version is too old (or the CLI is not installed), follow the [AWS CLI install/upgrade guide](https://docs.aws.amazon.com/cli/latest/userguide/getting-started-install.html), then recheck.

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

4. Confirm the default region is set. Every AWS SDK client in this project is constructed without an explicit region, so an unset default produces a "Region is missing" error later that does not explain itself:

```
aws configure get region
```

This must print a region. If it prints nothing, rerun `aws login --region <your-region>`.

5. Confirm you can actually invoke the model. Listing models is not the same as being able to call one, and access problems are much cheaper to find now than in Lab 2:

```
npx tsx scripts/test-bedrock.ts
```

> **Checkpoint. Validate before continuing:**
> The command prints a one-sentence greeting from Claude. If it returns `AccessDeniedException`, model access has not been enabled for this account; ask your instructor before going further. Nothing in Lab 2 or Lab 3 works until this does.
>
> This requires `npm install` to have run. If you get a missing-module error, complete Step 7 first and come back.

---

## Part C: Run the Starter App

The food-tracker is an AWS Amplify Gen 2 app: a React + Vite frontend talking to an AppSync GraphQL API backed by DynamoDB. Getting it running takes two terminals, one for the cloud backend and one for the frontend dev server. Leave both running for the rest of the lab.

### Step 7: Start the Amplify sandbox

> [!WARNING]
> ⚠️ **Choose your own sandbox name before you run anything, and write it down.**
>
> Everyone in this class shares one AWS account. Your sandbox is told apart from everyone else's by a single name, and **by default that name is the Windows username of the machine you are on**. On a classroom VM image every student has the same username, so without a name of your own you would all deploy on top of each other.
>
> Pick a short, lowercase, unique name. Letters and numbers only, no spaces. Combine your initials with a few random digits, for example `jd7215` or `amk904`. Do not use your machine name, `student`, `admin`, or anything a classmate might also pick.
>
> **Write it on paper or in a scratch file. You need the exact same name for every sandbox command in all four labs, including the cleanup at the end of Lab 4.** A different name creates a second sandbox and leaves the first one running and billing.
>
> Throughout the labs, replace `<your-sandbox-name>` with the name you chose.

Open the integrated terminal (CTRL+`).

Install dependencies first:

```
npm install
```

Then start the sandbox, substituting your own name:

```
npm run amplify:sandbox -- --identifier <your-sandbox-name>
```

> Note: the `--` before `--identifier` is required. It tells npm to pass the option through to the sandbox rather than interpreting it itself.

> Note: these are two separate commands. Do not join them with `&&`. Kiro's terminal on Windows is PowerShell, which does not support `&&` and will fail with `The token '&&' is not a valid statement separator in this version.`

This provisions a per-developer cloud backend (AppSync API, DynamoDB, Cognito) using the AWS credentials from Part B, and writes `amplify_outputs.json` to the project root: the config file the frontend reads to find your backend.

The first deploy takes roughly 3-5 minutes. Leave this terminal running afterward; it watches the `amplify/` folder and automatically redeploys when backend files change.

> [!NOTE]
> ℹ️ **Name this terminal now.** Kiro labels a terminal tab after whatever process is in the foreground, so this one will read `node`, then `esbuild`, then `Kiro` as the work changes. By Lab 4 you will have five tabs and no reliable way to tell them apart. Right click the tab, choose **Rename**, and call it `sandbox`. Every later step in every lab refers to it by that name.

> If the command fails with a credentials error, your `aws login` session may have expired. Rerun `aws login --region <your-region>` from Part B and try again.

> If the sandbox reports `MultipleSandboxInstancesError`, there are two possible causes and they need different fixes. Rerunning the command clears neither.
>
> **Cause 1, a leftover process.** Stopping a sandbox with CTRL+C does not always stop the background process it started, and starting another one adds a second. Close all sandbox processes, then start one:
>
> ```
> Get-CimInstance Win32_Process -Filter "Name='node.exe'" | Where-Object { $_.CommandLine -match 'amplify:sandbox|ampx.js' } | Stop-Process -Force
> ```
>
> **Cause 2, a stale lock file.** Read the PID in the error message. If that PID is the only sandbox running, it has deadlocked against its own lock, which happens when files change while a deploy is already in progress. The lock file outlives the process, so CTRL+C and rerun fails in exactly the same way. Press CTRL+C, clear the lock, then restart the sandbox in that same terminal:
>
> ```
> Remove-Item ".amplify\artifacts\cdk.out\read.*.lock" -Force -ErrorAction SilentlyContinue
> ```

>  [!WARNING]
> ⚠️ **This failure is quiet.** After the error the sandbox prints `Watching for file changes...` and looks perfectly healthy, while nothing you save reaches AWS. In a real run it went unnoticed for hours. If a deploy you are expecting never appears, check here first.
>
> Your cloud resources are unaffected by either fix.

> **Checkpoint. Validate before continuing:**
> 1. The `sandbox` terminal shows the line `✔ Deployment completed`.
> 2. The file `amplify_outputs.json` exists in the project root (visible in the File Explorer).

### Step 8: Seed sample data and start the dev server

The sandbox terminal from Step 7 must stay running. Do not close it, do not press CTRL+C in it, and do not type this step's command into it.

Open a second terminal: Terminal > New Terminal from the menu bar (or CTRL+SHIFT+`). Right click the new tab, choose **Rename**, and call it `dev`. You now have two named terminals, `sandbox` and `dev`. The sandbox keeps running while you work in the new one.

In the new terminal, run these as two separate commands. Wait for the first to finish before starting the second:

```
npm run seed
```

```
npm run dev
```

The seed script loads 30 sample food items (with realistic added and expiration dates relative to today) into your DynamoDB table, then the Vite dev server starts. The seed is safe to rerun; it skips itself if the table already has data.

> **Checkpoint. Validate before continuing:**
> 1. Open `http://localhost:3000` in your browser. You must see the Food Tracker homepage.
> 2. Click **Start Tracking Food** (or open `http://localhost:3000/food-tracker`). The page first shows "0 items tracked" and "Loading your food items..." for a second or two. Wait for it to finish loading, then confirm it shows "30 items tracked" and a grid of food entry cards.
>
> Leave both terminals running for the rest of the lab. Vite hot-reloads any changes Kiro makes under `src/`; no manual restart is needed.

---

## Part D: Explore Kiro

> [!WARNING]
> ⚠️ **Set two things in the chat panel before you send a single prompt.** Open it with CMD+L (macOS) / CTRL+L (Windows/Linux).
>
> **1. Model: choose Haiku 4.5.** Click the model selector at the bottom of the input box. Do not leave it on **Auto**.
>
> Everything from Step 11 onward spends credits. In testing, one steering-generation command on Auto consumed roughly **a quarter of the 50-credit monthly free tier**, took **over 6 minutes**, and hit rate limits twice. The same work on Haiku 4.5 finished in **28 seconds**. You will run dozens of prompts across the four labs. On Auto you will run out of credits before you finish.
>
> **2. Autopilot: turn it off.** Autopilot is **on by default**.
>
> While Autopilot is on, Kiro applies its changes straight to your files and there is no diff to approve. Step 11 below, and every step in Part E, asks you to review a proposed diff before accepting it. None of that happens until you switch Autopilot off.
>
> Both settings are per-window. If you close Kiro or open a different folder, set them again.

### Step 9: Get oriented and install the Biome extension

Open each panel once so you know where things live:

- File Explorer (folder icon, left sidebar). Expand these folders one at a time:
  - Expand `src/`. You should see `routes/` and `components/` folders, plus `main.tsx` (the app entry point).
  - Expand `src/routes/`. You should see `index.tsx` (the homepage) and `food-tracker.tsx` (the main page).
  - Expand `amplify/`. You should see `backend.ts`, plus `auth/` and `data/` folders.
  - Expand `amplify/data/`. You should see `resource.ts` (the FoodItem schema).
- Kiro Panel (ghost icon in the activity bar). You should see four sections: **Specs**, **Agent Hooks**, **Agent Steering & Skills**, and **MCP Servers**. Steering and Skills share one section; they are not listed separately.
- Chat Panel: CMD+L (macOS)/CTRL+L (Windows/Linux), or via command palette "Kiro: Open Chat".

Now install the Biome extension. This is required: Biome is the formatter and linter this project uses, and the format-on-save hook you build in Lab 3 depends on this tooling.

1. Open the Extensions panel: CMD+SHIFT+X (macOS)/CTRL+SHIFT+X (Windows/Linux).
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

Open the command palette (CMD+SHIFT+P/CTRL+SHIFT+P), search for "Steering", and select **Kiro: Generate project steering documents**.

> Note: Throughout these labs, prefer the command palette (CMD+SHIFT+P/CTRL+SHIFT+P) over clicking buttons. Button labels change between Kiro versions; palette command names are stable.

Kiro explores key files (`README.md`, `package.json`, `amplify/`, `src/`) and proposes a `.kiro/steering/` folder with three files:

- `product.md`: what the project is, in plain language.
- `tech.md`: the tech the project uses (React 19, TanStack Router, AWS Amplify Gen 2, Tailwind v4, Biome, etc.). Keeps Kiro from suggesting divergent tools.
- `structure.md`: key folders and files. Helps Kiro find the right place to make a change.

> [!WARNING]
> ⚠️ **Click Accept all. The files do not exist until you do.**
>
> Kiro does not write the files straight to disk. It shows a **Review changes (3 of 3 pending)** panel listing one change each to `product.md`, `tech.md` and `structure.md`, with a check and a cross beside each, and **Accept all** and **Reject all** at the bottom.
>
> Click **Accept all**.
>
> Until you do, `.kiro/steering/` is empty and the next instruction has nothing to open. If you scroll past the panel, or click **Cancel**, the work is discarded and Step 11 has to be repeated at the cost of more credits.

Once the files are written, open each one and skim it. If something is wrong (for example it lists a library you do not use), edit the file directly. These are plain markdown and your edits stick.

Now add one more instruction via the chat panel (CMD+L/CTRL+L). Paste this prompt and press ENTER:

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

Confirm Autopilot is still off before you start, so you review each diff before accepting it. You turned it off at the beginning of Part D, but the setting is per-window and resets if you reopened Kiro. Vite picks up edits under `src/` automatically; refresh the browser to see each change.

The loop for every step below is the same: prompt, read the diff, push back if needed, accept, refresh and verify.

> Note: Agent output varies between runs. The expected results below describe outcomes, not exact code or text. Always read the full diff before accepting. If anything looks wrong, say so in chat and let Kiro fix it before you accept.

> [!WARNING]
> ⚠️ **Kiro will ask permission to run commands. Click "Always allow" the first time.**
>
> While working on these steps Kiro checks its own work, usually by running `npm run build`. Each time it does, it stops and shows:
>
> ```
> Your approval is required to continue: npm run build
>   [Allow]  [Always allow]  [Deny]  [Always deny]
> ```
>
> Click **Always allow**. **Allow** permits it once and you will be asked again on the next step.

Always allow applies to that exact command. Kiro may choose a different command later, for example `npx tsc --noEmit`, and will ask again. Click **Always allow** each time. This is expected and does not mean the setting failed.
>
> Do not click **Deny** or **Always deny**. Kiro cannot verify its work, and Always deny blocks the command for future sessions too.
>
> This dialog is not the same as the **Run/Trust/Reject** dialog you may see elsewhere. Kiro has more than one way of asking.

> [!NOTE]
> ℹ️ **If a prompt appears to do nothing, look for a pending approval before assuming it failed.**
>
> Kiro pauses and waits for you at several points. It may show a **Run** button to execute a command, or an **Accept** button to apply a diff. Until you click, nothing happens and no error is shown.
>
> Steps 14 and 15 below ask you to start new chat sessions. An approval left pending in an earlier session stays there and is easy to miss, because you are now looking at a different session. If a step seems to have had no effect, scroll back through your earlier chat sessions and check for an unclicked button.

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

> [!NOTE]
> ℹ️ **Kiro may ask for a pattern-based permission on this step. Accept it.**
>
> When Kiro builds a more complex command, for example piping build output through `Select-String` to find errors, the approval dialog looks different from the simple Allow prompt:
>
> ```
> Your approval is required to continue: npm run build 2>&1 | Select-String ...
>
>   Pattern    [ Select-String *          ]
>   Apply to   [ This workspace           ]
>
>   [Always allow]   [Cancel]
> ```
>
> Leave both dropdowns as they are and click **Always allow**.
>
> This grants permission for a **class** of commands rather than one exact command. `Select-String *` means any `Select-String` command, and **This workspace** limits it to this project rather than everything you open in Kiro. Both defaults are the narrow, sensible choice here.
>
> You are seeing this because Kiro checks its own work after each change. It is not a sign that something went wrong.

### Step 15: Restyle the homepage palette

Navigate to `http://localhost:3000` (the homepage) so you can see the change live. Start a new chat session, then send:

```
On the homepage only (src/routes/index.tsx), change the color theme from emerald/cyan to a warm sunset palette using amber, orange, and rose. Replace every emerald and cyan Tailwind class on this page (gradients, button backgrounds, hover states, accent colors, glow shadows, the pulsing dot in the badge, etc.) with appropriate amber/orange/rose equivalents. Keep the dark slate base and the overall structure exactly as-is; only the accent colors change. Do not modify any other route or component.
```

Review and accept. Refresh the homepage.

**Expected result:** the hero gradient, the "Start Tracking Food" button, the feature-card hover state and accent bars, and the bottom CTA button all show the new warm palette. The food-tracker page and the nav bar are unchanged.

This step asks for an exhaustive replacement across a whole file, and a partial result is common. The badge near the top may change while the larger elements stay green, which is easy to miss at a glance.

> **Checkpoint. Validate before continuing:**
> Open `src/routes/index.tsx` and use Find (CMD+F / CTRL+F) to search for `emerald` and then `cyan`. **Both must return zero results.** Checking by eye is not reliable here.

If either search returns a match, push back in chat:

```
You only changed part of the page. Search src/routes/index.tsx for emerald and cyan and replace every remaining one with an amber, orange, or rose equivalent. Do not modify any other route or component.
```

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

- [ ] Both terminals still running: `sandbox` and `dev`
- [ ] App at `http://localhost:3000` with the seeded data and your Part E features working
- [ ] `.kiro/steering/` populated, including the sandbox-deployment instruction
- [ ] AWS CLI session valid (`aws sts get-caller-identity` succeeds)

---

## Summary

You installed Kiro, signed in with Builder ID, authenticated the AWS CLI with `aws login`, ran the food-tracker starter app on a personal AWS Amplify sandbox, seeded it with sample data, generated steering files so Kiro understands the project on every future prompt, and used vibe coding (natural language prompts with diff-by-diff review) to add features. In Lab 2, you move from vibe coding to spec-driven development: building features with formal requirements, design documents, and sequenced tasks.
