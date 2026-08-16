# Architecture

The engine pipeline is discovery → CMP identification → dedicated adapter or conservative generic fallback → semantic action plan → execution → verification → truthful outcome.

`NO_POSITIVE_CONSENT_WITHOUT_USER_ACTION` is the central invariant. Plans contain semantic intents and evidence, never bare selectors. Automatic execution accepts only privacy-decreasing intents. Unknown-state controls are never toggled.

Dedicated adapters own their fingerprints and selectors. Generic detection requires independent consent vocabulary, surface semantics/layout, and actionable-control signals; operations stay scoped to the detected root. Known adapters outrank generic matches.

Content scripts start in every HTTP(S) frame. A debounced observer is bounded to 30 seconds and disconnects after an action. A low-cost URL check rearms the bounded observer after SPA navigation without permanently scanning the DOM. Per-tab frame arbitration is intentionally deferred; until it exists, no cross-frame outcome may be described as globally verified.

The extension reads page DOM only in the isolated content-script world. It has no remote runtime service and does not mutate IAB consent strings or invoke undocumented write APIs.
