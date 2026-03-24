# Contributing to Oximy Shield

Thank you for your interest in contributing! This document covers everything you need to get started.

---

## Table of Contents

- [Code of Conduct](#code-of-conduct)
- [How to Contribute](#how-to-contribute)
- [Development Setup](#development-setup)
- [Branch Strategy](#branch-strategy)
- [Commit Convention](#commit-convention)
- [Pull Request Process](#pull-request-process)
- [Architecture Guidelines](#architecture-guidelines)
- [Testing Requirements](#testing-requirements)

---

## Code of Conduct

Be respectful, constructive, and inclusive. We won't tolerate harassment of any kind.

---

## How to Contribute

**Good first contributions:**
- Adding a new AI tool to `src/services/toolRegistry.ts`
- Adding a new risk pattern to `src/services/riskDetector.ts`
- Improving empty states or loading UI
- Writing tests for uncovered paths
- Fixing a bug from the Issues tab

**Before starting large changes:**
Open an issue first to discuss. Large PRs without prior discussion may not be accepted.

---

## Development Setup

```bash
# 1. Fork & clone
git clone https://github.com/YOUR_USERNAME/oximy-shield.git
cd oximy-shield

# 2. Install dependencies
npm install

# 3. Run in watch mode
npm run dev

# 4. Load dist/ in Chrome (chrome://extensions/ → Developer Mode → Load Unpacked)

# 5. Run tests
npm test

# 6. Type check
npm run type-check
```

---

## Branch Strategy

| Branch | Purpose |
|--------|---------|
| `main` | Stable, always deployable |
| `dev` | Integration branch — PRs go here |
| `feat/your-feature` | Feature branches off `dev` |
| `fix/issue-number` | Bug fix branches off `dev` |
| `chore/description` | Maintenance (deps, config) |

**Always branch from `dev`, never `main`.**

```bash
git checkout dev
git pull origin dev
git checkout -b feat/add-mistral-detection
```

---

## Commit Convention

We follow [Conventional Commits](https://www.conventionalcommits.org/).

```
<type>(<scope>): <short description>

[optional body]

[optional footer — e.g. Closes #42]
```

**Types:**

| Type | When to use |
|------|------------|
| `feat` | New feature or capability |
| `fix` | Bug fix |
| `refactor` | Code change with no behaviour change |
| `test` | Adding or fixing tests |
| `docs` | Documentation only |
| `chore` | Build, deps, config — no src change |
| `perf` | Performance improvement |
| `security` | Security fix |

**Scopes:** `content`, `background`, `popup`, `dashboard`, `options`, `detector`, `registry`, `storage`, `policy`, `backend`, `ui`

**Examples:**

```bash
feat(registry): add Mistral Chat detection
fix(content): handle contenteditable in Firefox Nightly
test(detector): add AWS secret false-positive coverage
security(content): prevent raw text leaving page context
docs: update Parrot Linux setup steps
```

---

## Pull Request Process

1. Open your PR against `dev`, not `main`
2. Fill in the PR template completely
3. Ensure all CI checks pass (tests, type-check, lint)
4. Request review from a maintainer
5. Address all review comments before merge
6. Squash commits before merge if asked

**PR title must follow Conventional Commits format.**

---

## Architecture Guidelines

### Where to add things

| What you're adding | Where it goes |
|-------------------|--------------|
| New AI tool | `src/services/toolRegistry.ts` → `KNOWN_AI_TOOLS` array |
| New risk pattern | `src/services/riskDetector.ts` → `RISK_PATTERNS` array |
| New policy rule type | `src/types/index.ts` → `PolicyAction` union |
| New event type | `src/types/index.ts` → `EventType` union |
| New dashboard widget | `src/dashboard/Dashboard.tsx` |
| New UI component | `src/components/ui/index.tsx` |
| New storage key | `src/services/storage.ts` → `KEYS` object |

### Rules

- **Never send raw text to the background** — always run `analyzeText()` in the content script and send only the `DetectionResult`
- **Never store raw secrets** — only redacted snippets go into Chrome Storage
- **Keep `isNew` transient** — do not persist it on the `AITool` storage record
- **Use the dedup map** — any new detection path must go through `handleToolDetection()` in the background
- **Type everything** — no `any` unless unavoidable and commented

### Adding a new AI tool (example)

```typescript
// src/services/toolRegistry.ts → KNOWN_AI_TOOLS array
{
  id: 'mistral',
  name: 'Mistral Chat',
  domains: ['chat.mistral.ai'],
  category: 'llm_chat',
  defaultRiskLevel: 'low',
  vendor: 'Mistral AI',
},
```

Then add a test in `tests/detection.test.ts`:

```typescript
test('detects Mistral Chat', () => {
  expect(detectToolByDomain('chat.mistral.ai')?.id).toBe('mistral');
});
```

### Adding a new risk pattern (example)

```typescript
// src/services/riskDetector.ts → RISK_PATTERNS array
{
  type: 'twilio_sid',
  label: 'Twilio Account SID',
  pattern: /AC[a-zA-Z0-9]{32}/g,
  severity: 'high',
  redactedValue: '[REDACTED:TWILIO_SID]',
},
```

Then verify it doesn't false-positive on common strings and add a test.

---

## Testing Requirements

- All new risk patterns **must** have at least one positive test and one false-positive test
- All new tool registry entries **must** have domain detection tests
- New detection paths in the background **must** have pipeline tests
- Tests live in `tests/detection.test.ts`
- Run with `npm test` — all tests must pass before submitting a PR

---

## Questions?

Open a [Discussion](../../discussions) or file an Issue tagged `question`.
