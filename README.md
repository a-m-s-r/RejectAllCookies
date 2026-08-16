# Minimum Consent

Minimum Consent is a local, deterministic WebExtension that attempts the least optional consent a site exposes. It never intentionally accepts optional processing to dismiss a dialog.

The project is in an early engineering release. The semantic core, conservative generic settings workflow, bounded vendor traversal, frame coordination, and fixture-backed major-CMP direct-rejection adapters exist. Comprehensive CMP-specific preference/vendor flows and real-browser certification are not complete.

## Development

Requirements: Node.js 20.19 or newer and pnpm 10.

```sh
pnpm install
pnpm check
pnpm dev
pnpm dev:firefox
```

Normal operation performs no telemetry, analytics, remote logging, page upload, or extension-originated network request. Runtime permissions are local extension storage and temporary active-tab access for the user-opened popup; host access is required for page-local consent detection.

See [architecture](docs/ARCHITECTURE.md), [automated testing](docs/TESTING.md), [manual testing](docs/MANUAL_TESTING.md), and [contributing](docs/CONTRIBUTING.md).

## Browser status

- Chromium MV3: production build and packaged-extension Playwright scenarios pass; hands-on live-site testing is requested.
- Firefox desktop MV3: production build and package validation pass; hands-on browser testing is requested.
- Firefox for Android: documented test procedure only; support is not claimed yet.

Source is available under the [PolyForm Noncommercial License 1.0.0](LICENSE). Commercial use and resale are not permitted by that license. Required attribution: Anastasia (ATech / Intellegacy).
