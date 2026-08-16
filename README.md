# Minimum Consent

Minimum Consent is a local, deterministic WebExtension that attempts the least optional consent a site exposes. It never intentionally accepts optional processing to dismiss a dialog.

The project is in an early engineering release. The semantic core, conservative generic first-layer handling, and initial OneTrust/Cookiebot fingerprints exist; comprehensive CMP preference, vendor, legitimate-interest, frame-coordination, and real-browser validation do not yet exist.

## Development

Requirements: Node.js 20.19 or newer and pnpm 10.

```sh
pnpm install
pnpm check
pnpm dev
pnpm dev:firefox
```

Normal operation performs no telemetry, analytics, remote logging, page upload, or extension-originated network request. Runtime permissions are local extension storage and temporary active-tab access for the user-opened popup; host access is required for page-local consent detection.

See [architecture](docs/ARCHITECTURE.md), [testing](docs/TESTING.md), and [contributing](docs/CONTRIBUTING.md).

## Browser status

- Chromium MV3: configured, not yet exercised in this environment.
- Firefox desktop MV3: configured, not yet exercised in this environment.
- Firefox for Android: documented test procedure only; support is not claimed yet.

Licensed under MIT.
