## Summary

<!-- One sentence: what does this PR do? -->

## Type of change

- [ ] `feat` — new feature
- [ ] `fix` — bug fix
- [ ] `refactor` — no behaviour change
- [ ] `test` — adding or fixing tests
- [ ] `docs` — documentation only
- [ ] `chore` — build, deps, config
- [ ] `security` — security fix

## Changes made

<!-- List the files changed and why -->

- `src/...` — 
- `tests/...` — 

## Testing

- [ ] `npm test` passes
- [ ] `npm run type-check` passes
- [ ] `npm run build` produces a working `dist/`
- [ ] Manually tested in Chrome with the built extension

**Manual test steps:**
1. 
2. 

## Security checklist (if touching content script or background)

- [ ] Raw sensitive text does NOT travel over `chrome.runtime.sendMessage`
- [ ] Only redacted content is written to `chrome.storage.local`
- [ ] No new `any` types introduced without comment
- [ ] `isNew` flag is NOT persisted to the stored `AITool` record

## Related issues

Closes #

## Screenshots (if UI change)

<!-- Before / After screenshots -->
