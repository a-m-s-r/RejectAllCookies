# Decisions

## WXT with explicit MV3 targets

WXT provides one typed TypeScript source with generated browser manifests. Firefox is invoked with `--mv3` explicitly because WXT otherwise defaults Firefox to MV2.

## Conservative generic fallback

False positive consent is more harmful than an unhandled banner. Generic handling therefore requires a score of at least 60 and only performs classified reject/settings actions inside that surface. It does not yet manipulate optional controls.

## UI interaction over fabricated consent state

TCF read interfaces can later support detection and verification. They are not treated as authorization to invent or write a TC string.

## MIT

A short permissive license lowers integration friction for browser and privacy-tool contributors.
