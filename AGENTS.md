<!-- BEGIN:nextjs-agent-rules -->

# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->

# GOD Mode project rules

- The production target is a static export served by Majordomo over HTTPS. Keep `output: "export"`, `trailingSlash: true`, and `images.unoptimized: true` compatible unless hosting is deliberately migrated away from static FTPS.
- Before changing Next.js code or configuration, read the relevant installed guide in `node_modules/next/dist/docs/`.
- Run `corepack pnpm lint`, `corepack pnpm typecheck`, and `corepack pnpm build` before release.
- Deploy only through `deploy/deploy.ps1`. It uploads `out/` into an immutable release, atomically switches `.htaccess`, runs HTTPS smoke tests, and rolls back on failure.
- Never commit or print `deploy/credentials.ps1`, `.env*`, `deploy/deploy.log`, or `deploy/tools/`.
- A deploy is an external production change. Run it only when the user explicitly requests deployment.
- Treat `/.godmode/` as the deployment control directory and do not mirror or delete the FTPS root.
