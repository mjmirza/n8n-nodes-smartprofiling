# Changelog

## [0.2.0] - 2026-11-01

### Fixed
- Chat works. Previously the node read a `question` parameter that does not exist and failed before sending, now it sends `message` and the optional `conversationId` for follow-up questions.
- Paid requests are never charged twice. Previously summaries, chat, chapters, speakers, transcripts, channels and playlists were retried after 500, 502, 503, 504 or 408, and the API can deduct credits before such an error. Now only 429 is retried on those calls, and server errors are retried only on Channel Get Growth, which uses no credits.
- Rate-limit retries honor the `Retry-After` header. Previously the fixed backoff gave up before the API's window reopened.
- Playlist Limit is sent. Previously it was ignored and the API returned up to 200 videos.
- A pasted playlist URL is sent as `url`. Previously it was sent as `id` and the lookup failed.
- Chapter Min Chapter Duration and Max Chapters are sent as `options.minChapterLength` and `options.maxChapters`. Previously both were ignored.
- Transcript Display Format works. With the JSON format the output gains a `formattedText` field in Timeline, Plain, Paragraph or Sentences layout. Previously the setting was ignored.
- Continue On Fail keeps the HTTP status code. Previously `statusCode` was always empty because it read a field the error does not carry.
- The credential test no longer spends a credit and no longer fails for accounts with zero credits. Previously it fetched a real transcript, which costs one credit.
- The Base URL must use https and a public host, and a trailing `/api/v1` is removed. Previously any URL was accepted, so the API key could be sent to a local or private address.

### Changed
- Summary Length, Custom Prompt, Max Speakers and the chat Max Tokens and Temperature are documented as not yet applied by the API. They are still sent, so they take effect once supported. Previously the descriptions implied they worked.
- `npm test`, CI and the publish workflow run behavior tests for every fix above. Previously `npm test` ran only lint and build.

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
