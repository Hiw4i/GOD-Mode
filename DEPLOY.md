# Production deployment for godmode.zone

[eServer](https://www.eserver.ru/) serves the production Next.js static export. The canonical site is [godmode.zone](https://godmode.zone/). HTTPS on `www.godmode.zone` redirects to the canonical site and preserves the path.

## Build the release

GitHub Actions runs lint, TypeScript checks, the Premium model tests and the production build. Use the successful run for the exact commit being released. The workflow publishes the contents of `out/` as `god-mode-static-<commit-sha>`.

For a local build, run:

```powershell
corepack pnpm lint
corepack pnpm typecheck
node --test scripts/premium-model.test.mjs
corepack pnpm build
```

Set `NEXT_PUBLIC_SITE_URL` to `https://godmode.zone` and set the two public Supabase variables before building. Verify that the export contains `index.html`, `404.html`, `account/index.html`, `delete-account/index.html`, `privacy/index.html` and `version.json`.

## Publish on eServer

The eServer account, deployment method and active nginx document root still need to be recorded from the authorized server or hosting panel. Identify the existing release and rollback mechanism there before uploading. The Docker configuration in this repository provides a local preview.

1. Record the live `/version.json` and preserve the current release for rollback.
2. Stage the verified CI export using the existing eServer deployment method. Upload only the static export. Keep credentials and server configuration outside the artifact.
3. Activate the staged release. If the host supports a release directory and an atomic switch, use them to keep the active site intact during upload.
4. Verify the release over HTTPS. Restore the previous release if any check fails.

Confirm that:

- `/version.json` on production matches the staged export.
- `/`, `/account/`, `/delete-account/` and `/privacy/` return the expected pages.
- A nonexistent URL returns HTTP 404 with the site's custom 404 page.
- JavaScript and images referenced by the new release load, the Premium catalog loads, and the Account sign-in screen opens.
- Both hostnames have valid TLS and the `www` redirect preserves the path.

The legacy `deploy/deploy.ps1` targets the former Majordomo FTPS host and switches an Apache `.htaccess` pointer. It is retained for reference.

## Premium account configuration

Set `NEXT_PUBLIC_SUPABASE_URL` to the HTTPS URL of the Supabase project used by GOD Mode and set `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` to its publishable key. Set both in the build environment or GitHub Actions variables. Next.js embeds them at build time. Keep lava.top credentials and the Supabase secret key in Edge Function secrets.

Allow the exact redirect `https://godmode.zone/account/` in Supabase Authentication. Preserve the app's existing callback and any explicit staging origins. Keep the Premium Edge Function configured for the canonical HTTPS origin. Verify the public catalog and the sign-in screen after publishing.

## DNS and mail

Public records observed on 20 November 2026:

| Record | Observed value |
| --- | --- |
| `godmode.zone` A | `185.105.108.81` (eServer) |
| `www.godmode.zone` A | `185.105.108.81` (eServer) |
| `godmode.zone` NS | `ns.majordomo.ru`, `ns2.majordomo.ru`, `ns3.majordomo.ru`, `ns4.majordomo.ru` |
| `godmode.zone` MX | Priority `10`, `mmxs.majordomo.ru` |
| `godmode.zone` TXT | SPF record present |

Website releases use the existing web records. Moving DNS delegation or mail delivery is a separate change. The site's public support address is `support.godmode@gmail.com`. The domain's MX record controls incoming mail only for addresses ending in `@godmode.zone`.

For the DNS cutover, export the full zone from the current control panel. Copy all records to the destination DNS provider, including subdomains, TXT records and service verification records. Check the new zone directly against each assigned authoritative server. Check the registry's DNSSEC/DS configuration before switching delegation at the registrar. Keep the former zone available while cached records expire.

For the mail cutover, confirm the destination mail service, recreate the mailboxes and forwarding rules in use, and copy any mail the owner needs to keep. Use the destination provider's assigned MX and mail authentication records. Verify inbound delivery and outbound authentication before retiring the former service. Compare the final records with the authoritative zone after the change.
