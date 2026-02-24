# Hosting the MagicPulse landing page on GitHub Pages

Two ways to get a URL like `https://YOUR_USERNAME.github.io/SITE_NAME/`.

---

## Option 1: New repo (simplest)

Good if you want a dedicated repo for the website (e.g. `magicpulse-website`).

1. **Create a new repo** on GitHub (e.g. `magicpulse-website`). Do **not** add a README (so the repo is empty).

2. **Push the landing files** as the only content in the repo root:

   ```bash
   cd /Users/danielhoffman/Desktop/MagicPulse/landing
   git init
   git add index.html privacy.html styles.css script.js
   git commit -m "Add MagicPulse landing page"
   git branch -M main
   git remote add origin https://github.com/YOUR_USERNAME/magicpulse-website.git
   git push -u origin main
   ```

   Replace `YOUR_USERNAME` and `magicpulse-website` with your GitHub username and repo name.

3. **Turn on GitHub Pages**
   - Repo → **Settings** → **Pages**
   - Under **Build and deployment**, **Source**: “Deploy from a branch”
   - **Branch**: `main` / **Folder**: `/ (root)` → **Save**

4. **Wait a minute or two**, then open:
   `https://YOUR_USERNAME.github.io/magicpulse-website/`

That’s your stable URL. Use it in App Store Connect as the **Privacy Policy URL** (e.g. `https://YOUR_USERNAME.github.io/magicpulse-website/privacy.html`).

---

## Option 2: Use the existing MagicPulse repo (gh-pages branch)

Good if you want the site at `https://YOUR_USERNAME.github.io/MagicPulse/` and keep the main branch for code only.

1. **Create a branch that contains only the site files:**

   ```bash
   cd /Users/danielhoffman/Desktop/MagicPulse
   git checkout --orphan gh-pages
   git reset --hard
   cp landing/index.html landing/privacy.html landing/styles.css landing/script.js .
   git add index.html privacy.html styles.css script.js
   git commit -m "Add landing page for GitHub Pages"
   git push -u origin gh-pages
   ```

   Then switch back to your main branch: `git checkout main` (or `master`).

2. **Turn on GitHub Pages**
   - MagicPulse repo → **Settings** → **Pages**
   - **Source**: “Deploy from a branch”
   - **Branch**: `gh-pages` / **Folder**: `/ (root)` → **Save**

3. **Site URL:** `https://YOUR_USERNAME.github.io/MagicPulse/`  
   **Privacy policy:** `https://YOUR_USERNAME.github.io/MagicPulse/privacy.html`

---

## After it’s live

- Use the **exact** privacy URL in **App Store Connect** → App → App Information → **Privacy Policy URL** (e.g. `https://YOUR_USERNAME.github.io/magicpulse-website/privacy.html`). It must be **HTTPS**.
- To update the site later: edit the files, commit, and push to the same branch. Pages will redeploy in a couple of minutes.
