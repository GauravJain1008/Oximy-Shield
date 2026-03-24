# Changelog

All notable changes to Oximy Shield are documented here.  
Format follows [Keep a Changelog](https://keepachangelog.com/en/1.0.0/).  
Versioning follows [Semantic Versioning](https://semver.org/).

---

## [Unreleased]

---

## [1.3.0] — 2025-03-24

### Added
- Real-time sensitive data detection in content script
- `risky_input_detected` event type for typed content (distinct from paste)
- New risk patterns: `anthropic_key`, `npm_token`, `bearer_token`
- Contenteditable support — ChatGPT, Claude, Gemini inputs now monitored
- `WeakMap` fingerprint dedup on input handler — prevents re-scanning identical content
- Animated slide-in/slide-out banner with accessible `role=alert`
- "View in Dashboard" and "Dismiss" buttons on inline risk banner
- Banner style injected once at module load (not per-call)
- Named notification IDs — prevents duplicate OS notifications per tool+level

### Fixed
- `aws_secret` false-positive pattern — old bare `/[a-zA-Z0-9/+]{40}/g` matched UUIDs, hashes, base64; new pattern requires assignment context
- Raw text no longer travels over `chrome.runtime.sendMessage` — only `DetectionResult` (redacted metadata) is sent
- Background no longer re-runs `analyzeText()` on received risk payloads
- `toolName` now resolved from storage and stored on risk events (was blank before)
- `medium` risk level (emails, code) now triggers banner on paste (was silently ignored)

---

## [1.2.0] — 2025-03-24

### Added
- Real AI tool detection via `chrome.tabs.onUpdated` and content script `TOOL_DETECTED` message
- Deduplication map (`lastDetection`) — prevents duplicate events when `onUpdated` fires multiple times per navigation
- `handleToolDetection()` central function shared by tab listener and content script path
- Policy violation events now written to storage when a blocked domain is visited
- `uniqueTools` field in usage stats now populated from real event data
- Blocked domain check uses actual browser hostname (not `toolDef.domains[0]`)
- `senderTabId` from `sender.tab.id` in message listener — content scripts no longer attempt `chrome.tabs.getCurrent()`

### Fixed
- `tool_detected` message type casing mismatch (content script sent lowercase, background expected uppercase)
- `isNew` flag no longer persisted to stored `AITool` record — it's transient event metadata only
- Silent policy blocking — was `return` without recording; now writes `policy_violation` event

### Changed
- `TOOL_DETECTED` message payload: removed `tabId` (now read from `sender`), removed `toolName` (redundant with registry), added `hostname`

---

## [1.1.0] — 2025-03-24

### Added
- `scanning: boolean` and `newToolsLastWeek: number` fields on `DashboardSummary`
- Week-over-week trend calculation for "New This Week" KPI card
- Real scanning state wired to `StatusDot` in dashboard top bar
- Empty state guards on trend chart, category pie, and Top Tools panel
- `risky_input_detected` added to `RISK_EVENT_TYPES` filter in `GET_SUMMARY`

### Removed
- **All mock/seed data** — `seedMockData()` function (10 fake tools, 6 fake events, seeded recommendations) deleted
- `generateMockUsageStats()` — random 30-day usage data generator deleted
- `getUsageStats()` fallback changed from random generator to `[]`

### Fixed
- `riskEvents` KPI counter no longer inflated by routine `tool_detected` events
- `topTools` now mapped as `ToolUsageStat` (with `.toolId`, `.toolName`, `.visits`, `.riskScore`) — was raw `AITool[]` causing blank names in dashboard
- `trend={12}` hardcoded percentage replaced with real week-over-week calculation

---

## [1.0.0] — 2025-03-01

### Added
- Initial release
- Chrome Extension Manifest V3
- Background service worker with tab monitoring
- Content script with paste monitoring and inline risk banner
- Risk detector with 16 regex patterns (API keys, PII, secrets, source code)
- Tool registry with 40+ AI tools across 6 categories
- React popup with current tool, risk level, recent events
- React dashboard with KPI cards, usage trend chart, tool inventory, event log, recommendations
- React options page with policy editor, domain lists, privacy settings
- React onboarding wizard
- Lightweight Node.js backend (zero dependencies)
- Recommendation engine (5 rule types)
- Chrome Storage persistence
- Browser notifications for new tool detection and risk events
- Extension badge with risk level colour coding

---

[Unreleased]: https://github.com/YOUR_ORG/oximy-shield/compare/v1.3.0...HEAD
[1.3.0]: https://github.com/YOUR_ORG/oximy-shield/compare/v1.2.0...v1.3.0
[1.2.0]: https://github.com/YOUR_ORG/oximy-shield/compare/v1.1.0...v1.2.0
[1.1.0]: https://github.com/YOUR_ORG/oximy-shield/compare/v1.0.0...v1.1.0
[1.0.0]: https://github.com/YOUR_ORG/oximy-shield/releases/tag/v1.0.0
