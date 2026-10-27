# Internet Computer Store

A search engine and directory for the Internet Computer (ICP) ecosystem.
Static frontend + a discovery crawler + Internet Identity login.

**Status:** the web app, crawler, review CLI and login are implemented. The frontend ships with clearly labeled **demo data** until you crawl and approve real projects. There is **no backend canister yet** (see "Not built").

## Quick start
```bash
npm install
npm run dev          # http://localhost:5173
npm test             # crawler unit tests
npm run build        # -> dist/
```

## How discovery works
```
npm run crawl   ->  data/projects.json   (private working store, everything is PENDING)
npm run review  ->  web/public/projects.json   (only APPROVED records are public)
```
1. `npm run crawl` collects candidates, merges duplicates (same website host), classifies them, checks each homepage once, and stores them as `pending`. Re-running keeps your review decisions.
2. Review: `npm run review -- list`, then `npm run review -- approve <id>`, `approve --source=sns --up-only`, or `reject <id>`.
3. Reload the site. When at least one record is published the demo data disappears.

Sources (public APIs only, no HTML scraping):
| Adapter | Source | Notes |
|---|---|---|
| `sns` | `sns-api.internetcomputer.org/api/v2/snses` | Only SNSes whose swap is `COMMITTED`. Cursor paging is implemented from the OpenAPI spec and guarded against loops. |
| `github` | GitHub search, topic `internet-computer` | Needs a homepage, not a fork/archived, min stars. Generic hosts (npm, x.com, github.io, ...) are dropped. Set `GITHUB_TOKEN` for a higher rate limit. |

Options: `--only=sns,github`, `--no-check` (skip website checks), `--fixture` (use the bundled SNS sample, no network for SNS).

## Honest limits
- **"All projects" is not achievable.** There is no official ecosystem directory. One app often uses many canisters, so canisters are never treated as projects. Coverage = SNS projects + GitHub-discovered projects + whatever you add. Add more adapters in `crawler/adapters/` (interface: `collect(ctx) -> candidates[]`).
- **Categories are keyword guesses** (`categorySource: "heuristic"`). Review them.
- **GitHub results are noisy** (repo names, personal sites). That is why nothing is published without review.
- "Last website check" means the homepage answered, not that the project is safe, audited or verified.
- Before adding scrapers for third-party directories, check their terms and robots.txt.

## Internet Identity login
`web/src/auth.js` uses `@icp-sdk/auth` (`new AuthClient()`, `signIn()`, `signOut()`), default provider `https://id.ai`. After login the header shows your principal (your ICP ID).
- Login proves *which principal this browser session holds*. It is **not authorization**. Anything privileged (admin, claims, moderation, persisting submissions) must be enforced by a backend canister that checks `caller`. The `/admin` page is a non-functional demo shell.
- Principals are derived per origin. Changing the domain (e.g. `*.icp0.io` to a custom domain) changes users' principals unless you configure `derivationOrigin` and `/.well-known/ii-alternative-origins`.
- The popup flow was not exercised in the build sandbox. Test login in a real browser.

## Deploy to ICP (asset canister)
```bash
npm run build
dfx deploy --network ic frontend    # dfx.json serves ./dist; routing is hash-based, so no rewrites needed
```
Run the crawler on a schedule elsewhere (cron / CI), run `review`, commit `web/public/projects.json`, rebuild, redeploy.

## Not built (next steps)
1. Backend canister (Motoko/Rust): persist submissions + review queue, store developer claims keyed by principal, admin allowlist checked on-chain.
2. Submission form is wired to a service that refuses until a backend exists, so it never fakes a success.
3. OpenSearch service + protected search API (the UI searches the in-browser list today; fine up to a few thousand records).
4. Developer claim proof (DNS TXT, `.well-known` file on the project site, or canister controller check).
5. Games: screenshots, genres and verified launch URLs need data the sources above do not provide.

## My Profile (local prototype)
After Internet Identity sign-in, click **My Profile** in the header (or visit `#/profile`).
You can choose an avatar, display name, role, bio, website, GitHub and interests.
The data is saved to the browser's `localStorage`, keyed by the authenticated Principal. This is **not** an ICP canister and does **not** sync to other devices. No profile is published to other users. For production, add a backend canister that uses its authenticated `caller` rather than accepting an arbitrary Principal from the browser, and configure stable Internet Identity derivation origins.


## Display name and neutral code names

Edit `config/site.json` to change the displayed site name. It is shared by the
HTML shell and the client-side page titles. The package is `catalog-search`,
the backend directory is `core`, UI assets use `catalog-*`, and image assets use
`site-*`. GitHub Pages derives its base path from `GITHUB_REPOSITORY`; set
`PUBLIC_BASE_PATH` to override it for another host.

Historical wire schemas, object paths and browser storage keys are isolated in
`config/compatibility.js`. Existing profile and favorites data remain readable.
`config/deployment.js` reads neutral secret bindings. Legacy browser storage keys remain readable to preserve profiles and favorites.

The production site uses the new catalog Worker and Cloudflare resources. Configure the public API origin in `web/public/api-config.json`; GitHub Actions credentials remain in GitHub Secrets.

Run `npm ci`, `npm test`, and `npm run build` before publishing. See
`PROJECT_STATUS.md` for the exact verification and remote-save status.


## Private review hosting

For a Sites review origin, `hosting/build-review.mjs` packages the Vite frontend
into a Worker with an opt-in same-origin API config. Run `npm run build` and then
`node hosting/build-review.mjs` inside the selected Site checkout containing its
`.openai/hosting.json` with no `static` field. The Worker serves built assets and
forwards only GET/HEAD search and health requests to the fixed existing backend;
it does not forward user cookies or authorization headers. The upstream API's
GitHub Pages CORS restriction therefore does not block the review frontend.

The regular GitHub Pages configuration keeps its direct API URL. Do not change
it to same-origin unless the host supplies the corresponding API proxy.


## Production workflows

The production D1 database is `icpstore-catalog-db-prod`, the R2 bucket is
`icpstore-catalog-files-prod`, and the Worker is `icpstore-catalog-api-prod`.

- **Internet Computer Store Crawler**: run manually on `main` to discover SNS and curated Caffeine projects and ingest them via R2 and Queues. No scheduled crawl is configured.
- **Internet Computer Store Monitor**: pushes to `main` test, build and deploy GitHub Pages. A manual run can choose `build`, `deploy` (Worker), `provision` (queues, notification and Worker) or `initialize` (D1 schema). Initialization is for a new or empty database.

Cloudflare operations use GitHub Secrets `CLOUDFLARE_ICPSTORE_API_TOKEN` and
`CLOUDFLARE_ICPSTORE_ACCOUNT_ID`. The crawler discovers the Worker origin
automatically; the optional `CATALOG_API_BASE_URL` variable can override it.
Crawler coverage is limited to its configured sources. Crawl and Cloudflare deployment operations share a concurrency group.
