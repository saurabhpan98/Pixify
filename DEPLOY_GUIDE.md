# 🚀 GitHub Pages Deployment Guide

This workspace has been configured with relative asset loaders and a pre-configured automated deployment script to make publishing this single-page applet to GitHub Pages as simple as possible.

---

## 📋 Steps to Deploy

Follow these steps to publish your Photo & PDF Resizer on GitHub Pages:

### Step 1: Create a GitHub Repository
1. Log in to your GitHub account.
2. Create a new, empty repository (e.g., `photo-pdf-resizer`).
3. Leave it public so GitHub Pages is free of charge.

### Step 2: Push Your Code to the Repository
Initialize git, add your files, commit, and push them to your new main branch:
```bash
git init
git add .
git commit -m "Ready for GitHub Pages deployment"
git branch -M main
git remote add origin https://github.com/<your-username>/<your-repo-name>.git
git push -u origin main
```

### Step 3: Enable GitHub Pages via Actions
1. Go to your repository page on GitHub.
2. Click on the **Settings** tab.
3. In the left sidebar, navigate to the **Pages** section (under *Code and automation*).
4. Under **Build and deployment**, locate the **Source** dropdown.
5. Change the source from **Deploy from a branch** to **GitHub Actions**.

---

## ⚙️ How It Works (Behind the Scenes)

1. **Relative Base Config (`vite.config.ts`)**: Lookups are set to `./` instead of `/`. This translates references cleanly to subfolders like `https://username.github.io/repository-name/` without losing style or script paths.
2. **Resilient Workflow (`.github/workflows/deploy.yml`)**: On every push to `main` or `master` branches, custom GitHub runners automatically build and deploy:
   - **Dual-Branch Support**: Works out of the box regardless of whether your local git default is set to `main` or `master`.
   - **Self-Healing Dependencies**: Runs `npm ci` first for high speed, but seamlessly falls back to legacy `npm install` if there are lockfile discrepancies or if `package-lock.json` was omitted from your commit.
   - **Jekyll Override (`.nojekyll`)**: Injects a `.nojekyll` bypass file automatically into `/dist` to prevent Jekyll from swallowing index layouts or asset folders on GitHub server networks.

---

## 🛠️ Resolving Common Actions Errors

If you encountered a red error indicator in GitHub Actions, it is usually due to one of these three common configurations:

### Issue A: Action is greyed out or did not trigger at all
* **Cause**: Your repository's primary branch on GitHub might be named `master` while your original workflow only watched for `main` (or vice-versa).
* **Fix**: **We have solved this!** The updated workflow listens to both `main` and `master`. Just push your code, and it will trigger automatically.

### Issue B: "The process '/usr/bin/git' failed with exit code 128" or Permission Denied
* **Cause**: By default, GitHub repositories sometimes restrict workflow tokens to read-only mode.
* **Fix**: 
  1. Go to your GitHub repository -> **Settings** -> **Actions** -> **General**.
  2. Scroll down to **Workflow permissions**.
  3. Select **Read and write permissions** (to allow GitHub Actions to publish the site artifacts).
  4. Click **Save**.

### Issue C: Mismatched lockfile or `npm ci` crash
* **Cause**: Committing code without pushing a matching `package-lock.json` or utilizing local package changes causes strict installers to abort.
* **Fix**: **We have solved this!** The updated YAML workflow detects if `package-lock.json` exists first, and falls back to a clean `npm install` gracefully if any initial dependency installation fails.
