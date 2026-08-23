/**
 * Remote sync for the bundled default lists. Served by the same Cloudflare
 * Worker as the ads registry (see /worker/worker.js at the repo root — one
 * file, one deploy, routed by query param). This service fetches the
 * manifest with a local cache, diffs against what's already been applied,
 * and fetches only the lists that are new or changed — so the bundled
 * defaults can be refreshed (or extended with new lists) without a new app
 * deploy. The bundled JSON snapshot remains the offline fallback.
 */

export { createRegistryDefaultListsService } from "./registry-default-lists";
