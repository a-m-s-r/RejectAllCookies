# Decisions

## WXT with explicit MV3 targets

WXT provides one typed TypeScript source with generated browser manifests. Firefox is invoked with `--mv3` explicitly because WXT otherwise defaults Firefox to MV2.

## Conservative generic fallback

False positive consent is more harmful than an unhandled banner. Generic handling therefore requires a score of at least 60 and operates only inside that surface. It disables a control only when consent context, optional meaning, visibility, and an ON state are all proven. An unresolved optional control prevents saving.

## Local typed adapters rather than remote rule updates

Consent-O-Matic demonstrates the coverage benefits of detector/action rule separation, visible-state filtering, and explicit consent-state matchers. This project keeps the same useful separation in typed local modules but does not download executable rules or transmit failure URLs, preserving deterministic offline operation and a smaller trust boundary. No upstream code or rule data is copied into the runtime.

## UI interaction over fabricated consent state

TCF read interfaces can later support detection and verification. They are not treated as authorization to invent or write a TC string.

## Noncommercial source-available license

PolyForm Noncommercial 1.0.0 permits use, modification, and redistribution for noncommercial purposes while prohibiting commercial use. The required notice credits Anastasia (ATech / Intellegacy). Because commercial use is restricted, project materials describe the repository as source-available rather than OSI open source.
