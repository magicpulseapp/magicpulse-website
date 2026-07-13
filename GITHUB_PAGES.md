# Hosting the MagicPulse landing page on GitHub Pages

**Production domain:** `https://www.magicpulse.app` — use **`https://www.magicpulse.app/privacy.html`** and **`https://www.magicpulse.app/support.html`** in **App Store Connect** (Privacy Policy URL + Support URL). The iOS app’s `PrivacyPolicyURL` in Info.plist matches.

Below: generic GitHub Pages setup if you use a `*.github.io` URL instead.

---

Two ways to get a URL like `https://YOUR_USERNAME.github.io/SITE_NAME/`.

---

## Option 1: New repo (simplest)

Good if you want a dedicated repo for the website (e.g. `magicpulse-website`).

1. **Create a new repo** on GitHub (e.g. `magicpulse-website`). Do **not** add a README (so the repo is empty).

2. **Push the landing files** as the only content in the repo root:

   ```bash
   cd /path/to/magicpulse-website
   git init
   git add .   # includes 404.html, app-ads.txt, og-image.jpg, _headers, fonts/, apple-touch-icon.png
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
   cd /path/to/MagicPulse
   git checkout --orphan gh-pages
   git reset --hard
   cp -R /path/to/magicpulse-website/. .   # copy the whole site, including fonts/ and dotless config files
   rm -rf README.md GITHUB_PAGES.md        # optional: keep the branch site-only
   git add .
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

## Custom domain

You can serve the site from your own domain (e.g. `https://magicpulse.app`) instead of `*.github.io`.

1. **Add the domain in GitHub**
   - Repo → **Settings** → **Pages**
   - Under **Custom domain**, enter your domain (e.g. `magicpulse.app` or `www.magicpulse.app`)
   - Click **Save**. GitHub may show a DNS checklist.

2. **Configure DNS at your domain registrar**

   **GoDaddy**
   - Sign in at [godaddy.com](https://www.godaddy.com) → **My Products** → click your domain → **DNS** (or **Manage DNS**).
   - **Option A — Use `www` (e.g. www.yourdomain.com)** — recommended on GoDaddy:
     - Click **Add** (or **Add Record**).
     - **Type:** CNAME | **Name:** `www` | **Value:** `YOUR_USERNAME.github.io` (replace with your GitHub username).
     - **TTL:** 600 or 1 Hour → **Save**.
     - In GitHub Pages custom domain, enter `www.yourdomain.com`.
   - **Option B — Use apex/root (e.g. yourdomain.com with no www):**
     - Remove any existing **A** or **CNAME** records for the root (`@`) if they conflict.
     - Add **four A records**: for **Name** use `@` (or leave blank for root). For **Value** use each GitHub IP, one record per IP:
       - `185.199.108.153`
       - `185.199.109.153`
       - `185.199.110.153`
       - `185.199.111.153`
     - TTL: 600 or 1 Hour → **Save** each.
     - In GitHub Pages custom domain, enter `yourdomain.com`.
   - DNS can take from a few minutes up to 24–48 hours to propagate. You can check status in GitHub under **Settings** → **Pages** → Custom domain.

   **Other registrars**
   - **Apex domain** (e.g. `magicpulse.app`): Add **A records** to `185.199.108.153`, `185.199.109.153`, `185.199.110.153`, `185.199.111.153`. Or use **ALIAS** / **ANAME** to `YOUR_USERNAME.github.io` if supported.
   - **Subdomain** (e.g. `www.magicpulse.app`): Add **CNAME** name `www`, value `YOUR_USERNAME.github.io`.

3. **Enforce HTTPS**
   - Back in **Settings** → **Pages**, enable **Enforce HTTPS** once DNS has propagated and GitHub has verified the domain (can take a few minutes to 24 hours).

4. **Optional: CNAME file (for custom domain on a project site)**
   - If you use a project site (e.g. `YOUR_USERNAME.github.io/magicpulse-website`) and add a custom domain, GitHub may ask you to add a file named `CNAME` in the repo root containing only your domain (e.g. `magicpulse.app`). Create the file, commit, and push.

After DNS propagates, your site will be available at your custom domain over HTTPS. Use that URL (e.g. `https://magicpulse.app/privacy.html`) for App Store Connect and elsewhere.

### Canonical host: `www` vs apex

This repo’s **`CNAME`** file is set to **`www.magicpulse.app`**, and page **`<link rel="canonical">`** tags use **`https://www.magicpulse.app/...`**. For SEO and consistent analytics:

- Prefer sending all traffic to **`https://www.magicpulse.app`**.
- Configure **apex** `magicpulse.app` → **301 redirect** to `https://www.magicpulse.app` using your registrar’s redirect feature, a **CNAME/ALIAS** apex-to-www pattern, or a CDN (e.g. Cloudflare forwarding rule). If both hostnames point at GitHub Pages without a redirect, search engines may see duplicate URLs.

### `_headers`, security headers, and caching

The repo root **`_headers`** file sets browser security headers and **Cache-Control** for fonts, CSS, JS, and HTML. **GitHub Pages does not process `_headers`.** It is honored on **Netlify**, **Cloudflare Pages**, and similar hosts. Each HTML page also carries a CSP meta fallback, but HSTS, frame protection, MIME protection, and Permissions Policy still require real response headers.

For the current GitHub Pages plus Cloudflare setup:

1. In Cloudflare, open **Rules → Transform Rules → Modify Response Header** and create a rule for host `www.magicpulse.app`.
2. Copy the `Content-Security-Policy`, `X-Content-Type-Options`, `Referrer-Policy`, and `Permissions-Policy` values from **`_headers`** into static response-header actions.
3. Open **SSL/TLS → Edge Certificates → HTTP Strict Transport Security (HSTS)** and enable a one-year max age, include subdomains, and preload only while every subdomain is HTTPS-ready.
4. Purge the Cloudflare cache and verify the live response with `curl -I https://www.magicpulse.app/`.

The expected response must include `content-security-policy`, `strict-transport-security`, `x-content-type-options`, `referrer-policy`, and `permissions-policy`.

---

## After it’s live

- Use the **exact** privacy URL in **App Store Connect** → App → App Information → **Privacy Policy URL** (e.g. `https://YOUR_USERNAME.github.io/magicpulse-website/privacy.html` or `https://magicpulse.app/privacy.html`). It must be **HTTPS**.
- To update the site later: edit the files, commit, and push to the same branch. Pages will redeploy in a couple of minutes.
