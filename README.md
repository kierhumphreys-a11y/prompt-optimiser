# Prompt Optimiser

Build better prompts through critique, not just formatting.

Instead of jumping straight to output, this tool asks the questions you should be asking yourself - identifying gaps, challenging assumptions, and surfacing edge cases before generating your prompt.

## The Flow

1. Choose: "Start with an idea" or "Assess my prompt"
2. (Optional) Tell us what's not working with your current approach
3. Answer the questions that matter (skip the rest)
4. Get a prompt built on solid foundations
5. Switch between Claude, GPT-5.2, Gemini 3, and Copilot to see the prompt adapted

---

## Deployment Guide (First Time)

### Prerequisites

You'll need:
- A computer with internet access
- An Anthropic API key (we'll get this in Step 1)
- A GitHub account (free)
- A Vercel account (free)

### Step 1: Get Your Anthropic API Key

1. Go to [console.anthropic.com](https://console.anthropic.com)
2. Sign in or create an account
3. Click **API Keys** in the left sidebar
4. Click **Create Key**
5. Name it something like "prompt-optimiser"
6. **Copy the key immediately** - you won't be able to see it again
7. Paste it somewhere safe (a notes app, password manager, etc.)

**Cost warning**: This key lets you spend money on API calls. The app costs roughly $0.005-0.01 per prompt generated. Set a spending limit in console.anthropic.com → Settings → Limits if you're worried about runaway costs.

### Step 2: Unzip the Project

1. Download the zip file
2. Unzip it to a folder you'll remember (e.g., Documents)
3. You should now have a folder called `prompt-optimiser` containing files like `package.json`, `app/`, etc.

### Step 3: Create a GitHub Repository

1. Go to [github.com](https://github.com) and sign in (or create an account)
2. Click the **+** icon in the top right corner
3. Click **New repository**
4. Repository name: `prompt-optimiser`
5. Leave it as **Public** (Vercel free tier requires public repos, or you pay $20/month)
6. **Do NOT** tick "Add a README file" - we already have one
7. Click **Create repository**
8. You'll see a page with setup instructions - **keep this tab open**

### Step 4: Push the Code to GitHub

Open **Terminal** (Mac) or **Command Prompt** (Windows).

Navigate to your project folder:
```bash
cd ~/Documents/prompt-optimiser
```
(Adjust the path if you unzipped elsewhere)

Run these commands one at a time:

```bash
git init
```

```bash
git add .
```

```bash
git commit -m "Initial commit"
```

```bash
git branch -M main
```

Now copy the command from your GitHub page that looks like this (use YOUR username):
```bash
git remote add origin https://github.com/YOUR-USERNAME/prompt-optimiser.git
```

Then:
```bash
git push -u origin main
```

**If it asks for credentials:**
- Username: your GitHub username
- Password: this is NOT your GitHub password. You need a Personal Access Token.

**To create a Personal Access Token:**
1. Go to GitHub → Click your profile picture → Settings
2. Scroll down to **Developer settings** (bottom left)
3. Click **Personal access tokens** → **Tokens (classic)**
4. Click **Generate new token** → **Generate new token (classic)**
5. Name it "prompt-optimiser deploy"
6. Tick the **repo** checkbox
7. Click **Generate token**
8. Copy the token and paste it as your password

### Step 5: Deploy to Vercel

1. Go to [vercel.com](https://vercel.com)
2. Click **Sign Up** → **Continue with GitHub**
3. Authorise Vercel to access your GitHub
4. Once logged in, click **Add New...** → **Project**
5. Find `prompt-optimiser` in the list and click **Import**
6. On the configuration screen:
   - Framework Preset should say "Next.js" - leave it
   - Expand **Environment Variables**
   - Click **Add**
   - Name: `ANTHROPIC_API_KEY`
   - Value: paste the API key you saved in Step 1
   - Click **Add** to save the variable
7. Click **Deploy**

### Step 6: Wait and Test

Vercel will build your app (takes about 60 seconds). When done, you'll see a URL like:
```
prompt-optimiser-abc123.vercel.app
```

Click it. Your app is live.

**Test it**: Try entering "Write an email to my team about a project delay" and go through the flow.

---

## Security - What's Protected and What Isn't

### Your API Key is Safe

✅ The API key is stored in Vercel's environment variables, not in your code
✅ It's never sent to the browser - all API calls go through your server
✅ Someone viewing your site cannot see or steal your key

### Rate Limiting is Basic

The app limits each IP address to 20 requests per minute. This prevents casual abuse but won't stop a determined attacker.

**If you're worried about abuse:**
1. Set a spending limit in your Anthropic console
2. Monitor your usage at console.anthropic.com
3. If you see unusual activity, rotate your API key

### Your Prompts Are Not Stored

The app doesn't save anything. Each session is independent. Your prompts and answers are not logged or stored by this app.

However:
- Anthropic may log API requests per their data policy
- If you're handling sensitive data, check Anthropic's data retention policies

### The Code is Public

If your GitHub repo is public (required for Vercel free tier), anyone can see your code. This is fine - the code doesn't contain secrets. Your API key is in Vercel's environment variables, not the code.

---

## After Deployment: Opening in Cursor

Once your app is live and you want to make changes:

### Option 1: Clone from GitHub (Recommended)

1. Open Cursor
2. Click **File** → **Open Folder**
3. Create a new folder for your project
4. Open Terminal in Cursor (View → Terminal)
5. Run:
```bash
git clone https://github.com/YOUR-USERNAME/prompt-optimiser.git .
```
6. Create a `.env.local` file with your API key:
```
ANTHROPIC_API_KEY=sk-ant-your-key-here
```
7. Run:
```bash
npm install
npm run dev
```
8. Open http://localhost:3000 to test locally

### Option 2: Open the Original Folder

If you still have the unzipped folder:

1. Open Cursor
2. Click **File** → **Open Folder**
3. Select your `prompt-optimiser` folder
4. Create `.env.local` with your API key (same as above)
5. Open Terminal and run `npm install` then `npm run dev`

### Making Changes

1. Edit files in Cursor
2. Test locally at http://localhost:3000
3. When happy, commit and push:
```bash
git add .
git commit -m "Description of changes"
git push
```
4. Vercel automatically redeploys when you push to GitHub

---

## Updating the Guidance

When vendors update their prompting documentation:

1. Open `/lib/guidance.js`
2. Find the relevant vendor section
3. Update the best practices, anti-patterns, etc.
4. Update the `lastUpdated` field
5. Commit and push - Vercel will redeploy automatically

Source URLs for each vendor are listed in the guidance file.

---

## Troubleshooting

### "ANTHROPIC_API_KEY not configured"
Your environment variable isn't set in Vercel. Go to your Vercel project → Settings → Environment Variables and add it.

### "API rate limit exceeded"
Either you've hit your Anthropic rate limit (check console.anthropic.com) or someone is hammering your app. Wait a few minutes and try again.

### The build failed on Vercel
Check the build logs in Vercel. Common issues:
- Missing dependencies: make sure `package.json` is correct
- Syntax errors: test locally first with `npm run dev`

### Git asks for password repeatedly
Set up SSH keys or use a credential helper. GitHub has guides for this.

### The app works locally but not on Vercel
Environment variables are different. Make sure `ANTHROPIC_API_KEY` is set in Vercel (not just in your local `.env.local`).

---

## Cost Estimate

- **Per prompt**: ~$0.005-0.01 (two API calls at Claude Sonnet rates)
- **100 prompts/month**: ~$0.50-1.00
- **1000 prompts/month**: ~$5-10

Set spending alerts in your Anthropic console to avoid surprises.

---

## Files Overview

```
prompt-optimiser/
├── app/
│   ├── api/analyse/route.js   # API proxy (hides key, rate limits)
│   ├── globals.css            # Tailwind styles
│   ├── layout.js              # Page wrapper
│   └── page.js                # Main UI
├── lib/
│   ├── guidance.js            # Model guidance data
│   └── prompts.js             # System prompts for Claude
├── .env.local.example         # Template for local env vars
├── .gitignore                 # Files to exclude from git
├── next.config.js             # Next.js config
├── package.json               # Dependencies
├── postcss.config.js          # CSS processing
├── tailwind.config.js         # Tailwind config
└── README.md                  # This file
```
