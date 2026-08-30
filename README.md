# GOD Mode landing page

[![CI](https://github.com/Hiw4i/GOD-Mode/actions/workflows/ci.yml/badge.svg)](https://github.com/Hiw4i/GOD-Mode/actions/workflows/ci.yml)

GOD Mode is a cinematic one-page product site built with Next.js App Router, React, TypeScript, GSAP, Lenis, and locally hosted media. Production is exported as static HTML/CSS/JavaScript and served at [godmode.vaneev.com](https://godmode.vaneev.com).

## Requirements

- Node.js 24.x
- Corepack
- pnpm 11.24.0 (declared in `package.json`)
- PowerShell 7 and WinSCP for FTPS deployment

## Local development

```powershell
corepack enable
corepack pnpm install --frozen-lockfile
corepack pnpm dev
```

Open `http://localhost:3000`. The `predev` task regenerates derived blur assets before Next.js starts.

## Quality checks

```powershell
corepack pnpm lint
corepack pnpm typecheck
corepack pnpm build
```

The application version follows SemVer and is sourced from `package.json`.
Every version must have a matching `CHANGELOG.md` section. Builds expose their
version and Git commit at `/version.json`; run `corepack pnpm version:check` to
validate release metadata independently.

`next build` creates the deployable static export in `out/`. The site intentionally avoids runtime-only Next.js features because the production hosting provides static files over FTPS, not a Node.js process.

## Continuous integration

GitHub Actions runs on every push and pull request to `main`. The workflow uses Node.js 24 LTS and the pinned pnpm version, validates peer dependencies, runs lint and TypeScript checks, builds the static export, and stores `out/` as a seven-day build artifact. Dependabot checks npm packages and GitHub Actions weekly. npm patch and minor updates are grouped automatically; major npm upgrades are reviewed and tested manually to avoid incompatible peer dependency combinations.

## Project structure

| Path | Purpose |
|---|---|
| `app/` | App Router layout, page, global CSS, and local fonts |
| `components/` | Interactive React components and animation runtime |
| `lib/` | Typed site content and generated geometry data |
| `public/` | Production images, audio, icons, and social preview |
| `scripts/` | Build-time media generation |
| `deploy/` | Atomic FTPS deployment and credential template |
| `reports/` | Lighthouse snapshots from performance work |
| `out/` | Generated static release; ignored by Git |

## Docker preview

The Docker image builds the same `out/` export and serves it with nginx:

```powershell
docker compose up --build
```

Open `http://localhost:3000`.

## Production deployment

See [`DEPLOY.md`](./DEPLOY.md). The short workflow is:

```powershell
pwsh -NoProfile -ExecutionPolicy Bypass -File .\deploy\deploy.ps1 -DryRun
pwsh -NoProfile -ExecutionPolicy Bypass -File .\deploy\deploy.ps1
```

The deployment script never mirrors the web root. It uploads an immutable release, switches a small `.htaccess` pointer, verifies the live HTML and assets, and restores the previous pointer automatically if verification fails.

## Secrets

Copy `deploy/credentials.example.ps1` to `deploy/credentials.ps1` and set the hosting password locally. The real credential file, deployment logs, downloaded WinSCP binaries, `.env*`, build output, and dependency directories are ignored by Git.
