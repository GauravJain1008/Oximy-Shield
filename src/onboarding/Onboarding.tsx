import React, { useState } from 'react';
import { sendMessage } from '../utils';
import { Button, Spinner } from '../components/ui';

const STEPS = [
  {
    title: 'Welcome to Oximy Shield',
    subtitle: 'Enterprise AI Governance for your organization',
    icon: '🛡️',
    content: (
      <div className="space-y-4">
        <p className="text-slate-400 text-sm leading-relaxed">
          Oximy Shield monitors AI tool usage across your organization, detects sensitive data exposure,
          and enforces AI governance policies — all from your browser.
        </p>
        <div className="grid grid-cols-2 gap-3">
          {[
            { icon: '🤖', label: 'AI Tool Detection', desc: '40+ tools recognized automatically' },
            { icon: '🔒', label: 'Risk Detection', desc: 'Flags API keys, PII, and secrets' },
            { icon: '📊', label: 'Usage Analytics', desc: 'Dashboard with trends & insights' },
            { icon: '⚡', label: 'Policy Engine', desc: 'Approve, block, or warn per tool' },
          ].map(f => (
            <div key={f.label} className="p-3 rounded-xl bg-slate-800/50 border border-slate-700/30">
              <div className="text-xl mb-1.5">{f.icon}</div>
              <div className="text-xs font-semibold text-white mb-0.5">{f.label}</div>
              <div className="text-[10px] text-slate-500">{f.desc}</div>
            </div>
          ))}
        </div>
      </div>
    ),
  },
  {
    title: 'Permissions & Privacy',
    subtitle: "Here's exactly what Oximy Shield can and cannot access",
    icon: '🔒',
    content: (
      <div className="space-y-4">
        <div className="space-y-2">
          {[
            { granted: true, label: 'Tab URLs', desc: 'To detect which AI tools you visit' },
            { granted: true, label: 'Storage', desc: 'To save tool inventory and settings locally' },
            { granted: true, label: 'Notifications', desc: 'To alert you about new tools and risks' },
            { granted: true, label: 'Clipboard (paste only)', desc: 'To scan for secrets when pasting into AI tools' },
            { granted: false, label: 'Conversation content', desc: 'We NEVER read your AI chat messages' },
            { granted: false, label: 'Passwords or form data', desc: 'We NEVER access sensitive form inputs' },
            { granted: false, label: 'External data transmission', desc: 'No data leaves your device by default' },
          ].map(p => (
            <div key={p.label} className="flex items-start gap-3">
              <div className={`w-5 h-5 rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0 mt-0.5 ${p.granted ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30' : 'bg-red-500/20 text-red-400 border border-red-500/30'}`}>
                {p.granted ? '✓' : '✗'}
              </div>
              <div>
                <div className="text-xs font-medium text-white">{p.label}</div>
                <div className="text-[10px] text-slate-500">{p.desc}</div>
              </div>
            </div>
          ))}
        </div>
      </div>
    ),
  },
  {
    title: 'Detecting AI Tools',
    subtitle: 'Oximy Shield recognizes 40+ AI tools automatically',
    icon: '🔍',
    content: (
      <div className="space-y-4">
        <p className="text-slate-400 text-sm">When you visit any of these tools, Oximy Shield will log the visit, track usage time, and apply your policy rules.</p>
        <div className="grid grid-cols-3 gap-2">
          {[
            { name: 'ChatGPT', icon: '💬', cat: 'LLM Chat' },
            { name: 'Claude', icon: '🤖', cat: 'LLM Chat' },
            { name: 'GitHub Copilot', icon: '⌨️', cat: 'Coding' },
            { name: 'Cursor AI', icon: '⌨️', cat: 'Coding' },
            { name: 'Gemini', icon: '🔵', cat: 'LLM Chat' },
            { name: 'Perplexity', icon: '🔍', cat: 'Research' },
            { name: 'Midjourney', icon: '🎨', cat: 'Images' },
            { name: 'Notion AI', icon: '✍️', cat: 'Writing' },
            { name: 'MS Copilot', icon: '🏢', cat: 'Enterprise' },
          ].map(t => (
            <div key={t.name} className="p-2 rounded-lg bg-slate-800/60 border border-slate-700/40 text-center">
              <div className="text-lg mb-0.5">{t.icon}</div>
              <div className="text-[10px] text-white font-medium">{t.name}</div>
              <div className="text-[9px] text-slate-600">{t.cat}</div>
            </div>
          ))}
        </div>
        <p className="text-[11px] text-slate-600">…and 30+ more. Unknown tools are flagged for review.</p>
      </div>
    ),
  },
  {
    title: 'You\'re all set!',
    subtitle: 'Oximy Shield is now protecting your AI usage',
    icon: '✅',
    content: (
      <div className="space-y-4">
        <div className="p-4 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-center">
          <div className="text-4xl mb-2">🛡️</div>
          <div className="text-white font-semibold">Connected Successfully</div>
          <div className="text-xs text-slate-400 mt-1">Oximy Shield is now active and monitoring</div>
        </div>
        <div className="space-y-2">
          {[
            '✅ Visit ChatGPT or Claude to see detection in action',
            '⚠️ Paste a fake API key (sk-test...) to trigger a risk alert',
            '📊 Open the dashboard to view your AI inventory',
            '⚙️ Customize policies in Settings',
          ].map(tip => (
            <div key={tip} className="text-xs text-slate-400 flex gap-2">
              <span>{tip.slice(0, 2)}</span>
              <span>{tip.slice(3)}</span>
            </div>
          ))}
        </div>
      </div>
    ),
  },
];

export default function Onboarding() {
  const [step, setStep] = useState(0);
  const [completing, setCompleting] = useState(false);

  const current = STEPS[step];
  const isLast = step === STEPS.length - 1;

  const complete = async () => {
    setCompleting(true);
    await sendMessage('SET_SCANNING', { enabled: true });
    // Mark as onboarded
    chrome.storage.local.set({ oximy_onboarded: true }, () => {
      window.close();
    });
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex items-center justify-center p-6"
      style={{ fontFamily: "'DM Sans', system-ui, sans-serif" }}>
      <div className="w-full max-w-md">
        {/* Progress */}
        <div className="flex gap-1.5 mb-8">
          {STEPS.map((_, i) => (
            <div
              key={i}
              className="flex-1 h-1 rounded-full transition-all duration-500"
              style={{ background: i <= step ? '#06b6d4' : '#1e293b' }}
            />
          ))}
        </div>

        {/* Card */}
        <div className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden">
          {/* Header */}
          <div className="px-6 pt-6 pb-4 text-center border-b border-slate-800">
            <div className="text-4xl mb-3">{current.icon}</div>
            <h1 className="text-lg font-bold text-white">{current.title}</h1>
            <p className="text-xs text-slate-500 mt-1">{current.subtitle}</p>
          </div>

          {/* Content */}
          <div className="px-6 py-5">{current.content}</div>

          {/* Actions */}
          <div className="px-6 pb-6 flex items-center justify-between">
            <button
              onClick={() => setStep(s => s - 1)}
              disabled={step === 0}
              className="text-sm text-slate-500 hover:text-slate-300 transition-colors disabled:opacity-0"
            >
              ← Back
            </button>
            <div className="flex items-center gap-2">
              <span className="text-xs text-slate-600">{step + 1} / {STEPS.length}</span>
              {isLast ? (
                <Button onClick={complete} variant="primary" size="md" disabled={completing}>
                  {completing ? <Spinner size={14} /> : null}
                  Open Dashboard →
                </Button>
              ) : (
                <Button onClick={() => setStep(s => s + 1)} variant="primary" size="md">
                  Next →
                </Button>
              )}
            </div>
          </div>
        </div>

        {/* Skip */}
        {!isLast && (
          <div className="text-center mt-4">
            <button onClick={complete} className="text-xs text-slate-700 hover:text-slate-500 transition-colors">
              Skip setup
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
