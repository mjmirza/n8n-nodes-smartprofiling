# n8n-nodes-smartprofiling

> **Extract YouTube transcripts, generate AI summaries, and chat with videos** - all directly in your n8n workflows.

[![npm version](https://badge.fury.io/js/n8n-nodes-smartprofiling.svg)](https://www.npmjs.com/package/n8n-nodes-smartprofiling)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)

---

## Quick Start (2 minutes)

### Step 1: Install the Node

1. Open your n8n instance
2. Go to **Settings** (gear icon) → **Community Nodes**
3. Click **Install a community node**
4. Paste: `n8n-nodes-smartprofiling`
5. Click **Install**

### Step 2: Get Your API Key

1. Go to [yttapi.com/signup](https://yttapi.com/signup)
2. Create a free account
3. Go to **Dashboard** → **API Keys**
4. Click **Create API Key**
5. Copy your key (starts with `ytt_`)

### Step 3: Add Credentials in n8n

1. In n8n, go to **Credentials** → **Add Credential**
2. Search for **Smart Profiling API**
3. Paste your API key
4. Click **Save**

**Done!** You're ready to use the node.

---

## What Can You Do?

| Feature | Description | Use Case |
|---------|-------------|----------|
| **Transcripts** | Extract captions from any YouTube video | Content repurposing, SEO |
| **Summarize** | AI-powered video summaries | Newsletter digests, research |
| **Chat** | Ask questions about video content | Customer support, Q&A bots |
| **Chapters** | Auto-generate timestamps | YouTube descriptions |
| **Speakers** | Identify and label speakers | Interview analysis, podcasts |
| **Channel** | Get all videos from a channel | Bulk processing, monitoring |
| **Playlist** | Get videos from a playlist | Course processing, archives |

---

## Step-by-Step Examples

### Example 1: Extract a Transcript

**Goal:** Get the transcript of a YouTube video

1. Add a **Smart Profiling** node to your workflow
2. Set **Resource** → `Transcript`
3. Set **Operation** → `Get Single`
4. Enter the **Video ID**: `dQw4w9WgXcQ` (or paste full URL)
5. Choose **Format**: `text` or `json`
6. Execute!

**Output:**
```json
{
  "transcript": "Never gonna give you up, never gonna let you down...",
  "videoId": "dQw4w9WgXcQ",
  "language": "en"
}
```

---

### Example 2: Summarize a Video

**Goal:** Get an AI summary of a video

1. Add a **Smart Profiling** node
2. Set **Resource** → `Summarize`
3. Set **Operation** → `Generate Summary`
4. Enter the **Video ID**
5. Choose **Summary Type**:
   - `brief` - 2-3 sentences
   - `detailed` - Full analysis with key points
   - `bullets` - Bullet point list
   - `chapters` - Summary organized by chapters

**Output:**
```json
{
  "summary": "This video explains the basics of...",
  "videoId": "abc123",
  "type": "brief"
}
```

---

### Example 3: Chat with a Video

**Goal:** Ask questions about video content

1. Add a **Smart Profiling** node
2. Set **Resource** → `Chat`
3. Set **Operation** → `Ask Question`
4. Enter the **Video ID**
5. Type your **Question**: "What are the main topics discussed?"

**Output:**
```json
{
  "answer": "The main topics discussed are...",
  "videoId": "abc123"
}
```

---

### Example 4: Get Channel Videos

**Goal:** Get all videos from a YouTube channel

1. Add a **Smart Profiling** node
2. Set **Resource** → `Channel`
3. Set **Operation** → `Get Videos`
4. Enter the **Channel ID or Handle**: `@mkbhd` or `UCBJycsmduvYEL83R_U4JriQ`
5. Set **Limit**: `50` (max videos to return)

**Output:** Array of video objects with IDs, titles, thumbnails, etc.

---

## Workflow Templates

### Template 1: Daily YouTube Digest

```
Schedule Trigger (Daily)
    ↓
Smart Profiling (Channel → Get Videos)
    ↓
Smart Profiling (Summarize each video)
    ↓
Send Email / Slack / Notion
```

### Template 2: Video Q&A Bot

```
Webhook (receives question)
    ↓
Smart Profiling (Chat → Ask Question)
    ↓
Respond to Webhook
```

### Template 3: Bulk Transcript Export

```
Smart Profiling (Playlist → Get Videos)
    ↓
Loop Over Items
    ↓
Smart Profiling (Transcript → Get Single)
    ↓
Google Sheets / Airtable / Database
```

---

## API Reference

### Resources & Operations

#### Transcript
| Operation | Description |
|-----------|-------------|
| Get Single | Extract transcript from one video |
| Get Bulk | Extract transcripts from multiple videos |

#### Summarize
| Operation | Description |
|-----------|-------------|
| Generate Summary | AI summary (brief/detailed/bullets/takeaways) |

#### Chat
| Operation | Description |
|-----------|-------------|
| Ask Question | Ask a question about video content |

#### Chapter
| Operation | Description |
|-----------|-------------|
| Generate Chapters | Auto-generate timestamps |

#### Speakers
| Operation | Description |
|-----------|-------------|
| Identify Speakers | Identify and label speakers in transcript |

#### Channel
| Operation | Description |
|-----------|-------------|
| Get Videos | Get all videos from channel |
| Get Shorts | Get shorts from channel |
| Get Playlists | Get playlists from channel |

#### Playlist
| Operation | Description |
|-----------|-------------|
| Get Videos | Get all videos in a playlist |

---

## Supported Formats

### Transcript Formats
- `json` - Structured JSON with timestamps
- `text` - Plain text
- `srt` - SubRip subtitle format
- `vtt` - WebVTT subtitle format

### Summary Types
- `brief` - 2-3 sentence summary
- `detailed` - Comprehensive with key points
- `bullet-points` - Bullet point list
- `chapters` - Summary organized by video chapters

### Chapter Formats
- `json` - Structured data
- `youtube` - Ready for YouTube description
- `markdown` - Markdown formatted

---

## Troubleshooting

### "Node not appearing in search"

1. Go to **Settings** → **Community Nodes**
2. Check if `n8n-nodes-smartprofiling` shows version `0.1.6`
3. If not, click **Update** or uninstall/reinstall
4. Hard refresh browser: `Ctrl+Shift+R` (Windows) or `Cmd+Shift+R` (Mac)

### "Invalid API Key"

1. Make sure your key starts with `ytt_`
2. Check for extra spaces when copying
3. Verify key is active at [yttapi.com/dashboard](https://yttapi.com/dashboard)

### "Video not found"

1. Check if video is public (not private/unlisted)
2. Verify the video ID is correct
3. Try pasting the full YouTube URL instead

### "Rate limit exceeded"

1. Check your usage at [yttapi.com/dashboard](https://yttapi.com/dashboard)
2. Upgrade your plan if needed
3. Add delays between requests in bulk operations

---

## Pricing

| Plan | Credits/Month | Best For |
|------|---------------|----------|
| Free | 100 | Testing & small projects |
| Pro | 10,000 | Regular workflows |
| Business | 100,000 | High-volume automation |

Get your API key at [yttapi.com](https://yttapi.com)

---

## Support

- **Documentation:** [yttapi.com/api-docs](https://yttapi.com/api-docs)
- **Email:** support@yttapi.com

---

## License

[MIT](LICENSE.md) - Use freely in personal and commercial projects.
