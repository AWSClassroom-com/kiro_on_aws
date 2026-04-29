# Lab 1: Getting Started with Kiro

Install Kiro IDE, run the food-tracker starter app in Docker, and try your first "vibe coding" session — adding features through natural language prompts.

**Time:** 50 minutes
**Course repo:** https://github.com/AWSClassroom-com/kiro_on_aws

## Working with Kiro

- Open chat: `Cmd+L` (macOS) / `Ctrl+L` (Windows/Linux). Open command palette: `Cmd+Shift+P` / `Ctrl+Shift+P`.
- Prefer chat and command palette over clicking buttons — button labels change between versions.
- Agent output varies between runs. Expected results describe outcomes, not exact text. If something looks wrong, tell Kiro in chat.
- Always read diffs before accepting.

---

## Prerequisites

- [Git](https://git-scm.com)
- [Docker Desktop](https://www.docker.com/products/docker-desktop/) (running before Step 5)
- An [AWS Builder ID](https://profile.aws.amazon.com/) (free, no AWS account required)

The app and its Postgres database both run in Docker — you do **not** need Node.js, pnpm, or Postgres installed locally.

---

## Part A: Install Kiro

### Step 1: Download and install

Download from https://kiro.dev for your OS:

- **Windows:** run the `.exe` installer with default settings.
- **macOS:** open the `.dmg`, drag Kiro to Applications. If macOS blocks it, go to **System Preferences → Security & Privacy** and click **Open Anyway**.
- **Linux (Debian/Ubuntu):** `sudo dpkg -i kiro_*.deb`
- **Linux (Fedora/RHEL):** `sudo rpm -i kiro_*.rpm`

### Step 2: Sign in with Builder ID

Launch Kiro. On the welcome screen, choose **Sign in with Builder ID**.

- Existing Builder ID: enter email and password; complete MFA if enabled.
- New: choose **Create one** and follow the email-verification flow.

Your Builder ID email appears in the bottom-left corner when signed in.

> Builder ID is free and separate from an AWS account — no credit card required.

---

## Part B: Set Up the Starter App

### Step 3: Clone the course repo

Open the integrated terminal: `` Ctrl+` `` (backtick), or **View → Terminal**.

```bash
mkdir -p ~/class-projects && cd ~/class-projects
git clone https://github.com/AWSClassroom-com/kiro_on_aws
cd kiro_on_aws/kiro-project/sample-food-tracker-tanstack-kiro-alldocker
```

### Step 4: Open the project in Kiro

`Cmd+Shift+P` / `Ctrl+Shift+P` → `File: Open Folder` → select `sample-food-tracker-tanstack-kiro-alldocker`. When prompted, trust the authors.

The status bar will show an indexing indicator while Kiro analyzes the codebase.

### Step 5: Run the app

Make sure Docker Desktop is running, then in the terminal:

```bash
docker compose up --watch
```

This builds the app image, starts Postgres, runs migrations, seeds sample data, and starts the dev server with hot reload. First-run takes a few minutes; subsequent runs are fast.

Open `http://localhost:3000` in your browser. You should see the food-tracker app with sample entries.

> Leave this terminal running. Open a second terminal in Kiro (`` Ctrl+` `` again, or split the existing one) for any other commands.

---

## Part C: Explore Kiro

### Step 6: Get oriented

Open each panel once so you know where things live:

- **File Explorer** (folder icon, left sidebar) — expand `src/` to see `routes/`, `components/`, `db/`, plus `Dockerfile` and `docker-compose.yml` at the root.
- **Kiro Panel** (ghost icon in the activity bar) — Specs, Agent Hooks, Steering, Skills, MCP Servers.
- **Chat Panel** — `Cmd+L` / `Ctrl+L`, or via command palette `Kiro: Open Chat`.
- **Extensions** — `Cmd+Shift+X` / `Ctrl+Shift+X`. Search for **ESLint** (publisher: dbaeumer) and click **Install**.

### Step 7: Skim the codebase

- `.kiro/specs/food-tracker/requirements.md` — read at least one requirement to see the spec format.
- `src/routes/food-tracker.tsx` — this is where you'll make changes in Part D.

---

## Part D: Vibe Coding

For these steps, work in **Supervised mode** (Autopilot off) so you can review each diff before accepting. Edits Kiro makes on disk are picked up automatically by the running container — no rebuild needed.

### Step 8: Add an "EXPIRING SOON" badge

Open the chat panel and send:

```
On the food tracker page (src/routes/food-tracker.tsx), add an "EXPIRING SOON" badge to each food entry card. The badge should appear only when the entry's expirationDate is within the next 3 days (today through 3 days from now). The badge should be orange with white text, positioned in the top-right corner of the card. Handle the case where expirationDate is null gracefully (do not show the badge). Do not change any other behavior.
```

Review the diff. If the date logic, styling, or null-handling looks off, push back in chat ("the badge is showing for entries 5 days out — please fix"). Accept when correct, then refresh `http://localhost:3000`.

### Step 9: Iterate on the badge

In the same chat, send:

```
Add a subtle pulse animation to the "EXPIRING SOON" badge to draw attention.
```

Review and accept. If the animation feels too aggressive, follow up:

```
Make the pulse animation slower and less pronounced.
```

### Step 10: Add a sort and filter bar

Start a new chat session for a clean context, then send:

```
On the food tracker page (food-tracker.tsx), add a sort and filter bar above the food entry cards inside FoodEntriesList.
- A text input that filters entries by name (case-insensitive)
- A dropdown to sort by: Default (newest first), Name (A–Z), Calories (high to low), Expiration Date (soonest first)
The filtering and sorting should be done in-memory using React state — do not change any server functions or database logic. Entries with a null expiration date should appear last when sorting by expiration date. The bar should match the existing dark slate styling of the page.
```

Review and accept. Refresh the browser.

### Step 11: Restyle the homepage palette

Navigate to `http://localhost:3000` (the homepage) so you can see the change live. Start a new chat session, then send:

```
On the homepage only (src/routes/index.tsx), change the color theme from emerald/cyan to a warm sunset palette using amber, orange, and rose. Replace every emerald and cyan Tailwind class on this page (gradients, button backgrounds, hover states, accent colors, glow shadows, the pulsing dot in the badge, etc.) with appropriate amber/orange/rose equivalents. Keep the dark slate base and the overall structure exactly as-is — only the accent colors change. Do not modify any other route or component.
```

Review and accept. Refresh the homepage and confirm the hero gradient, the "Start Tracking Food" button, the feature card hover state, and the bottom CTA button all show the new warm palette. The food-tracker page should look unchanged.

### Step 12: Add a footer to the homepage

In the same chat, send:

```
Add a footer to the homepage (src/routes/index.tsx), placed below the existing CTA section.
Contents:
- Left: "© 2026 Food Tracker" plus a small tagline "Built with TanStack Start, Drizzle, and PostgreSQL".
- Right: three placeholder links — Docs, GitHub, Privacy — using href="#" for now.
Styling: match the rest of the page — dark slate background, gray-400 text, subtle top border (border-slate-700). Compact vertical padding. Single row on desktop (md and up), stacked on mobile.
Do not change anything else.
```

Review and accept. Refresh and resize the browser to confirm the layout switches from row to stacked at the mobile breakpoint.

---

## Validation Checklist

- [ ] Kiro installed and running; Builder ID shown in the bottom-left corner
- [ ] `docker compose up` running; food-tracker app reachable at `http://localhost:3000`
- [ ] Sample food entries visible
- [ ] EXPIRING SOON badge appears on food entries within 3 days of expiration
- [ ] Badge has a subtle pulse animation
- [ ] Filter bar and sort dropdown above the food entries list, both functional
- [ ] Homepage hero, feature cards, and CTAs use the warm amber/orange/rose palette (food-tracker page unchanged)
- [ ] Homepage has a footer with copyright, tagline, and three links — responsive at mobile breakpoint

---

## Summary

You installed Kiro, signed in with Builder ID, ran the food-tracker starter app entirely in Docker, and used vibe coding — natural language prompts with diff-by-diff review — to add features. In Lab 2 you'll move from vibe coding to spec-driven development: building features with formal requirements, design documents, and sequenced tasks.
