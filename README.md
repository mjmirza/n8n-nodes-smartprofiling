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
- **Channel intelligence.** Videos, shorts, playlists, subscriber and view counts, and growth over 7 to 365 days for any channel.
- **Signed releases.** Every version is published from GitHub Actions with npm provenance, so you can trace it to the exact commit.

## From install to first result

1. In n8n open **Settings**, then **Community Nodes**, then **Install a community node**, enter `n8n-nodes-smartprofiling` and install.
2. Create an API key at [smartprofiling.com](https://smartprofiling.com) under **Dashboard**, then **API Keys**. Keys start with `sp_`.
3. In n8n add a credential of type **Smart Profiling API** and paste the key.
4. Add a **Smart Profiling** node, pick **Transcript** and **Get Single**, enter a video ID such as `dQw4w9WgXcQ`, and run it.
5. The transcript appears in the output panel. Connect it to any next step.

## Operations

| Resource | Operation | What it does |
|---|---|---|
| Channel | Get Videos | Lists a channel's videos, with a continuation token for the next page |
| Channel | Get Shorts | Lists a channel's shorts |
| Channel | Get Playlists | Lists a channel's playlists |
| Channel | Get Stats | Subscribers, views and video count, with optional AI insights |
| Channel | Get Growth | Growth data for 7, 30, 90 or 365 days |
| Chapter | Generate Chapters | Timestamped chapters as JSON, YouTube description text or Markdown, with optional minimum length and maximum count |
| Chat | Send Message | Asks a question about a video and keeps a conversation ID for follow ups |
| Playlist | Get Videos | Lists the videos in a playlist, from an ID or a full URL, up to the Limit you set |
| Speaker | Identify Speakers | Labels who speaks when |
| Summarize | Generate Summary | Brief, Detailed, Bullet Points or Chapters format |
| Transcript | Get Single | Transcript for one video as JSON, text, SRT or VTT. With JSON, a Display Format adds a Timeline, Plain, Paragraph or Sentences `formattedText` field |
| Transcript | Get Bulk | Transcripts for several videos in one request |

Every operation supports n8n's **Continue On Fail**, and failed items keep the HTTP status code. Rate limits are retried with backoff and honor the API's Retry-After header. Server errors are retried only on calls that do not use credits, so a paid request is never charged twice.

Summary Length, Custom Prompt, Max Speakers, and the chat Max Tokens and Temperature are sent with the request but not yet applied by the API.

### Example workflows

Daily digest:
- Schedule Trigger, then Channel Get Videos, then Summarize Generate Summary per video, then send to email, Slack or Notion.

Video question bot:
- Webhook, then Chat Send Message, then Respond to Webhook.

Bulk transcript export:
- Playlist Get Videos, then Transcript Get Single per item, then Google Sheets or a database.

## Credentials

| Field | Value |
|---|---|
| API Key | Your key from the Smart Profiling dashboard |
| Base URL | Leave the default unless you were given a dedicated domain. Must use https and a public host |

The credential is tested on save with a request that uses no credits, so a wrong key shows up immediately. API documentation is at [smartprofiling.com/api-docs](https://smartprofiling.com/api-docs).

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
| Node.js | 22 or newer for development |

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
