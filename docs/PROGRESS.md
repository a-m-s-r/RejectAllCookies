# Progress

## Implemented

- Strict TypeScript/WXT foundation with Chromium and explicit Firefox MV3 builds.
- Least-privilege manifest: `storage`, user-triggered `activeTab`, and HTTP(S) host access; no network, cookies, history, identity, clipboard, or download permissions.
- Typed safety invariant, semantic actions, truthful outcome model, multilingual normalization/classification, conservative surface scoring, known-state OFF controls, planning, and execution boundaries.
- Generic direct-reject/settings selection with positive-consent exclusion and ordinary-form guard.
- Isolated fixture-level OneTrust, Cookiebot, Usercentrics, Didomi, Quantcast, CookieYes, Sourcepoint, Google Funding Choices, Complianz, and iubenda adapters.
- Generic settings workflow can disable semantically optional, proven-ON controls and save only after a privacy modification.
- Open Shadow DOM discovery and an early all-frame content script with debounced, bounded mutation observation.
- Minimal local popup with global enable, per-host pause, and truthful ephemeral per-tab status.
- Options page for adding, reviewing, and removing exact-host exclusions without unsafe HTML injection.
- User-opened local diagnostic details in the popup; no report is transmitted or copied automatically.
- Chromium Playwright harness with a real packaged-extension fixture for dynamic rejection, affirmative-action avoidance, reload persistence, and popup loading.
- Side-effect-free action inspection and confidence-ranked per-tab frame arbitration with a 30-second owner lease.
- Explicit verification evidence; banner disappearance is no longer misreported as verified rejection.
- Per-session action-target memory prevents persistent controls from causing repeat-click loops.
- Safety fixtures cover deferred execution, hidden reject lures, unsafe save timing, required controls, and individual legitimate-interest objection.
- Bounded vendor-region traversal with machine-readable coverage and save suppression after incomplete traversal.
- OneTrust persistence verification from the documented `OptanonConsent` category/vendor state; malformed, incomplete, or optionally active states remain unverified.
- Cookiebot persistence verification from its documented `CookieConsent` optional-category state without evaluating page-controlled data.
- Dedicated known-state Cookiebot category, IAB vendor-consent, and legitimate-interest planning; unresolved known controls block saving.
- Dedicated OneTrust group-aware category planning that preserves required group `C0001`; unresolved optional groups block saving.
- Visibility-safe generic and selector-adapter planning; hidden stale CMP layers and hidden action lures are excluded before prioritization.
- Winning iframe actions are surfaced in the per-tab popup status without persisting site history.
- Explicit runtime enforcement and fixture coverage for `NO_POSITIVE_CONSENT_WITHOUT_USER_ACTION`.
- Explicit extension-page CSP limiting scripts to packaged code and disabling objects/base rewriting.
- Bounded read-only TCF v2 `addEventListener` verification through the standardized postMessage locator; every exposed optional/legitimate-interest signal must be false.
- Unit/integration tests and CI configuration.

## Current limitations

- `pnpm-lock.yaml` is generated and pins the patched `happy-dom@20.11.2` in place of the vulnerable `18.0.1` release. Formatting and strict TypeScript passed before the clean dependency relink; the relink stalled in this environment, so the complete check suite and browser runs remain pending.
- Generic purpose/vendor controls are handled only when their optional meaning and ON state are both provable. Dedicated adapters still need CMP-specific exhaustive purpose/vendor/legitimate-interest flows.
- SPA URL changes rearm bounded detection. Virtualized vendor traversal is bounded and records UI coverage but cannot prove an opaque CMP exposed its full dataset.
- Playwright E2E is implemented but unexecuted because dependencies and Chromium cannot be installed. Firefox Android is documented but unverified.

## Next highest-priority work

1. Complete dependency linking, run the full check suite, and fix all surfaced issues.
2. Add tested CMP-specific purpose/vendor/legitimate-interest minimization for OneTrust and Cookiebot.
3. Add dedicated vendor-list navigation for CMPs whose vendor panels are not exposed in the active settings surface.
4. Exercise Playwright, Firefox desktop, and Firefox Android fixtures.
