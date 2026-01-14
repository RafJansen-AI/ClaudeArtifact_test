import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// Automatic GitHub Pages base path:
// - In GitHub Actions, set env GITHUB_PAGES=true (workflow below already does this).
// - GitHub provides GITHUB_REPOSITORY="owner/repo", we derive "/repo/" as base.
const isGithubPages = process.env.GITHUB_PAGES === 'true'
const repoName = process.env.GITHUB_REPOSITORY?.split('/')[1] ?? ''

export default defineConfig({
  plugins: [react()],
  base: isGithubPages && repoName ? `/${repoName}/` : '/',
})
