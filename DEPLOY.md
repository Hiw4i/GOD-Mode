# Production deployment: godmode.zone

The production site is a Next.js 16 static export hosted by Majordomo. The hosting account exposes a static web root over explicit FTPS and does not run the Node.js `next start` server. For that reason, production uses `output: "export"`; `corepack pnpm build` writes the complete website to `out/`.

Live URL: [https://godmode.zone](https://godmode.zone)

## Premium account configuration

Set `NEXT_PUBLIC_SUPABASE_URL` to the HTTPS URL of the same Supabase project used by GOD Mode and set `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` to its `sb_publishable_…` key. Set both in the environment that runs the static build or in the repository's GitHub Actions variables for CI exports. Next.js embeds these values at build time. Keep lava.top credentials and the Supabase secret key in Edge Function secrets.

In Supabase Authentication → URL Configuration, allow the exact redirect `https://godmode.zone/account/`. Keep the app's existing callback and allow explicit staging origins separately. Enable Google and GitHub and verify that the email template delivers `{{ .Token }}` for OTP sign-in. Configure the Premium Edge Function to allow the website's HTTPS origin.

With the public values absent, the static site still builds and displays an unavailable message on the account page. Verify the release candidate can load the server catalog and open the sign-in screen before deploying it.

## Connection

| Setting | Value |
|---|---|
| Protocol | Explicit FTPS (`ftpes://`) |
| Host | `web32.majordomo.ru` — not `web32s` |
| Port | `21` |
| Mode | Passive |
| User | `f67999_godmode` |
| Remote web root | `/` |
| Credentials | Local `deploy/credentials.ps1`, ignored by Git |
| Deployment log | Local `deploy/deploy.log`, ignored by Git |

The account is chrooted: `/` is the site's own restricted root. Never attempt to leave it or access neighboring hosting accounts.

## Release model

The deployment does not synchronize the repository or destructively mirror `/`.

```text
/
├── .htaccess                         active release pointer
└── .godmode/
    ├── rollback.htaccess             previous release pointer
    └── releases/
        ├── 20260830T...-<git>/        immutable static export
        └── 20260830T...-<git>/        another release
```

The sequence is:

1. Run ESLint, TypeScript, and a production static build.
2. Upload `out/` into a new immutable release directory.
3. Save the current `.htaccess` as the rollback pointer.
4. Upload the next pointer under a unique temporary name.
5. Rename the temporary pointer to `/.htaccess` on the server.
6. Compare the live home and account pages with the static export over HTTPS. Check a Next.js JavaScript bundle and an image from the live release.
7. If any smoke test fails, restore the previous pointer and test it again.

The active website changes only at step 5. Uploading a release cannot expose a partially transferred build.

## Initial setup

### PowerShell and WinSCP

Use PowerShell 7 (`pwsh`). Install WinSCP globally:

```powershell
winget install --id WinSCP.WinSCP --exact
```

The script also discovers a portable binary at `deploy/tools/winscp/WinSCP.com`. The entire `deploy/tools/` directory is ignored by Git.

### Credentials

```powershell
Copy-Item deploy\credentials.example.ps1 deploy\credentials.ps1
notepad deploy\credentials.ps1
```

Set the real password in `$FtpPassword`. Never paste the contents into an issue, chat, command output, commit, or CI log.

## Dry run

```powershell
pwsh -NoProfile -ExecutionPolicy Bypass -File .\deploy\deploy.ps1 -DryRun
```

Dry run performs all local checks and the static export, verifies that required files exist, and opens a read-only FTPS session. It does not create, upload, rename, or delete anything remotely.

## Deploy

```powershell
pwsh -NoProfile -ExecutionPolicy Bypass -File .\deploy\deploy.ps1
```

Success means all of the following completed:

- lint passed;
- TypeScript passed;
- the static export contains `out/index.html`, `out/404.html`, and `out/account/index.html`;
- the release uploaded successfully;
- the `.htaccess` pointer switched;
- the live home and account HTML match the static export, and the live JavaScript and image smoke tests return successful non-empty responses.

`-SkipBuild` is available only when the current `out/` was already built and verified in the same working session:

```powershell
pwsh -NoProfile -ExecutionPolicy Bypass -File .\deploy\deploy.ps1 -SkipBuild
```

Do not use `-SkipBuild` for an unknown or stale `out/` directory.

## Rollback

Automatic rollback runs whenever post-switch smoke tests fail. For a manual rollback:

```powershell
pwsh -NoProfile -ExecutionPolicy Bypass -File .\deploy\deploy.ps1 -Rollback
```

Rollback swaps the active and previous pointers, runs the same HTTPS smoke tests, and restores the original active pointer if the rollback target itself fails. Running `-Rollback` again switches back to the release that was active before the first rollback.

On the first managed deployment, the rollback pointer represents the legacy web root (`RewriteEngine Off`). Later deployments always retain the immediately preceding managed release.

## Verification outside the script

```powershell
curl.exe --fail --location --show-error https://godmode.zone/
curl.exe --fail --head --show-error https://godmode.zone/sources/Icon_rounded.png
```

Expected result: HTTP `200`, the GOD Mode page content, and a non-empty image response. Use a cache-busting query string when diagnosing an edge cache:

```powershell
curl.exe --fail --head "https://godmode.zone/?check=$(Get-Date -Format FileDateTimeUniversal)"
```

## Troubleshooting

- **PowerShell says the script is not signed:** invoke it with the full `pwsh -NoProfile -ExecutionPolicy Bypass -File ...` command shown above.
- **WinSCP is missing:** install it with `winget` or place the official portable executables under `deploy/tools/winscp/`.
- **Connection times out:** verify `web32.majordomo.ru`. `web32s` is a different SSH endpoint and does not accept this FTP connection.
- **TLS validation fails:** use the DNS host, not its IP. `-AcceptAnyCertificate` exists for emergency diagnostics and weakens identity verification.
- **Authentication fails:** stop and obtain the current password from the hosting owner. Do not guess it.
- **Build fails while resolving a font:** confirm internet access; `next/font/google` resolves JetBrains Mono during build.
- **Smoke tests return 403 or 500 after switching:** inspect `deploy/deploy.log`. The script should already have restored the previous pointer.
- **An asset returns 404:** verify filename case and spacing. The production filesystem is case-sensitive.
- **HTTP works but stale content appears:** use a cache-busting query or hard refresh. Hashed `/_next/static/` assets are release-specific.

## Security and operating rules

- Deployment requires an explicit request because it changes production.
- Never upload the repository root, `.git/`, `.next/`, `node_modules/`, sources, reports, credentials, logs, or local tools.
- Never run root-level mirror/delete synchronization against `/`.
- Do not edit or remove `/.godmode/` manually while a deploy is running.
- Preserve at least the active and previous release directories. Old inactive releases may be removed manually only after identifying both pointer targets.
- Prefer explicit FTPS. Plain `-Protocol ftp` sends credentials without TLS and is reserved for owner-approved emergency diagnostics.

## Relevant configuration

- `next.config.ts`: static export, trailing slashes, unoptimized `next/image` output.
- `package.json`: pinned Node and pnpm versions plus build checks.
- `deploy/deploy.ps1`: release upload, pointer switch, smoke tests, and rollback.
- `deploy/credentials.example.ps1`: safe credential template.
- `.gitignore`: protects real credentials, logs, local WinSCP binaries, dependencies, and generated output.
