# Testing

`pnpm check` runs formatting, lint, strict TypeScript, unit/integration coverage, and Chromium/Firefox production builds. `pnpm validate:firefox-manifest` validates the built Firefox manifest without depending on the vulnerable `web-ext` toolchain. After a Chromium build and `pnpm exec playwright install chromium`, `pnpm test:e2e` loads the real extension into Playwright's bundled Chromium.

The automated suite currently has 107 unit/integration/performance tests. It covers multilingual classification, unsafe positive vocabulary, negation, proven OFF control behavior, generic reject preference, ordinary-form guards, dedicated CMP routing and minimization, persistence verification, frame arbitration, TCF verification, bounded vendor traversal, and composed-tree visibility safety. The measured suite passes at 95.61% for statements and lines, 98% for functions, and 87.19% for branches.

The packaged-extension Playwright suite has seven passing Chromium scenarios covering dynamic insertion, rejection without affirmative consent, reload persistence, popup loading, complex category/vendor/legitimate-interest settings, ordinary-form false positives, open Shadow DOM, child frames, and delayed SPA routing.

`pnpm test:live` runs an opt-in, clean-profile Chromium smoke matrix against public Didomi, Usercentrics, OneTrust, and Cookiebot pages plus two complex publisher sites. It records only clicked control labels and fails if an affirmative-consent action is observed. Because live pages and regional banners change without notice, this is a release-time smoke test rather than a deterministic CI gate.

CI audits production dependencies at high severity. Development-tool advisories are reviewed separately because build-only packages are not included in the extension bundle.

`pnpm test:performance` constructs a 10,000-element non-consent document and enforces a generous deterministic scan ceiling. The ceiling is intended to catch catastrophic traversal regressions, not serve as a browser benchmark.

## Firefox Android

After building with `pnpm build:firefox`, enable USB debugging, connect a device or emulator, verify it with `adb devices`, then run:

```sh
pnpm exec web-ext run --source-dir .output/firefox-mv3 --target=firefox-android --android-device=<device-id> --firefox-apk=org.mozilla.firefox
```

Exercise direct rejection, dynamic insertion, a cross-origin iframe, reload persistence, and extension status before recording Android support.
