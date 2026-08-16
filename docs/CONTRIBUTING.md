# Contributing

Every behavior change needs a reduced fixture and a regression test. Prefer CMP fingerprints over domains. Never add an affirmative-consent automatic action, toggle an unknown control, or broaden permissions without an architecture decision.

Before submitting, run `pnpm check` and `pnpm web-ext:lint`. Describe browser versions actually exercised and keep unverified claims explicit.
