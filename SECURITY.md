# Security Policy

## Supported Versions

| Version | Supported |
|---------|-----------|
| 1.x.x   | ✅ Yes     |

## Reporting a Vulnerability

**Do not file a public GitHub issue for security vulnerabilities.**

Email **security@oximy.io** with:

1. Description of the vulnerability
2. Steps to reproduce
3. Potential impact
4. Any suggested fix (optional)

You will receive a response within 48 hours. We aim to patch critical issues within 7 days and disclose responsibly after a fix is released.

## Security Design Principles

- Raw sensitive content (API keys, passwords, PII) **never** travels over `chrome.runtime.sendMessage` — only redacted metadata leaves the content script
- All data is stored locally in `chrome.storage.local` — nothing is sent to external servers by default
- The extension uses Manifest V3 with a service worker, not a persistent background page
- Sensitive data is redacted using regex replacement before any storage or logging
- No `eval()` or unsafe DOM injection anywhere in the codebase
- Content Security Policy is enforced via `manifest.json` `content_security_policy` field
