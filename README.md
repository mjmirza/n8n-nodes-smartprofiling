# n8n-nodes-smartprofiling

Turn any YouTube video, channel or playlist into transcripts, summaries, chapters and answers inside your n8n workflows.

[![npm version](https://img.shields.io/npm/v/n8n-nodes-smartprofiling)](https://www.npmjs.com/package/n8n-nodes-smartprofiling)
[![npm downloads](https://img.shields.io/npm/dm/n8n-nodes-smartprofiling)](https://www.npmjs.com/package/n8n-nodes-smartprofiling)
[![CI](https://img.shields.io/github/actions/workflow/status/mjmirza/n8n-nodes-smartprofiling/ci.yml?branch=main&label=CI)](https://github.com/mjmirza/n8n-nodes-smartprofiling/actions/workflows/ci.yml)
[![Signed with npm provenance](https://img.shields.io/badge/npm-provenance%20signed-brightgreen)](https://www.npmjs.com/package/n8n-nodes-smartprofiling#provenance)
[![License MIT](https://img.shields.io/npm/l/n8n-nodes-smartprofiling)](LICENSE.md)

## What you get

- **A transcript in one step.** Paste a video ID or URL and get clean text back, ready for a sheet, a CMS or an AI step.
- **Summaries without watching.** Brief, detailed, bullet point or chapter summaries.
- **Answers from a video.** Send a question and get an answer grounded in what the video actually says.
- **Chapters and speakers.** Timestamped chapters ready for a YouTube description, and speakers labelled in interviews and podcasts.
- **Channel intelligence.** Videos, shorts, playlists, and subscriber and view counts for any channel. Growth covers 7 to 365 days of history for channels Smart Profiling already tracks. Run Get Stats first to start tracking, and history builds up one daily snapshot at a time.
- **Signed releases.** Every version since 0.1.10 is published from GitHub Actions with npm provenance, so you can trace it to the exact commit. Earlier versions were published unsigned.

## From install to first result

1. In n8n open **Settings**, then **Community Nodes**, then **Install a community node**, enter `n8n-nodes-smartprofiling` and install.
2. Create an API key at [smartprofiling.com](https://smartprofiling.com) under **Dashboard**, then **API Keys**. Keys start with `sp_`.
3. In n8n add a credential of type **Smart Profiling API** and paste the key.
4. Add a **Smart Profiling** node, pick **Transcript** and **Get Single**, enter a video ID such as `dQw4w9WgXcQ`, and run it.
5. The transcript appears in the output panel. Connect it to any next step.

## Operations

| Resource | Operation | What it does |
|---|---|---|
| Channel | Get Videos | Lists the channel's latest videos, the first page the API returns |
| Channel | Get Shorts | Lists the channel's latest shorts, the first page the API returns |
| Channel | Get Playlists | Lists the channel's playlists, the first page the API returns |
| Channel | Get Stats | Subscribers, views and video count, with optional AI insights |
| Channel | Get Growth | Growth data for 7, 30, 90 or 365 days, for channels already tracked. Run Get Stats first, history then grows daily |
| Chapter | Generate Chapters | Timestamped chapters as JSON, YouTube description text or Markdown, with optional minimum length and maximum count |
| Chat | Send Message | Asks a question about a video and keeps a conversation ID for follow ups |
| Playlist | Get Videos | Lists the videos on the first page YouTube returns for a playlist, usually up to 100, from an ID or a full URL, capped by the Limit you set |
| Speaker | Identify Speakers | Labels who speaks when |
| Summarize | Generate Summary | Brief, Detailed, Bullet Points or Chapters format |
| Transcript | Get Single | Transcript for one video as JSON, text, SRT or VTT. With JSON, a Display Format adds a Timeline, Plain, Paragraph or Sentences `formattedText` field |
| Transcript | Get Bulk | Transcripts for several videos as one result, sent in batches of 5, the smallest per-request limit of any plan |

Every operation supports n8n's **Continue On Fail**, and failed items keep the HTTP status code. Rate limits are retried with backoff and honor the API's Retry-After header. If the API asks for a wait longer than two minutes, the node stops and reports it rather than waiting. Server errors are retried only on calls that do not use credits, so a paid request is never charged twice.

Each request returns one item. List operations keep their results in `data.videos`, `data.shorts` or `data.playlists`, so use n8n's Split Out node to process them one at a time.

Summary Length, Custom Prompt, Max Speakers, and the chat Max Tokens and Temperature are sent with the request but not yet applied by the API.

New nodes use version 1.1, which always sends the playlist Limit. A version 1 node sends the Limit when the saved workflow stores a value for it, and otherwise gets the API default of 200 videos. See [DESIGN-DECISIONS.md](https://github.com/mjmirza/n8n-nodes-smartprofiling/blob/main/docs/DESIGN-DECISIONS.md).

### Example workflows

Daily digest:
- Schedule Trigger, then Channel Get Videos, then Split Out on `data.videos`, then Summarize Generate Summary per video, then send to email, Slack or Notion.

Video question bot:
- Webhook, then Chat Send Message, then Respond to Webhook.

Bulk transcript export:
- Playlist Get Videos, then Split Out on `data.videos`, then Transcript Get Single per video, then Google Sheets or a database.

## Credentials

| Field | Value |
|---|---|
| API Key | Your key from the Smart Profiling dashboard |
| Base URL | Leave the default unless you were given a dedicated domain. Must be https on smartprofiling.com or one of its subdomains |

The credential is tested on save with a request that uses no credits, so a wrong key shows up immediately. The API also rejects a key whose account has no credits left, so top up before testing a new account. API documentation is at [smartprofiling.com/api-docs](https://smartprofiling.com/api-docs).

## Troubleshooting

| Symptom | Fix |
|---|---|
| Node does not appear | Open Community Nodes, update to the latest version, then hard refresh the browser |
| Invalid API key | Check the key starts with `sp_` and has no surrounding spaces |
| Video not found | Make sure the video is public and the ID is correct, or paste the full URL |
| Rate limit exceeded | Check usage in the dashboard, raise retries, or add a Wait node between bulk calls |

## For developers

| Area | Detail |
|---|---|
| Language | TypeScript, built with `@n8n/node-cli` |
| Runtime dependencies | None. Only `n8n-workflow` as a peer |
| Lint | n8n community node rules, the same set n8n uses to verify packages |
| Node.js | 24 or newer for development, the n8n build tools need it. The published node runs on 20.19 or newer |

```bash
npm ci
npm run lint
npm run build
npm test      # lint, build, then the behavior tests in test/
npm run dev   # starts a local n8n with the node loaded
```

Project layout:
- `nodes/SmartProfiling/` holds the node, one folder per resource under `resources/`
- `credentials/` holds the Smart Profiling API credential
- `.github/workflows/` holds CI and the signed publish workflow

Releases are cut by pushing a `vX.Y.Z` tag that matches `package.json`. The publish workflow lints, builds and publishes with `--provenance`.

## Support

- Product and API questions go to support@smartprofiling.com
- Bugs and feature requests go to [GitHub issues](https://github.com/mjmirza/n8n-nodes-smartprofiling/issues)

## License

[MIT](LICENSE.md)
