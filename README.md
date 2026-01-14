# Climate Tipping Points Simulator (static site)

This is a small React + Vite wrapper around the interactive simulator component.

## Run locally

1) Install Node.js (LTS is fine).
2) In this folder:

```bash
npm install
npm run dev
```

Vite will print a local URL (usually http://localhost:5173).

## Option A (recommended): Netlify (free)

Fastest path: you can deploy without touching GitHub Actions.

1) Push this repo to GitHub (public or private).
2) In Netlify: **Add new site → Import an existing project** and pick the repo.
3) Build settings:
   - Build command: `npm run build`
   - Publish directory: `dist`

Netlify should detect these automatically for Vite projects.

## Option B: GitHub Pages (free)

This repo includes a workflow that builds and deploys automatically to GitHub Pages.

1) Push this repo to GitHub.
2) In the GitHub repo: **Settings → Pages**
3) Under **Build and deployment**, set **Source** = **GitHub Actions**.
4) Push a commit to `main` (or manually run the workflow).

Your site will appear at:
`https://<your-github-username>.github.io/<repo-name>/`

## Option C: Cloudflare Pages (free)

1) Push to GitHub.
2) In Cloudflare Pages: create a project, connect your GitHub repo.
3) Build command: `npm run build`
4) Output directory: `dist`

---

### Notes

- The simulator is 100% client-side (static hosting is enough).
- No backend, database, or API keys required.
