# Progress

## Implemented

- Strict TypeScript/WXT foundation with Chromium and explicit Firefox MV3 builds.
- Least-privilege manifest: `storage` and HTTP(S) host access; no network, cookies, history, identity, clipboard, or download permissions.
- Typed safety invariant, semantic actions, truthful outcome model, multilingual normalization/classification, conservative surface scoring, known-state OFF controls, planning, and execution boundaries.
- Generic direct-reject/settings selection with positive-consent exclusion and ordinary-form guard.
- Isolated fixture-level OneTrust, Cookiebot, Usercentrics, Didomi, Quantcast, and CookieYes adapters.
- Generic settings workflow can disable semantically optional, proven-ON controls and save only after a privacy modification.
- Open Shadow DOM discovery and an early all-frame content script with debounced, bounded mutation observation.
- Minimal local popup with global enable, per-host pause, and truthful recorded status.
- Chromium Playwright harness with a real packaged-extension fixture for dynamic rejection, affirmative-action avoidance, reload persistence, and popup loading.
- Unit/integration tests and CI configuration.

## Current limitations

- Node.js and pnpm are now available, but registry access is blocked (`ECONNREFUSED 127.0.0.1:9`) and escalated installs hang; no dependency install, test, lint, build, lockfile generation, or browser run has completed.
- Generic purpose/vendor controls are handled only when their optional meaning and ON state are both provable. Dedicated adapters do not yet implement exhaustive purposes/vendors/legitimate-interest flows.
- SPA URL changes rearm bounded detection. No persistence verification, virtualized vendor iteration, or per-tab frame arbitration yet.
- Playwright E2E is implemented but unexecuted because dependencies and Chromium cannot be installed. Firefox Android is documented but unverified.

## Next highest-priority work

1. Generate and commit `pnpm-lock.yaml`, run the full check suite, and fix all surfaced issues.
2. Add per-tab confidence arbitration before claiming robust iframe support.
3. Add tested exhaustive vendor and legitimate-interest minimization for OneTrust and Cookiebot.
4. Add virtualized-list convergence, persistence verification, and Playwright fixtures.
