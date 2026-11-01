# Changelog

## [0.1.11] - 2026-11-01

### Fixed
- Passes the n8n community-package verification scanner. Known API and operation errors are re-wrapped in `NodeApiError` and `NodeOperationError` instead of being re-thrown raw. Previously the scanner rejected the raw rethrow.
- The pagination `Continuation Token` field is now masked (`password: true`), as the n8n lint rules require for any token-named field. Expressions and pasted values work as before.

### Documentation
- README rewritten from the actual node code. It previously listed transcript formats (SRT, VTT) and a chat operation (Ask Question) that do not exist, and a stale version number. It now documents the real operations, option values, credential fields, development workflow and signed release flow. Plan prices were removed because they live on the pricing page and drift.

### Changed
- `@n8n/node-cli` pinned to `^0.54.6` instead of `*`, so local lint runs the same community-node rules as n8n's scanner.

## [0.1.10] - 2026-10-31

### Changed
- Package now lives in its own public repository, mjmirza/n8n-nodes-smartprofiling. Previously it sat inside a private monorepo.
- Published by the npm account nex8n with a signed provenance statement. Previously published unsigned by contentapis.
- HTTP calls use `this.helpers.httpRequest` instead of the deprecated `this.helpers.request`. Retry detection reads the status from `statusCode`, `response.status`, or `httpCode`, so retries on 429 and 5xx keep working.
- The retry delay uses n8n-workflow's `sleep` instead of a local `setTimeout` helper.
- The "Speakers" resource label reads "Speaker", and Channel operations are listed alphabetically. Stored values are unchanged, so existing workflows keep working.
- Lint uses the official `@n8n/node-cli` community-node config instead of an empty config.
