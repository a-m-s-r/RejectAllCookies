# Architecture

The engine pipeline is discovery → CMP identification → dedicated adapter or conservative generic fallback → semantic action plan → execution → verification → truthful outcome.

`NO_POSITIVE_CONSENT_WITHOUT_USER_ACTION` is the central invariant. Plans contain semantic intents and evidence, never bare selectors. Automatic execution accepts only privacy-decreasing intents. Unknown-state controls are never toggled, and a semantically optional unknown-state control blocks saving selected preferences.

Dedicated adapters own their fingerprints and selectors. Generic detection requires independent consent vocabulary, surface semantics/layout, and actionable-control signals; operations stay scoped to the detected root. Planning is side-effect-free. Frames submit plans to a background arbiter, which ranks dedicated adapters before generic matches, then confidence, top-frame status, and a stable frame-id tie breaker. Only the lease owner may execute.

Content scripts start in every HTTP(S) frame. A debounced observer watches child insertion and a narrow set of visibility/dialog attributes, is bounded to 30 seconds, and disconnects after completion. Privacy workflow steps explicitly schedule the next scan, so checkbox property changes do not depend on mutation delivery. A low-cost URL check rearms the bounded observer after SPA navigation without permanently scanning the DOM. Per-tab leases are cleared on navigation and tab closure. The winning frame reports its result to the background worker so an iframe-owned consent action remains visible in the top-level popup without persisting browsing history.

Verification requires evidence of stored rejection. Surface disappearance is recorded as unverified because it proves neither persistence nor the semantic meaning of a close action.

OneTrust rejection is verified only when its persisted category/vendor cookie proves that the necessary category remains active, contains optional evidence, and contains no active optional entry. Cookiebot rejection is verified only when its documented first-party `CookieConsent` state contains all three optional categories (`preferences`, `statistics`, and `marketing`) as false. Missing, malformed, incomplete, or regional-exemption state remains unverified.

Vendor traversal is limited to scrollable vendor/partner regions inside an already-confident consent surface. It advances at most 40 times per region, disables only proven-ON optional controls, and blocks saving if traversal exhausts its bound before reaching the UI's end. Results distinguish no vendor list, completed UI traversal, incomplete traversal, and unverified traversal. UI completion does not claim that a virtualized CMP exposed every vendor.

The extension reads page DOM only in the isolated content-script world. It has no remote runtime service and does not mutate IAB consent strings or invoke undocumented write APIs.

After a safe rejection remains otherwise unverified, the content script may query the standardized TCF v2 postMessage proxy with `addEventListener`. It accepts only loaded `tcloaded` or `useractioncomplete` data that applies under GDPR and proves every exposed purpose, vendor, publisher, special-feature, consent, and legitimate-interest boolean false. The listener is bounded to one second. No TCF mutation command is used and no TC string is decoded, created, or rewritten.

Extension pages use an explicit self-only script policy with objects and base-URL rewriting disabled. Runtime code contains no remote module loading, dynamic JavaScript fetch, or evaluation sink.

Only user-authored settings and exact-host exclusions are persisted. Page outcomes live in a background-worker map keyed by tab ID and are cleared on navigation or tab closure, preventing diagnostics from becoming a browsing-history database.
