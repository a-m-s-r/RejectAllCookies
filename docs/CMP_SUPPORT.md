# CMP support

Support means fixture-backed capability, not broad real-site certification.

| CMP                    | Detection           | Reject all          | Purposes                         | Vendors                   | Legitimate interest      | Verified                          |
| ---------------------- | ------------------- | ------------------- | -------------------------------- | ------------------------- | ------------------------ | --------------------------------- |
| OneTrust               | Fixture             | Fixture             | Group-aware known-state controls | Bounded generic traversal | Generic controls         | OptanonConsent categories/vendors |
| Cookiebot              | Fixture             | Fixture             | Known-state categories           | Known-state IAB controls  | Known-state IAB controls | CookieConsent categories          |
| Usercentrics           | Open-shadow fixture | Open-shadow fixture | No                               | No                        | No                       | No                                |
| Didomi                 | Fixture             | Fixture             | No                               | No                        | No                       | No                                |
| Quantcast              | Fixture             | Fixture             | No                               | No                        | No                       | No                                |
| CookieYes              | Fixture             | Fixture             | No                               | No                        | No                       | No                                |
| Sourcepoint            | Fixture             | Fixture             | No                               | No                        | No                       | No                                |
| Google Funding Choices | Fixture             | Fixture             | No                               | No                        | No                       | No                                |
| Complianz              | Fixture             | Fixture             | No                               | No                        | No                       | No                                |
| iubenda                | Fixture             | Fixture             | No                               | No                        | No                       | No                                |
| Generic                | Fixture             | Fixture             | Proven-state controls            | Bounded scoped traversal  | Proven-state controls    | No                                |

Real-site regression fixtures and browser testing are required before store-facing support claims.

TCF v2 read-only verification is fixture-covered as a cross-adapter evidence source. It does not provide a write path and is never treated as permission to construct or mutate a TC string.
