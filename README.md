# GOD Mode landing page

[![CI](https://github.com/Hiw4i/GOD-Mode/actions/workflows/ci.yml/badge.svg)](https://github.com/Hiw4i/GOD-Mode/actions/workflows/ci.yml)

GOD Mode is a cinematic one-page product site built with Next.js App Router, React, TypeScript, GSAP, Lenis, and locally hosted media. Production is exported as static HTML/CSS/JavaScript and served at [godmode.zone](https://godmode.zone).

## Requirements

- Node.js 24.x
- Corepack
- pnpm 11.24.0 (declared in `package.json`)

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

`next build` creates the deployable static export in `out/`. Production serves these files over HTTPS from eServer.

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
| `deploy/` | Legacy Majordomo FTPS script and credential template |
| `reports/` | Lighthouse snapshots from performance work |
| `out/` | Generated static release; ignored by Git |

## Docker preview

The Docker image builds the same `out/` export and serves it with nginx:

```powershell
docker compose up --build
```

Open `http://localhost:3000`.

## Production deployment

See [`DEPLOY.md`](./DEPLOY.md) for the eServer release checks, rollback preparation, and DNS and mail migration status.

## Secrets

Keep hosting credentials in the configured secret store. Git ignores legacy FTPS credentials, deployment logs, downloaded WinSCP binaries, `.env*`, build output, and dependency directories.
