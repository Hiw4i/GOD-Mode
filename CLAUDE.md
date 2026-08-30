# Claude Code instructions

Read and follow [`AGENTS.md`](./AGENTS.md) before changing this project. The installed Next.js documentation is authoritative for framework behavior.

Production is a static Next.js export deployed by `deploy/deploy.ps1`. Do not upload the repository root, `.next/`, credentials, logs, or local tools. A normal release must pass lint, typecheck, build, FTPS upload, atomic pointer switch, and HTTPS smoke tests. Use `-Rollback` to switch back to the previous release.
