// Oximy Shield — Content Script
// Injected into every page. Runs in the page's context but in an isolated world.
// Only activates fully when the current hostname is a known AI tool.

import { detectToolByDomain } from '../services/toolRegistry';
import { analyzeText, DetectionResult } from '../services/riskDetector';

// ─── Bootstrap ────────────────────────────────────────────────────────────────

const hostname = window.location.hostname;
const toolDef = detectToolByDomain(hostname);

// Inject the banner keyframe style exactly once at module load, not per-call.
// Doing it inside showRiskBanner() would duplicate the <style> tag on every alert.
injectBannerStyle();

if (toolDef) {
  init();
}

function init(): void {
  // ── Signal tool detection to background ──────────────────────────────────
  // NOTE: chrome.tabs.getCurrent() is NOT available in content scripts —
  // it only works in extension pages (popup, background, options).
  // The background service worker reads the real tab ID from sender.tab.id
  // in the onMessage listener, so we do NOT send tabId here at all.
  chrome.runtime.sendMessage({
    type: 'TOOL_DETECTED',
    payload: { hostname, toolId: toolDef!.id },
  });

  // ── Paste monitoring ──────────────────────────────────────────────────────
  // capture:true ensures we see the event before any page handler can cancel it.
  document.addEventListener('paste', handlePaste, { capture: true });

  // ── Input monitoring (debounced) ──────────────────────────────────────────
  // Monitors typed content in addition to paste.
  // Uses 2000ms debounce so we don't scan on every keypress.
  document.addEventListener('input', debounce(handleInput, 2000), { capture: true });
}

// ─── Paste Handler ────────────────────────────────────────────────────────────
// Fires whenever the user pastes anything into ANY element on the page.

function handlePaste(e: ClipboardEvent): void {
  if (!toolDef) return;

  const text = e.clipboardData?.getData('text/plain') ?? '';

  // Skip trivially short pastes — no known pattern is under 8 characters.
  if (text.length < 8) return;

  const result = analyzeText(text);
  if (!result.hasRisk) return;

  // ── Redact locally before anything leaves the page ────────────────────────
  // We send the DetectionResult (match metadata + redacted text), never raw text.
  // The background receives only what it needs to store a structured event.
  sendRiskToBackground(result, 'paste');

  // Show inline banner for medium and above
  showRiskBanner(result.riskLevel, result.matches.map(m => m.label));
}

// ─── Input Handler ────────────────────────────────────────────────────────────
// Monitors typed/autocompleted content. Runs after a debounce.

// WeakMap so entries are GC'd automatically when elements leave the DOM.
const lastScanned = new WeakMap<Element, string>();

function fingerprint(text: string): string {
  return text.slice(0, 60) + ':' + text.length;
}

function handleInput(e: Event): void {
  if (!toolDef) return;

  const el = e.target as Element;
  if (!el) return;

  // Extract text from both classic inputs/textareas AND contenteditable divs.
  // ChatGPT, Claude, Gemini use contenteditable — NOT textarea.
  // The old check ('value' in el) missed all of them.
  let text = '';
  if (el instanceof HTMLInputElement || el instanceof HTMLTextAreaElement) {
    text = el.value;
  } else if ((el as HTMLElement).isContentEditable) {
    text = (el as HTMLElement).innerText;
  } else {
    return; // not an editable element we care about
  }

  // Minimum length — short typed content is unlikely to contain secrets
  if (text.length < 30) return;

  // ── Deduplication ─────────────────────────────────────────────────────────
  const fp = fingerprint(text);
  if (lastScanned.get(el) === fp) return;
  lastScanned.set(el, fp);

  const result = analyzeText(text);

  // Only act on high/critical for typed input.
  // Medium patterns (emails, code) are too noisy for keystroke monitoring.
  // Paste events still catch medium+ because pasting a block is a deliberate act.
  if (!result.hasRisk || (result.riskLevel !== 'high' && result.riskLevel !== 'critical')) {
    return;
  }

  sendRiskToBackground(result, 'input');
  showRiskBanner(result.riskLevel, result.matches.map(m => m.label));
}

// ─── Risk Payload Sender ──────────────────────────────────────────────────────
// Sends only structured metadata + already-redacted text snippet.
// Raw sensitive content NEVER leaves this function.

function sendRiskToBackground(result: DetectionResult, source: 'paste' | 'input'): void {
  try {
    chrome.runtime.sendMessage({
      type: 'RISK_DETECTED',
      payload: {
        // Redacted text capped at 300 chars — enough for the event log preview.
        redactedSnippet: result.redactedText.slice(0, 300),
        // Structured match list — type, label, severity, count only.
        matches: result.matches,
        riskLevel: result.riskLevel,
        domain: hostname,
        toolId: toolDef!.id,
        source, // 'paste' | 'input' — determines event type stored in background
      },
    });
  } catch {
    // Extension context invalidated; silently ignore.
  }
}

function sendToBackground(type: string, payload: unknown): void {
  try {
    chrome.runtime.sendMessage({ type, payload });
  } catch {
    // Extension context invalidated; silently ignore.
  }
}

// ─── Inline Risk Banner ───────────────────────────────────────────────────────

let bannerEl: HTMLDivElement | null = null;
let bannerTimeout: ReturnType<typeof setTimeout> | null = null;

// Inject style ONCE at module load. Never inside showRiskBanner().
function injectBannerStyle(): void {
  if (document.getElementById('oximy-banner-style')) return;
  const style = document.createElement('style');
  style.id = 'oximy-banner-style';
  style.textContent = `
    @keyframes oximy-in  { from { transform:translateX(calc(100% + 32px)); opacity:0 }
                             to  { transform:translateX(0); opacity:1 } }
    @keyframes oximy-out { from { transform:translateX(0); opacity:1 }
                             to  { transform:translateX(calc(100% + 32px)); opacity:0 } }
    #oximy-banner { animation: oximy-in 0.28s cubic-bezier(0.34,1.56,0.64,1) both; }
    #oximy-banner.oximy-hiding { animation: oximy-out 0.22s ease-in both; }
  `;
  (document.head ?? document.documentElement).appendChild(style);
}

function showRiskBanner(level: string, labels: string[]): void {
  dismissBanner(false); // remove any existing banner immediately

  if (level === 'none' || level === 'low') return; // no banner for low/none

  const THEME: Record<string, { bg: string; border: string; text: string; sub: string; icon: string }> = {
    critical: { bg: '#130303', border: '#ef4444', text: '#fca5a5', sub: '#fecaca', icon: '🚨' },
    high:     { bg: '#130800', border: '#f97316', text: '#fdba74', sub: '#fed7aa', icon: '⚠️' },
    medium:   { bg: '#130e00', border: '#f59e0b', text: '#fcd34d', sub: '#fde68a', icon: '⚡' },
  };
  const c = THEME[level] ?? THEME.medium;
  const labelText = labels.slice(0, 2).join(', ') + (labels.length > 2 ? ` +${labels.length - 2} more` : '');
  const levelLabel = level.charAt(0).toUpperCase() + level.slice(1);

  bannerEl = document.createElement('div');
  bannerEl.id = 'oximy-banner';
  bannerEl.setAttribute('data-oximy', 'true');
  bannerEl.setAttribute('role', 'alert');
  bannerEl.setAttribute('aria-live', 'assertive');

  bannerEl.style.cssText = [
    'position:fixed', 'top:16px', 'right:16px', 'z-index:2147483647',
    `background:${c.bg}`, `border:1.5px solid ${c.border}`,
    'border-radius:12px', 'padding:12px 14px',
    'max-width:340px', 'min-width:260px',
    `font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif`,
    'font-size:13px', `color:${c.text}`,
    `box-shadow:0 4px 32px rgba(0,0,0,0.55),0 0 0 1px ${c.border}22`,
    'cursor:default', 'user-select:none',
  ].join(';');

  bannerEl.innerHTML = `
    <div style="display:flex;align-items:flex-start;gap:10px">
      <span style="font-size:20px;line-height:1.2;flex-shrink:0">${c.icon}</span>
      <div style="flex:1;min-width:0">
        <div style="font-weight:700;font-size:11px;letter-spacing:.07em;text-transform:uppercase;margin-bottom:3px;opacity:.75">
          Oximy Shield &mdash; ${levelLabel} Risk
        </div>
        <div style="font-size:12.5px;line-height:1.45;word-break:break-word">
          <strong>${labelText}</strong> detected
        </div>
        <div style="margin-top:7px;display:flex;gap:6px;align-items:center">
          <button id="oximy-view-btn" style="
            background:${c.border}25;border:1px solid ${c.border}60;
            border-radius:6px;padding:3px 9px;font-size:11px;font-weight:600;
            color:${c.text};cursor:pointer
          ">View in Dashboard</button>
          <button id="oximy-dismiss-btn" style="
            background:none;border:none;font-size:11px;
            color:${c.sub};cursor:pointer;opacity:.7;padding:3px 4px
          ">Dismiss</button>
        </div>
      </div>
    </div>
  `;

  document.documentElement.appendChild(bannerEl);

  bannerEl.querySelector('#oximy-view-btn')?.addEventListener('click', (ev) => {
    ev.stopPropagation();
    sendToBackground('OPEN_DASHBOARD', null);
    dismissBanner(true);
  });

  bannerEl.querySelector('#oximy-dismiss-btn')?.addEventListener('click', (ev) => {
    ev.stopPropagation();
    dismissBanner(true);
  });

  bannerTimeout = setTimeout(() => dismissBanner(true), 8000);
}

function dismissBanner(animate: boolean): void {
  if (bannerTimeout) { clearTimeout(bannerTimeout); bannerTimeout = null; }
  if (!bannerEl) return;
  if (animate) {
    bannerEl.classList.add('oximy-hiding');
    bannerEl.addEventListener('animationend', () => { bannerEl?.remove(); bannerEl = null; }, { once: true });
  } else {
    bannerEl.remove();
    bannerEl = null;
  }
}

// ─── Utils ────────────────────────────────────────────────────────────────────

function debounce<T extends (...args: unknown[]) => void>(fn: T, delay: number): T {
  let timer: ReturnType<typeof setTimeout>;
  return ((...args: unknown[]) => {
    clearTimeout(timer);
    timer = setTimeout(() => fn(...args), delay);
  }) as T;
}
