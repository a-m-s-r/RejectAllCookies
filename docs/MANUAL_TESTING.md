# Manual testing

Use a separate browser profile while the extension is pre-release. It acts automatically on detected consent interfaces.

## Chromium

1. Open `chrome://extensions` in Chrome, Chromium, Brave, or Edge.
2. Enable **Developer mode**.
3. Choose **Load unpacked** and select `.output/chrome-mv3` from this repository.
4. Pin **Minimum Consent** so its status is easy to inspect.

Visit a site that presents a fresh consent banner. Use a private window only if the browser allows the unpacked extension there. Check that:

- no accept/allow action is selected;
- a direct reject action is preferred when available;
- otherwise, only proven optional controls are switched off before saving;
- required controls remain on;
- the popup describes the outcome truthfully, including when rejection cannot be verified;
- reloading does not cause repeated clicks or change the saved choice;
- pausing the current host prevents further interaction after a reload.

Record the page URL, visible consent-manager name, browser/version, popup status and details, expected result, and actual result. Do not include cookies, consent strings, account details, or other private page data in a report.

For a repeatable clean-profile smoke pass over the maintained public-site matrix, build Chromium and run `pnpm test:live`. The command requires network access, prints only clicked consent-control labels, and must never replace deterministic fixture tests.

## Firefox

Open `about:debugging#/runtime/this-firefox`, choose **Load Temporary Add-on**, and select `.output/firefox-mv3/manifest.json`. Repeat the checks above on Firefox 140 or newer. Firefox Android 142 or newer remains a separate compatibility target.

## Stop testing

If the extension selects any affirmative consent, enables an optional control, or interacts with a non-consent form, disable it immediately and preserve only the non-sensitive reproduction details listed above. That behavior violates `NO_POSITIVE_CONSENT_WITHOUT_USER_ACTION` and is release-blocking.
