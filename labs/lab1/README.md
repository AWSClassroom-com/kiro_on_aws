# Lab 1: Getting Started with Kiro

Install Kiro IDE, sign in to AWS, run the food-tracker starter app on AWS Amplify, set up steering files so Kiro understands the project, and try your first "vibe coding" session — adding features through natural language prompts.

**Time:** 60 minutes
**Course repo:** https://github.com/AWSClassroom-com/kiro_on_aws
The course repo has been pre-fetched and Node dependencies installed to prevent class day-of network errors blocking lab progress.

## Working with Kiro

- Open chat: `Cmd+L` (macOS) / `Ctrl+L` (Windows/Linux). Open command palette: `Cmd+Shift+P` / `Ctrl+Shift+P`.
- Prefer chat and command palette over clicking buttons — button labels change between versions.
- Agent output varies between runs. Expected results describe outcomes, not exact text. If something looks wrong, tell Kiro in chat.
- Always read diffs before accepting.

---

## Prerequisites

- [Git](https://git-scm.com)
- [Node.js 20+](https://nodejs.org) (npm comes bundled)
- [AWS CLI v2.32.0 or later](https://docs.aws.amazon.com/cli/latest/userguide/getting-started-install.html) (the `aws login` command requires this version)
- AWS Management Console credentials provided by your instructor — you'll use these in Part B.
- An [AWS Builder ID](https://profile.aws.amazon.com/) (free, separate from your AWS account — used to sign in to Kiro)

> The Amplify sandbox you'll start in Part C provisions a small DynamoDB table and an AppSync API in the AWS account your instructor provided. Costs during this lab are typically a few cents at most, and you'll tear the sandbox down at the end.

---

## Part A: Install Kiro

### Step 1: Download and/or install (if using the class VM, the Kiro installer is already in your /downloads folder. Proceed to install wizard below.)

Download from https://kiro.dev for your OS:

- **Windows: (class VM option)** "Download for Windows (x64) and run the downloaded 194mb `.exe` installer with default settings.
- **macOS:** open the `.dmg`, drag Kiro to Applications. If macOS blocks it, go to **System Preferences → Security & Privacy** and click **Open Anyway**.
- **Linux (Debian/Ubuntu):** `sudo dpkg -i kiro_*.deb`
- **Linux (Fedora/RHEL):** `sudo rpm -i kiro_*.rpm`

### On the install wizard:

- Accept the licence agreement.
- Leave default destination folder settings and choose 'Next'.
- Keep all defaults and keep pressing 'Next' until Kiro is installed.
- Make sure 'Launch Kiro' is checked and press 'Finish'.

### Step 2: Sign in with Builder ID

On the Kiro welcome screen, choose **Sign in** then select the option for **AWS Builder ID**.

- Existing Builder ID: enter email and password; complete MFA if enabled.
- New Builder ID: choose **Create one** and follow the email-verification flow.

### After entering your Builder ID information:

- Choose **Never** if prompted to Save your password by Google Chrome.
- On the Allow Kiro IDE to acess your data? screen, press **Allow Access**.
- After you play with the Kiro ghost logo and your mouse, close Google Chrome and return to Kiro.
- Choose **Skip All** for Configuration Imports.

You are now logged in to Kiro with your AWS Builder ID. Confirm this by hovering over the profile icon on the **bottom left** of the Kiro interface.

> Builder ID is free and separate from an AWS account — no credit card required. It's only used to authenticate to Kiro itself; the AWS credentials you'll set up in Part B are what give the Amplify sandbox access to AWS services.

- On the default Kiro screen, press **Open a project** and open the class project located here:
**c:/class-projects/kiro_on_aws/kiro-project/food-tracker**

- Trust the authors, dismiss any alerts and you're ready to build!

---

## Part B: Set Up AWS Credentials

The Amplify sandbox needs to call AWS services on your behalf. You'll authenticate the AWS CLI by signing in to the Management Console first, then running `aws login` from your terminal — a browser-based flow that hands the CLI a temporary 12-hour session. Full reference: [Sign in through the AWS CLI](https://docs.aws.amazon.com/signin/latest/userguide/command-line-sign-in.html).

### Step 3: Sign in to the AWS Management Console

In your browser, go to https://console.aws.amazon.com and sign in using the credentials your instructor provided (account ID or alias, IAM username, and password). Complete MFA if prompted.

Once you're in, take note of the **region selector** in the top-right corner — make sure it's set to the region your instructor specified for this class. You'll use the same region in the next step.

> Keep this browser tab open. The `aws login` command in Step 4 reuses this signed-in session to authenticate the CLI without asking for your password again.

### Step 4: Authenticate the AWS CLI with `aws login`

First, verify your AWS CLI version is at least **2.32.0** — earlier versions don't have the `aws login` command. In Kiro, open the integrated terminal: `` Ctrl+` `` (backtick), or **View → Terminal**.

Then copy and paste the below command and press ENTER:

```bash
aws --version
```

If the version is too old (or the CLI isn't installed), follow the [AWS CLI install/upgrade guide](https://docs.aws.amazon.com/cli/latest/userguide/getting-started-install.html), then re-check.

Now run:

```bash
aws login --region <your-region>
```

Replace `<your-region>` with the region from Step 3 (for example, `us-east-1` or `ap-southeast-2`).

Your default browser will open to a confirmation page. Because you're already signed in to the Management Console (Step 3), it should recognize your session — review what's being authorized and click **Allow** (or **Confirm**). When the page tells you authentication succeeded, return to your terminal.

Verify it worked:

```bash
aws sts get-caller-identity
```

You should see your account ID and IAM user ARN printed back. If you do, you're set — your CLI session is valid for the next 12 hours, which is plenty for this lab.

> If `aws login` fails with a permissions error, your IAM user is probably missing the [`SignInLocalDevelopmentAccess`](https://docs.aws.amazon.com/aws-managed-policy/latest/reference/SignInLocalDevelopmentAccess.html) managed policy. Let your instructor know.

---

## Part C: Set Up the Starter App

### Step 5: Clone the course repo (this step has been completed for you, please move to Step 6)

In Kiro, in the integrated terminal copy and paste the below command and press ENTER:

```bash
mkdir -p ~/class-projects && cd ~/class-projects
git clone https://github.com/AWSClassroom-com/kiro_on_aws
cd kiro_on_aws/kiro-project/food-tracker
```

### Step 6: Open the project in Kiro

`Cmd+Shift+P` / `Ctrl+Shift+P` → `File: Open Folder` → select `class-projects/kiro_on_aws/kiro-project/food-tracker`. When prompted, trust the authors.

The status bar will show an indexing indicator while Kiro analyzes the codebase.

### Step 7: Run the app

The food-tracker is an AWS Amplify Gen 2 app: a React + Vite frontend talking to an AppSync GraphQL API backed by DynamoDB. Getting it running is two terminals.

**Terminal 1 — install dependencies, then start the Amplify sandbox:**

In Kiro, make sure the integrated terminal is open: `` Ctrl+` `` (backtick), or **View → Terminal**.

Then copy and paste the below command and press ENTER:

```bash
npm install
npm run amplify:sandbox
```

This provisions a per-developer cloud backend (AppSync + DynamoDB) using the AWS credentials you set up in Part B, writes `amplify_outputs.json` to the project root, and auto-seeds the FoodItem table with 30 sample items on first deploy. Leave this terminal running — it watches `amplify/` for changes and redeploys automatically. **The first deploy takes several minutes**; subsequent updates are fast.

> If the command fails with a credentials error, your `aws login` session may have expired or wasn't completed cleanly. Re-run `aws login --region <your-region>` from Part B and try again.

**Terminal 2 — once `amplify_outputs.json` exists, start the Vite dev server:**

Split the terminal or open a new one (`` Ctrl+Shift+` ``), then:

```bash
npm run seed && npm run dev
```

Open `http://localhost:3000` in your browser. You should see the food-tracker app with sample entries.

> Leave both terminals running for the rest of the lab. Vite hot-reloads any changes Kiro makes under `src/` — no manual restart needed.

---

## Part D: Explore Kiro

### Step 8: Get oriented

Open each panel once so you know where things live:

- **File Explorer** (folder icon, left sidebar) — expand `src/` to see `routes/` and `components/`, and `amplify/` to see `backend.ts` and `data/resource.ts`.
- **Kiro Panel** (ghost icon in the activity bar) — Specs, Agent Hooks, Steering, Skills, MCP Servers.
- **Chat Panel** — `Cmd+L` / `Ctrl+L`, or via command palette `Kiro: Open Chat`.
- **Extensions** — `Cmd+Shift+X` / `Ctrl+Shift+X`. Search for **ESLint** (publisher: dbaeumer) and click **Install**.

### Step 9: Skim the codebase

Get a quick feel for the project before letting Kiro change things:

- `README.md` — tech stack overview and the npm scripts you just ran.
- `amplify/data/resource.ts` — the `FoodItem` schema. Note the `expirationDate` and `addedAt` fields — you'll use `expirationDate` in Part E.
- `src/routes/index.tsx` — the homepage. You'll restyle it in Part E.
- `src/routes/food-tracker.tsx` — the food-tracker page where most edits happen.

### Step 10: Generate steering files

Before any vibe coding, set Kiro up with steering files. Steering files are project-level markdown that Kiro loads on every interaction so it knows what your project is, what tech stack to stick to, and how the code is organized — without you having to explain it each time.

`Cmd+Shift+P` / `Ctrl+Shift+P`, search for **Steering**, and select **Kiro: Generate project steering documents**.

Kiro will explore key files (`README.md`, `package.json`, `amplify/`, `src/`) and create a `.kiro/steering/` folder with three files:

- `product.md` — what the project is, in plain language. Helps Kiro understand the big picture when you ask for changes.
- `tech.md` — the tech the project uses (React 19, TanStack Router, AWS Amplify Gen 2, Tailwind v4, Biome, etc.). Keeps Kiro from suggesting divergent tools.
- `structure.md` — key folders and files. Helps Kiro find the right place to make a change without flailing.

Open each file and skim it. If something is wrong (e.g., it lists a library you don't actually use, or misses something important about the data model), edit the file directly — these are just markdown, and your edits stick.

Lets add another instruction to our steering files via the chat panel, copy and paste this prompt in and then press ENTER:

```
Add to the steering files an instruction that tells Kiro everytime it updates a file to check the status of the the Amplify jobs via the AWS CLI, and to make sure everything is complete before moving on to the next task. If the jobs ever have a failed status then ask the user to rerun the sandbox to redeploy.
```

---

## Part E: Vibe Coding

For these steps, work in **Supervised mode** (Autopilot off) so you can review each diff before accepting. Vite picks up edits Kiro makes under `src/` automatically — no rebuild needed.

### Step 11: Add an "EXPIRING SOON" badge

Open a new session in the chat panel and send:

```
On the food tracker page (src/routes/food-tracker.tsx), add an "EXPIRING SOON" badge to each food entry card. The badge should appear only when the entry's expirationDate is within the next 3 days (today through 3 days from now). The badge should be orange with white text, positioned in the top-right corner of the card. Handle the case where expirationDate is null gracefully (do not show the badge). Do not change any other behavior.
```

Review the diff. If the date logic, styling, or null-handling looks off, push back in chat ("the badge is showing for entries 5 days out — please fix"). Accept when correct, then refresh `http://localhost:3000`.

### Step 12: Iterate on the badge

In the same chat, send:

```
Add a subtle pulse animation to the "EXPIRING SOON" badge to draw attention.
```

Review and accept. If the animation feels too aggressive, follow up:

```
Make the pulse animation slower and less pronounced.
```

### Step 13: Add a sort and filter bar

Start a new chat session for a clean context, then send:

```
On the food tracker page (food-tracker.tsx), add a sort and filter bar above the food entry cards inside FoodEntriesList.
- A text input that filters entries by name (case-insensitive)
- A dropdown to sort by: Default (newest first), Name (A–Z), Calories (high to low), Expiration Date (soonest first)
The filtering and sorting should be done in-memory using React state — do not change the Amplify data client calls or the schema in amplify/data/resource.ts. Entries with a null expiration date should appear last when sorting by expiration date. The bar should match the existing dark slate styling of the page.
```

Review and accept. Refresh the browser.

### Step 14: Restyle the homepage palette

Navigate to `http://localhost:3000` (the homepage) so you can see the change live. Start a new chat session, then send:

```
On the homepage only (src/routes/index.tsx), change the color theme from emerald/cyan to a warm sunset palette using amber, orange, and rose. Replace every emerald and cyan Tailwind class on this page (gradients, button backgrounds, hover states, accent colors, glow shadows, the pulsing dot in the badge, etc.) with appropriate amber/orange/rose equivalents. Keep the dark slate base and the overall structure exactly as-is — only the accent colors change. Do not modify any other route or component.
```

Review and accept. Refresh the homepage and confirm the hero gradient, the "Start Tracking Food" button, the feature card hover state, and the bottom CTA button all show the new warm palette. The food-tracker page should look unchanged.

### Step 15: Add a footer to the homepage

In the same chat, send:

```
Add a footer to the homepage (src/routes/index.tsx), placed below the existing CTA section.
Contents:
- Left: "© 2026 Food Tracker" plus a small tagline "Built with React, TanStack Router, and AWS Amplify".
- Right: three placeholder links — Docs, GitHub, Privacy — using href="#" for now.
Styling: match the rest of the page — dark slate background, gray-400 text, subtle top border (border-slate-700). Compact vertical padding. Single row on desktop (md and up), stacked on mobile.
Do not change anything else.
```

Review and accept. Refresh and resize the browser to confirm the layout switches from row to stacked at the mobile breakpoint.

---

## Validation Checklist

- [ ] Kiro installed and running; Builder ID shown in the bottom-left corner
- [ ] Signed in to AWS Management Console; `aws sts get-caller-identity` returns the expected account
- [ ] `npm run amplify:sandbox` running and `amplify_outputs.json` present; `npm run dev` running; food-tracker app reachable at `http://localhost:3000`
- [ ] Sample food entries visible
- [ ] `.kiro/steering/` folder contains `product.md`, `tech.md`, and `structure.md`
- [ ] EXPIRING SOON badge appears on food entries within 3 days of expiration
- [ ] Badge has a subtle pulse animation
- [ ] Filter bar and sort dropdown above the food entries list, both functional
- [ ] Homepage hero, feature cards, and CTAs use the warm amber/orange/rose palette (food-tracker page unchanged)
- [ ] Homepage has a footer with copyright, tagline, and three links — responsive at mobile breakpoint

---

## Cleanup

When you're done with the lab (or at the end of class), tear down the cloud sandbox so it stops costing anything, then end your CLI session:

```bash
npm run amplify:sandbox:delete
aws logout
```

The first command removes the AppSync API, DynamoDB table, and IAM resources Amplify provisioned for you. The second invalidates your `aws login` session.

---

## Summary

You installed Kiro, signed in with Builder ID, authenticated the AWS CLI with `aws login`, ran the food-tracker starter app on a personal AWS Amplify sandbox, generated steering files so Kiro understands the project on every future prompt, and used vibe coding — natural language prompts with diff-by-diff review — to add features. In Lab 2 you'll move from vibe coding to spec-driven development: building features with formal requirements, design documents, and sequenced tasks.
