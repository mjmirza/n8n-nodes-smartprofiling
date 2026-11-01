# Changelog

## [0.4.2] - 2026-11-01

### Fixed
- A failed Get Bulk batch keeps its HTTP status, on each `BATCH_FAILED` entry and as `meta.failedStatusCode`. When no transcript succeeded at all, the error is the failed batch's own API error with its status code, so Continue On Fail reports 402 or 429 instead of a generic message.
- Retry settings are read for each item, so an expression that differs between items applies to each one. Previously every item used the first item's settings.
- Publishing runs the behavior tests on Node 20, 22 and 24 before anything is published. Previously only the CI workflow did, and it does not run on version tags.
- The README links the design note with an absolute URL, which also works on the npm page, and states that development needs Node 24.

## [0.4.1] - 2026-11-01

### Fixed
- A Get Bulk batch that failed after it was sent is listed as `BATCH_FAILED`, with a note that it may have been processed and charged, and the result reports `success: false`. Only batches never sent are `NOT_PROCESSED`. Previously 0.4.0 marked the failed batch as safe to retry.
- Retry settings set by an expression are bounded to the field limits (0 to 10 retries, 100 to 30000 ms). Previously an expression such as `{{ 1/0 }}` retried without end.
- Get Bulk with no video IDs fails before sending anything. Previously 0.4.0 returned an empty success.
- docs/DESIGN-DECISIONS.md gives a working way to restore the old default Limit of 50 on a version 1 node.

### Changed
- The minimum Node.js version is 20.19, the lowest that n8n 1.x supports. CI tests Node 20, 22 and 24. Previously the package claimed Node 18, which CI never tested.

## [0.4.0] - 2026-11-01

### Fixed
- Get Bulk leaves out a blank Language, so the API default applies as it does for Get Single. Previously it sent `languages: [""]`, which the API rejects.
- Get Bulk sends the videos in batches of 20, each with a 5 minute timeout, and merges the results into one item. If a later batch fails, the transcripts already received and charged are kept and the remaining videos are listed in `data.errors` with code `NOT_PROCESSED`. Previously one request carried every video with a 30 second timeout, so a large batch could time out while the API kept processing and charging.

### Changed
- docs/DESIGN-DECISIONS.md lists how each release treated the version 1 playlist Limit and why 0.1.x behavior is kept. A workflow built on 0.2.0 that relied on the default of 50 should enter the Limit as the expression `{{ 50 }}` or use a new node.

## [0.3.3] - 2026-11-01

### Fixed
- A version 1 playlist node that stores a Limit of 50 sends it again. 0.3.2 dropped it and returned up to 200 videos. The n8n editor never stores the default, so only an explicitly written 50 is affected. The reasoning and evidence are in docs/DESIGN-DECISIONS.md.
- The README example workflows add the Split Out step on `data.videos`. Previously the next node ran once for the whole list instead of once per video.

## [0.3.2] - 2026-11-01

### Fixed
- A version 1 playlist node saved with the default Limit of 50 no longer sends it, matching 0.1.x. Only a Limit the user changed is sent. Previously 0.3.1 sent 50 and cut results that used to return up to 200.
- A bulk transcript request where every video failed is an error. Previously the API's 200 response with zero transcripts looked like success.
- Video ID fields accept YouTube watch, youtu.be, Shorts, Live and embed URLs and send the bare ID.
- A Retry-After longer than two minutes is no longer cut short. The node stops and names the wait instead of retrying too early.

### Corrected
- The 0.2.0 note that the credential test works for accounts with zero credits was wrong. The API rejects a key with no credits left, and the README now says so.

## [0.3.1] - 2026-11-01

### Fixed
- A version 1 playlist node that saved a Limit sends it again. 0.3.0 dropped it, so a workflow saved on 0.2.0 with Limit 1 started receiving up to 200 videos. An unsaved default still gets the API default of 200, as on 0.1.x.
- Retry-After is honored on real n8n. n8n drops the response headers when it wraps an HTTP error, so the node now reads the full response itself and keeps the header. Previously retries ignored the wait in production while the tests passed.
- HTTP errors carry the API's own error message and status code.
- The Shorts and Playlists continuation token no longer promises a next batch. The API returns the first page again.

### Changed
- Tests use a mock that wraps HTTP errors the way n8n does, so a header lost in wrapping fails a test.

## [0.3.0] - 2026-11-01

### Fixed
- The credential test no longer sends the API key to an unchecked Base URL. Previously it used the raw field, so a plain http or private address bypassed the check that execution applies.
- The Base URL must be https on smartprofiling.com or one of its subdomains, in both execution and the credential test. Previously any public hostname was accepted, including names that resolve to private addresses.
- Display Format is offered for the JSON transcript format, the only one that carries timed segments. Previously it was shown only for the text format, where it could not apply.
- Saved playlist workflows keep their results. The node now has version 1.1, which sends the Limit. Version 1 nodes keep the previous request without a limit, so the API default of 200 still applies.
- Runs on Node 18.0 again. Previously `URL.canParse` required Node 18.17.
- Max Speakers and the chat Max Tokens and Temperature are sent with the request, as documented. Previously they were dropped.

### Changed
- The Continuation Token description and README state that the API does not apply the token yet. The provider returns the first page again, which the node cannot fix.
- Tests pin the Retry-After wait, the node version behavior and the credential test host check.

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
