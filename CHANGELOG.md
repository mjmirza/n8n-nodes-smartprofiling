# Changelog

## [0.1.10] - 2026-10-31

### Changed
- Package now lives in its own public repository, mjmirza/n8n-nodes-smartprofiling. Previously it sat inside a private monorepo.
- Published by the npm account nex8n with a signed provenance statement. Previously published unsigned by contentapis.
- HTTP calls use `this.helpers.httpRequest` instead of the deprecated `this.helpers.request`. Retry detection reads the status from `statusCode`, `response.status`, or `httpCode`, so retries on 429 and 5xx keep working.
- The retry delay uses n8n-workflow's `sleep` instead of a local `setTimeout` helper.
- The "Speakers" resource label reads "Speaker", and Channel operations are listed alphabetically. Stored values are unchanged, so existing workflows keep working.
- Lint uses the official `@n8n/node-cli` community-node config instead of an empty config.
