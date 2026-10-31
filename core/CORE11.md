# CATALOG Core 1.1 — unified discovery

This is a new, standalone candidate collector. **It does not publish projects or write D1 / R2**. No V3–V7 compatibility layer.

Run tests:

```powershell
node --test core/tests/core.test.mjs core/tests/discovery.test.mjs
```

Run source discovery (requires internet):

```powershell
node core/discovery/run.mjs --sources sns,github,community --seeds core/discovery/community-seeds.txt --out core/discovery/output/candidates.json
```

To include Community apps, add reviewed public HTTPS application links, one per line, to `discovery/community-seeds.txt`. This is a seed-only method; no universal community application directory is assumed. GitHub's public search has rate limits; `GITHUB_TOKEN` is optional and never printed. The SNS adapter includes only committed-swap records with root canister evidence. Candidates stay `status: candidate` and require separate quality / ownership assessment. Source is not project category.

Output is local `ordosyn.discovery.v1` JSON with candidate provenance and per-source errors. `--strict` causes network errors to set a nonzero exit code. URL normalization is conservative; only exact normalized URL matches are merged. Canonical redirects, domain migrations and ownership remain future jobs. Dynamic JS-only sites may have insufficient public title metadata.

**Safety:** Run the crawler from an isolated environment; DNS pre-check alone does not fully defend against DNS rebinding. Do not use it to fetch untrusted internal hosts from privileged networks. Before production use, add deployment-level egress controls and robots.txt / per-origin rate limits. No scheduled production execution is enabled.
