# Oximy Shield

**Enterprise AI Governance — Chrome Extension**

Detect shadow AI tools, prevent sensitive data leaks, enforce policy, and get real-time insights — all from your browser, all locally.

[![CI](https://github.com/YOUR_ORG/oximy-shield/actions/workflows/ci.yml/badge.svg)](https://github.com/YOUR_ORG/oximy-shield/actions/workflows/ci.yml)
[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](LICENSE)
[![Manifest V3](https://img.shields.io/badge/Chrome-Manifest%20V3-green.svg)](https://developer.chrome.com/docs/extensions/mv3/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.4-blue)](https://www.typescriptlang.org/)

---

## What is Oximy Shield?

Companies are losing control of which AI tools their employees use, and what data gets pasted into them. Oximy Shield is a Chrome Extension that gives security and compliance teams:

- **Visibility** — every AI tool visit is detected and catalogued automatically
- **Risk detection** — API keys, passwords, tokens, and PII are caught before they reach AI tools
- **Policy control** — approve, block, or restrict tools per domain or category
- **Actionable insights** — a full enterprise dashboard with charts, recommendations, and event logs

Everything runs locally. No data leaves your browser unless you configure a backend.

---

## Features

### AI Tool Detection
- **40+ tools** recognised automatically by domain — ChatGPT, Claude, Gemini, Perplexity, Cursor, GitHub Copilot, Notion AI, Midjourney, Microsoft Copilot, and more
- Categorised as: LLM Chat, Coding Assistant, Research, Writing, Image Generation, Enterprise AI
- First-seen detection triggers a "New Tool" notification
- Deduplication — one event per navigation, not one per `onUpdated` fire

### Sensitive Data Detection

| Pattern | Severity |
|---------|---------|
| OpenAI, Anthropic, Google, Stripe API keys | Critical |
| AWS Access Key, GitHub token, npm token | Critical |
| Database connection strings, RSA private keys | Critical |
| JWT tokens, Bearer tokens, Slack tokens, passwords | High |
| SSN, credit card numbers | Critical |
| Email addresses, phone numbers | Medium |
| Source code snippets, CONFIDENTIAL markers | Medium/High |
| Internal IP addresses | Low |

- Paste events monitored on **all input types** including `contenteditable` (ChatGPT, Claude, Gemini)
- Typed content monitored with 2s debounce — high/critical only
- All sensitive content **redacted locally** before anything leaves the page

### Policy Engine
- Approved and blocked domain lists
- Per-rule actions: `allow`, `warn`, `block`, `allow_with_logging`
- Policy violations written to the event log and dashboard KPIs

### Dashboard
- KPI cards with real week-over-week trend percentages
- 14-day usage trend chart built from real browsing activity
- Category breakdown pie chart
- Top tools by visit count
- Full event log with source, risk level, redacted snippet, timestamp
- Recommendations engine (5 rule types)

---

## Quick Start

### Prerequisites
- Node.js 18+ (use [NVM](https://github.com/nvm-sh/nvm))
- Chrome or Chromium 114+

### Install & build

```bash
git clone https://github.com/YOUR_ORG/oximy-shield.git
cd oximy-shield
npm install
npm run build
```

### Load into Chrome

1. Open `chrome://extensions/`
2. Toggle **Developer mode** on
3. Click **Load unpacked**
4. Select the `dist/` folder
5. Pin the extension from the toolbar 

### Verify it works

1. Visit `https://chat.openai.com` — popup shows **ChatGPT · Medium Risk**
2. Paste into the chat input:
   ```
   sk-testABCDEFGHIJKLMNOPQRSTUVWXYZ1234567890abc
   ```
3. Red banner: **CRITICAL Risk — OpenAI API Key detected**
4. Open Dashboard → Events tab — redacted event is logged

### Run tests

```bash
npm test
```

### Optional backend

```bash
node backend/server.js   # starts at http://localhost:3001
```

---

## Project Structure

```
oximy-shield/
├── .github/
│   ├── workflows/           # CI (test+build) and Release (tag→zip→publish)
│   ├── ISSUE_TEMPLATE/      # Bug, feature, add-tool templates
│   └── pull_request_template.md
│
├── public/
│   ├── manifest.json        # Chrome Extension MV3 manifest
│   └── icons/               # 16, 48, 128px PNG icons
│
├── src/
│   ├── types/index.ts       # All TypeScript interfaces and unions
│   ├── services/
│   │   ├── toolRegistry.ts  # 40+ AI tool definitions, domain lookup
│   │   ├── riskDetector.ts  # 20 regex patterns, analyzeText()
│   │   ├── storage.ts       # Chrome Storage abstraction
│   │   └── recommendations.ts
│   ├── utils/index.ts
│   ├── background/index.ts  # Service worker — detection, storage, messages
│   ├── content/index.ts     # Page script — paste/input monitoring, banner
│   ├── components/ui/       # Shared React components
│   ├── popup/               # Extension popup (React)
│   ├── dashboard/           # Full dashboard (React + Recharts)
│   ├── options/             # Settings page (React)
│   └── onboarding/          # First-run wizard (React)
│
├── backend/server.js        # Optional Node.js API (zero dependencies)
├── tests/detection.test.ts  # Unit tests
└── package.json
```

---

## Architecture

```
Content Script          Background Worker         chrome.storage.local
──────────────          ─────────────────         ────────────────────
analyzeText()    ──▶    handleToolDetection()  ──▶  oximy_tools
(local, no I/O)         handleRiskDetected()        oximy_events
                        Dedup map                   oximy_policy
Sends only:             Session tracking            oximy_usage_stats
  TOOL_DETECTED         Recommendations
  RISK_DETECTED         Badge + notifications
  (redacted)
```

**Key decisions:**

- **Local-first** — no data leaves the device by default
- **Redact at source** — `analyzeText()` runs in the content script; only the `DetectionResult` (redacted metadata) travels over `sendMessage`, never raw text
- **Contenteditable support** — ChatGPT, Claude, and Gemini all use `contenteditable` divs, not `<textarea>`. The content script checks `el.isContentEditable`
- **Named dedup** — a `Map<tabId, {toolId, timestamp}>` prevents duplicate events when `chrome.tabs.onUpdated` fires multiple times per navigation
- **Contextual aws_secret** — the pattern requires an assignment prefix (`AWS_SECRET_KEY=...`) to avoid false-positives on UUIDs and hashes

---

## Backend API

```bash
node backend/server.js
```

| Method | Path | Description |
|--------|------|-------------|
| `POST` | `/events` | Ingest redacted events |
| `GET` | `/summary` | Dashboard data |
| `GET` | `/alerts` | Risk events |
| `GET` | `/tools` | Tool inventory |
| `GET` | `/policy` | Current policy |
| `POST` | `/policy` | Update policy |
| `POST` | `/tools/approve` | Approve `{ toolId }` |
| `POST` | `/tools/block` | Block `{ toolId }` |
| `GET` | `/health` | Health check |

---

## Contributing

See [CONTRIBUTING.md](CONTRIBUTING.md) for the full guide.

```bash
# Add a new AI tool detection
# 1. src/services/toolRegistry.ts → KNOWN_AI_TOOLS
# 2. tests/detection.test.ts → detection + category test

# Add a new risk pattern
# 1. src/services/riskDetector.ts → RISK_PATTERNS
# 2. tests/detection.test.ts → positive + false-positive test
```

Branch from `dev`, not `main`. PR titles follow Conventional Commits.

---

## Security

See [SECURITY.md](SECURITY.md) to report a vulnerability.

**Permissions used:**

| Permission | Reason |
|-----------|--------|
| `storage` | Persist tool inventory locally |
| `tabs` | Detect AI tool visits |
| `notifications` | Alert on new tools and risks |
| `clipboardRead` | Scan paste events |
| `activeTab` | Get current tab URL |
| `<all_urls>` | Content script needs all AI tool domains |

---

## Releases

See [CHANGELOG.md](CHANGELOG.md). To publish a release:

```bash
# 1. Bump version in package.json + public/manifest.json
# 2. Update CHANGELOG.md
# 3. git commit -m "chore: release v1.4.0"
# 4. git tag v1.4.0
# 5. git push origin main --tags
# → GitHub Actions builds, zips, and creates the release automatically
```

---

## License

[MIT](LICENSE) — © 2025 Oximy Shield Contributors
