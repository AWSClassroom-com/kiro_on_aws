# Lab 1: Getting Started with Kiro

## Overview
In this lab, you will set up your development environment with Amazon Kiro, clone a starter application, and experience your first "vibe coding" session. You will add a feature to the application using natural language prompts, demonstrating how Kiro can accelerate rapid prototyping.

## Prerequisites
- A computer running Windows, macOS, or Linux
- Internet connection
- Git installed (download from https://git-scm.com if needed)
- Node.js v18 or higher (download from https://nodejs.org if needed)
- pnpm
- Docker Desktop
- An AWS Builder ID (free, no AWS account required)

## Time Estimate
50 minutes

## Learning Objectives
By the end of this lab, you will be able to:
- Install and configure Kiro IDE
- Authenticate using AWS Builder ID
- Clone and run a starter application
- Navigate the Kiro interface and understand key panels
- Use vibe coding to add features through natural language prompts

**Course Repository:** **https://github.com/AWSClassroom-com/kiro_on_aws**

---

## Part A: Installing Kiro IDE

### Step 1: Download Kiro

1. Open your web browser and navigate to **https://kiro.dev**
2. Click the **Download** button on the homepage
3. Select the installer for your operating system:
   - **Windows:** Download the `.exe` installer
   - **macOS:** Download the `.dmg` file
   - **Linux:** Choose `.deb` (Debian/Ubuntu) or `.rpm` (Fedora/RHEL)

**Expected Result:** The installer file (approximately 200 MB) downloads to your computer.

### Step 2: Install Kiro

**Windows:**
1. Double-click the downloaded `.exe` file
2. Accept the license agreement
3. Keep the default installation location
4. Click **Install**
5. When installation completes, click **Launch Kiro**

**macOS:**
1. Double-click the downloaded `.dmg` file
2. Drag the Kiro icon into the **Applications** folder
3. Open **Applications** and double-click **Kiro**
4. If macOS blocks the application:
   - Go to **System Preferences** > **Security & Privacy**
   - Click **Open Anyway** next to the Kiro message
   - Click **Open** in the confirmation dialog

**Linux (Debian/Ubuntu):**
```bash
sudo dpkg -i kiro_*.deb
```

**Linux (Fedora/RHEL):**
```bash
sudo rpm -i kiro_*.rpm
```

**Expected Result:** Kiro launches and displays the welcome screen.

### Step 3: Authenticate with Builder ID

1. In the Kiro welcome screen, click **Sign in with Builder ID**
2. If you already have an AWS Builder ID:
   - Enter your email and password
   - Complete any MFA verification if enabled
3. If you do not have a Builder ID:
   - Click **Create one**
   - Enter your email address
   - Create a password (minimum 8 characters)
   - Check your email for a verification code
   - Enter the verification code to complete registration

**Expected Result:** You are signed in and see the main Kiro interface. Your Builder ID email appears in the bottom-left corner of the window.

> **Note:** AWS Builder ID is free and separate from an AWS account. You do not need an AWS account or credit card to use Kiro.

---

## Part B: Clone and Run the Starter Application

### Step 4: Clone the Repository

1. In Kiro, open the integrated terminal:
   - **Windows/Linux:** Press `Ctrl + `` (backtick)
   - **macOS:** Press `ctrl + `` (backtick)
   - Or go to **View** > **Terminal**

2. Create and navigate to your projects directory:
   ```bash
   mkdir -p ~/class-projects && cd ~/class-projects
   ```

3. Clone the starter repository:
   ```bash
   git clone https://github.com/aws-samples/sample-food-tracker-tanstack-kiro
   ```

4. Change into the project directory:
   ```bash
   cd sample-food-tracker-tanstack-kiro
   ```

**Expected Result:** The repository is cloned and you are in the project directory.

### Step 5: Open the Project in Kiro

1. In Kiro, go to **File** > **Open Folder**
2. Navigate to the `sample-food-tracker-tanstack-kiro` folder you just cloned
3. Click **Select folder**
4. When prompted "Do you trust the authors of the files in this folder?", click **Yes, I trust the authors**

**Expected Result:** The project opens in Kiro. You will see an indexing indicator in the status bar as Kiro analyzes the codebase.

### Step 6: Install Dependencies and Run the Application

1. In the terminal, install project dependencies:
   ```bash
   npm install
   ```
   Wait for the installation to complete.

2. Create your environment file
   ```bash
   cp .env.example .env
   ```
   Wait for the installation to complete.

3. Generate the Drizzle migrations
   ```bash
   npm run db:generate
   ```
   What you should see:
   ```bash
   > drizzle-kit generate
     Reading config file '...drizzle.config.ts'
     1 tables
     food_items 14 columns 0 indexes 0 fks 
   ```
   
4. Start the development server:
   ```bash
   npm run dev
   ```

5. Open your web browser and navigate to:
   ```
   http://localhost:3000
   ```

**Expected Result:** You see an e-commerce storefront with product listings, categories, and a shopping cart.

---

## Part C: Explore the Kiro Interface

### Step 7: Navigate the IDE

1. **File Explorer:** In the left sidebar, click the top icon (folder) to open the file explorer. Expand the `src` folder to see:
   - `.kiro/` - The Kiro configuration
   - `src/` - The application source code
   - `src/db/` - Database layer
   - `src/routes/` - file-based routing
   - `src/components` - Top navigation, reusable UI
   - `docker-compose.yml` - Postgres container config

2. **Specs Panel:** Click the document icon (below the file explorer). This panel displays structured development artifacts (currently empty).

3. **Hooks Panel:** Click the icon below Specs. This panel shows automation hooks (currently empty).

4. **AI Chat Panel:** Click the Kiro icon to open the chat interface. You can also open it with:
   - **Windows/Linux:** `Ctrl + Shift + P`, then type "Kiro: Open Chat"
   - **macOS:** `Cmd + Shift + P`, then type "Kiro: Open Chat"

5. **Extensions:** Click the Extensions icon and search for **ESLint**. Click **Install** to add it.

**Expected Result:** You are familiar with the location of key panels in Kiro.

### Step 9: Explore the Codebase

1. Open `.kiro/specs/food-tracker/requirements.md` - Read at least one requirement
2. Open `src/routes/food-tracker.tsx` - This is where we'll make changes 

**Expected Result:** You understand the basic structure of the starter application.

---

## Part D: Your First Vibe Coding Session

### Step 9: Add a Feature with Natural Language

**Scenario:** Your product manager wants a "EXPIRING SOON" badge on any food entry that's within 3 days of its expiration date.

1. Open the AI Chat panel (Kiro icon in the activity bar)

2. Type the following prompt and press Enter:
   ```
    On the food tracker page (src/routes/food-tracker.tsx), add an "EXPIRING SOON" badge to each food entry card. The
    badge should appear only when the entry's expirationDate is within the next 3 days (today through 3 days from now).
    The badge should be orange with white text, positioned in the top-right corner of the card. Handle the case where
    expirationDate is null gracefully (do not show the badge). Do not change any other behavior.
   ```

3. Wait for Kiro to analyze the codebase and generate code

4. Review the diff view showing proposed changes:
   - Verify the date calculation logic is correct
   - Check that styling is appropriate
   - Confirm edge cases are handled (e.g., missing createdAt)

5. Click **Apply** to add the code to your file

6. Refresh your browser at `http://localhost:3000`

**Expected Result:** Products with expiration date display an orange "EXPIRING SOON" badge in the top-right corner.

### Step 10: Iterate on the Feature

1. In the AI Chat, type:
   ```
   Add a subtle pulse animation to the "EXPIRING SOON" badge to draw attention
   ```

2. Review and apply the generated code

3. Refresh your browser to see the pulse animation

4. If the animation is too aggressive, refine it:
   ```
   Make the pulse animation slower and less pronounced
   ```

5. Review and apply the code

**Expected Result:** The EXPIRING SOON badge now has a subtle pulse animation.

---

## Validation Checklist

Verify your lab completion by confirming:

- [ ] Kiro is installed and running
- [ ] Your Builder ID is displayed in the bottom-left corner of Kiro
- [ ] The starter application runs at `http://localhost:3000`
- [ ] Food Entries display correctly
- [ ] The EXPIRING SOON badge appears on expiring food entries
- [ ] The badge has a pulse animation

---

## Troubleshooting

### Issue: macOS blocks Kiro from opening
**Solution:** Go to **System Preferences** > **Security & Privacy** > **General** tab. Click **Open Anyway** next to the message about Kiro being blocked.

### Issue: Builder ID verification email not received
**Solution:** Check your spam/junk folder. The email comes from an amazon.com address. If behind a corporate firewall, ensure traffic to `builder.id.amazon.com` is allowed.

### Issue: `git` command not found
**Solution:** Install Git from https://git-scm.com. After installation, restart your terminal for the PATH to update.

### Issue: `npm` command not found
**Solution:** Install Node.js from https://nodejs.org (version 18 or higher). Restart your terminal after installation.

### Issue: EXPIRING SOON badge does not appear
**Solution:**
1. Verify the code changes were applied (check for the modified file indicator in the tab)
2. Hard refresh your browser with `Ctrl + Shift + R` (Windows/Linux) or `Cmd + Shift + R` (macOS)
3. Check that sample food entries in the sample data have `expiration dates` set

### Issue: Application shows errors on localhost:3000
**Solution:**
1. Ensure `npm install` completed without errors
2. Check that `npm run dev` is still running in the terminal
3. Look for error messages in the terminal output

---

## Summary

In this lab, you accomplished the following:

1. **Installed Kiro IDE** - Downloaded and configured Amazon's AI-native IDE built on Code-OSS
2. **Authenticated with Builder ID** - Set up your free developer identity for Kiro
3. **Set up the starter application** - Cloned the repository, installed dependencies, and ran the development server
4. **Explored the Kiro interface** - Located the file explorer, Specs panel, Hooks panel, AI Chat, and Extensions
5. **Experienced vibe coding** - Added a feature using natural language prompts and iterated through conversation

You now have a working development environment and have seen how Kiro enables rapid prototyping through natural language. In Lab 2, you will learn spec-driven development to build production-ready features with proper documentation and structure.
