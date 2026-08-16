# Testing

`pnpm check` runs formatting, lint, strict TypeScript, unit/integration coverage, and Chromium/Firefox production builds. `pnpm web-ext:lint` validates the built Firefox manifest. After a Chromium build and `pnpm exec playwright install chromium`, `pnpm test:e2e` loads the real extension into Playwright's bundled Chromium.

The automated suite currently has 96 unit/integration/performance tests. It covers multilingual classification, unsafe positive vocabulary, negation, proven OFF control behavior, generic reject preference, ordinary-form guards, dedicated CMP routing and minimization, persistence verification, frame arbitration, TCF verification, bounded vendor traversal, and visibility safety. The measured coverage gate passes at 88.19% for statements and lines, 93.61% for functions, and 88.94% for branches.

The packaged-extension Playwright suite has two passing Chromium scenarios covering dynamic insertion, rejection without affirmative consent, reload persistence, popup loading, and truthful local controls/status.

`pnpm test:performance` constructs a 10,000-element non-consent document and enforces a generous deterministic scan ceiling. The ceiling is intended to catch catastrophic traversal regressions, not serve as a browser benchmark.

## Firefox Android

After building with `pnpm build:firefox`, enable USB debugging, connect a device or emulator, verify it with `adb devices`, then run:

```sh
pnpm exec web-ext run --source-dir .output/firefox-mv3 --target=firefox-android --android-device=<device-id> --firefox-apk=org.mozilla.firefox
```

Exercise direct rejection, dynamic insertion, a cross-origin iframe, reload persistence, and extension status before recording Android support.
