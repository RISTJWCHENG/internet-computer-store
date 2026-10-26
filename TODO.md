# TODO

- [x] Separate display branding from implementation names.
- [x] Rename directories, assets and references consistently.
- [x] Preserve existing browser data, wire identities and deployment secret compatibility.
- [x] Run the full automated suite and production build.
- [x] Resolve GitHub integration write access for the owner account.
- [x] Save the prepared branch through the GitHub Git data API, verify the remote SHA/tree and create PR #1.
- [ ] Perform browser visual QA before publishing.
- [ ] Optional separate migration: provision neutral Cloudflare resource names, migrate data and switch endpoints with rollback validation.
- [ ] Optional repository administration: rename the GitHub repository after reviewing URL and hosting implications.

- [x] Deploy a separate owner-private review site and provide its live URL.
- [ ] User acceptance review of the deployed rename before merging PR #1.

- [x] Repair preview-origin dApp loading and verify live published records.

- [x] Restore original 16-dot hover animation, dimensions and favorites interaction.
- [ ] User visual acceptance of the repaired launcher on the private review site.

- [x] Verify formal GitHub Pages release and automatic removal of the merged task branch.
- [ ] Remove task-local source duplicates and archives after remote verification.


- [x] Prepare fresh production D1 schema and new R2/D1 Worker bindings.
- [x] Prepare manually dispatched initialization, deployment and discovery workflow.
- [ ] Configure scoped Cloudflare Actions credentials, Queues and R2 notification.
- [ ] Run initialization, deploy the new Worker and record its URL.
- [ ] Run one crawl and verify D1 contents, R2 events and website behavior.
- [ ] Switch the frontend to the verified new API, then retire old Cloudflare resources and legacy identifiers after explicit verification.

- [ ] Set and verify the neutral staging secrets in GitHub, then remove the old secret references and old secrets.

- [ ] Verify the selected GitHub secret names against the staging Worker before removing legacy fallback references.

- [ ] Verify the one-time Cloudflare provisioning job and the new API health.
- [ ] Run the requested crawl manually and validate the new catalog before cutover.
- [ ] After successful cutover, review the exact legacy Cloudflare resources for removal.
