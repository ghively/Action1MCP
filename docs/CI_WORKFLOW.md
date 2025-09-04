# Continuous Integration: GitHub Actions

This repository includes a GitHub Actions workflow to automatically install, build, test, and audit the MCP server on every push and pull request.

## Why this CI?
- Reliability: catches type errors and failing tests before merge.
- Repeatability: runs the same Node version/commands across contributors.
- Visibility: PR checks and artifacts (compiled `dist/`) are available in the UI.

## What it does
- Triggers on `push`, `pull_request`, and manual `workflow_dispatch`.
- Uses Node.js 20 with npm cache.
- Steps:
  - `npm ci || npm install`: install dependencies (supports both lockfile/no-lockfile).
  - `npm run build`: compile TypeScript.
  - `npm test`: run vitest suite (mocked `fetch`, no live calls).
  - `npm run audit:endpoints`: print Spec Audit header and counts.
  - Uploads `dist/` as an artifact for quick download.

## File
- Workflow: `.github/workflows/ci.yml`

## How to use
- Push/PR to `main` (or default branch) and watch the “CI” check run.
- Manual run: go to GitHub → Actions → “CI” → “Run workflow”.
- Artifacts: open a successful run and download the `dist` artifact.

## Status badge
Add this to `README.md` (replace `OWNER/REPO`):
```
![CI](https://github.com/OWNER/REPO/actions/workflows/ci.yml/badge.svg)
```

## Secrets and safety
- The workflow does not use secrets by default. It only builds/tests locally with mocked network.
- Destructive operations remain disabled (`ALLOW_DESTRUCTIVE=false`).
- If you ever need secrets (e.g., to hit a staging API), add them in repo settings → Secrets and variables → Actions, then use `env:` in steps.

## Customize
- Node version: update `node-version` in `setup-node`.
- Add coverage: configure vitest coverage, then add a `Run coverage` step.
- Lint: add steps for ESLint/markdownlint if you introduce those tools.
- Matrix: expand to multiple Node versions via `strategy.matrix.node-version`.

## Troubleshooting
- NPM cache misses: ensure lockfile is committed for stable CI performance.
- TypeScript path issues: confirm `tsconfig.json` includes the intended files.
- Failing tests: open the run logs for error details; replicate locally with `npm test`.

