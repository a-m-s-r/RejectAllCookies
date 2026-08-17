Second pair of eyes review

This is a separate review note, intended as a sanity check on the project before calling it reliable. It is not meant to replace the existing project docs or change the codebase itself.

1. Setup and install

- Make sure the project installs cleanly from a fresh checkout.
- Verify the expected Node version and package manager version are actually in use on the machine doing the testing.
- Confirm that the install does not silently pull in stale or mismatched dependencies.
- Check that the postinstall step completes without errors, especially around extension preparation.

2. Build checks

- Run the normal build flow from the project root.
- Run the Firefox build as a separate check, because extension behavior can differ between browsers.
- Confirm that both browser outputs are created in the expected locations.
- Check for warnings that look harmless at first but may indicate broken assumptions later.

3. Lint and type safety

- Run the formatter check and see whether there are any repeated formatting-only changes.
- Run lint with the project’s strict configuration and inspect the results before ignoring anything.
- Run TypeScript checking separately and make sure no loose types are hiding sensitive runtime assumptions.
- Look for places where the app uses any type coercion that could mask a real DOM or browser API issue.

4. Test coverage review

- Run the unit and integration suite and treat any failing test as a sign that something important is still unstable.
- Check whether the tests reflect real browser behavior, rather than narrow happy-path scenarios.
- Review whether the consent logic tests cover the adversarial cases: hidden elements, dynamic DOM updates, nested frames, and reloading pages.
- Make sure there are tests for the failure states, not just the successful reject paths.

5. Browser smoke tests

- Load the extension in Chromium and check that it installs without console errors.
- Load the extension in Firefox and do the same.
- Open a few representative sites with no consent banner and confirm the extension stays silent.
- Open a few sites with standard consent banners and verify the project reacts only where it should.
- Test a site that changes state after load, since many consent UIs are dynamic rather than static.

6. Page behavior checks

- Confirm the extension does not trigger on unrelated UI elements or normal page controls.
- Check a page where the consent banner is in a frame rather than the top level document.
- Reload pages after consent actions and verify the extension re-arms correctly.
- Check whether the extension keeps scanning after it has already acted, or whether it stops in the correct place.
- Verify that the consent state is only described as verified when there is actual evidence behind it.

7. Safety checks

- Review the core invariant carefully: the extension should never accept optional processing as a way to dismiss a banner.
- Validate that conservative fallback behavior is being used instead of aggressive actions.
- Check the background message flow carefully to ensure the content script and background script are not disagreeing about consent actions.
- Confirm that the extension does not touch unrelated DOM nodes or non-consent UI.
- Review any paths that involve preferences or vendor settings and make sure they are gated behind semantically safe actions.

8. Privacy and network checks

- Check the browser network panel while the extension is active.
- Confirm there are no unexpected outbound requests originating from the extension.
- Review permissions and make sure they are limited to what is actually needed for the feature.
- Make sure there is no hidden telemetry or remote analytics path.

9. Regression-oriented checks

- Keep a shortlist of representative sites for each consent framework and run them repeatedly.
- Confirm the project behaves the same way after page reloads and SPA navigations.
- Check the same flow in both Chromium and Firefox to catch browser-specific edge cases.
- Re-test any site that previously produced a false positive or a missed detection.

10. Release-level signoff

- Only call the project reliable once the detection, execution, and verification paths have all been exercised in a real browser.
- Do not rely only on static analysis or unit tests.
- Review any cases where the extension reports “unsupported” versus “not detected” versus “verified,” because those states are not interchangeable.
- Before calling it stable, run a final clean install and a final browser smoke test from scratch.

This is deliberately a second-pass review. The project may look reasonable on paper, but the real question is whether it behaves correctly in a browser under realistic conditions without creating false positives or privacy regressions.
