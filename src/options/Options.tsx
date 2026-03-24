import React, { useEffect, useState } from 'react';
import { PolicyConfig } from '../types';
import { sendMessage } from '../utils';
import { Button, Card, Toggle, Spinner, SectionHeader } from '../components/ui';

export default function Options() {
  const [policy, setPolicy] = useState<PolicyConfig | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [newApproved, setNewApproved] = useState('');
  const [newBlocked, setNewBlocked] = useState('');
  const [activeSection, setActiveSection] = useState<'general' | 'policy' | 'domains' | 'privacy' | 'data'>('general');
  const [clearing, setClearing] = useState(false);

  useEffect(() => {
    sendMessage<PolicyConfig>('GET_POLICY').then((p) => {
      setPolicy(p);
      setLoading(false);
    });
  }, []);

  const save = async () => {
    if (!policy) return;
    setSaving(true);
    try {
      await sendMessage('UPDATE_POLICY', policy);
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
    } finally {
      setSaving(false);
    }
  };

  const update = (key: keyof PolicyConfig, value: unknown) => {
    setPolicy(p => p ? { ...p, [key]: value } : p);
  };

  const addDomain = (type: 'approved' | 'blocked') => {
    const domain = type === 'approved' ? newApproved.trim() : newBlocked.trim();
    if (!domain || !policy) return;
    const key = type === 'approved' ? 'approvedDomains' : 'blockedDomains';
    update(key, [...policy[key], domain]);
    if (type === 'approved') setNewApproved('');
    else setNewBlocked('');
  };

  const removeDomain = (type: 'approved' | 'blocked', domain: string) => {
    if (!policy) return;
    const key = type === 'approved' ? 'approvedDomains' : 'blockedDomains';
    update(key, policy[key].filter(d => d !== domain));
  };

  const clearData = async () => {
    if (!confirm('Clear all Oximy Shield data? This cannot be undone.')) return;
    setClearing(true);
    await sendMessage('CLEAR_DATA');
    setClearing(false);
    alert('Data cleared. Restart the extension to re-initialize.');
  };

  if (loading) {
    return <div className="min-h-screen bg-slate-950 flex items-center justify-center"><Spinner size={28} /></div>;
  }

  const sections = [
    { id: 'general', label: 'General', icon: '⚙️' },
    { id: 'policy', label: 'Policy Rules', icon: '📋' },
    { id: 'domains', label: 'Domains', icon: '🌐' },
    { id: 'privacy', label: 'Privacy', icon: '🔒' },
    { id: 'data', label: 'Data & Export', icon: '💾' },
  ] as const;

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex" style={{ fontFamily: "'DM Sans', system-ui, sans-serif" }}>
      {/* Sidebar */}
      <div className="w-52 bg-slate-900/80 border-r border-slate-800 flex flex-col min-h-screen">
        <div className="px-5 py-5 border-b border-slate-800">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-cyan-400 to-blue-600 flex items-center justify-center text-xs font-bold text-slate-900">OS</div>
            <div>
              <div className="text-sm font-bold text-white">Oximy Shield</div>
              <div className="text-[10px] text-slate-500">Settings</div>
            </div>
          </div>
        </div>
        <nav className="flex-1 px-3 py-4 space-y-0.5">
          {sections.map(s => (
            <button
              key={s.id}
              onClick={() => setActiveSection(s.id)}
              className={`w-full flex items-center gap-2.5 px-3 py-2.5 rounded-lg text-sm font-medium transition-all text-left ${
                activeSection === s.id
                  ? 'bg-cyan-500/10 text-cyan-400 border border-cyan-500/20'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/50'
              }`}
            >
              <span>{s.icon}</span>{s.label}
            </button>
          ))}
        </nav>
      </div>

      {/* Content */}
      <div className="flex-1 p-8 max-w-2xl">
        <div className="flex items-center justify-between mb-8">
          <h1 className="text-xl font-bold text-white capitalize">{activeSection} Settings</h1>
          <Button onClick={save} variant="primary" size="md" disabled={saving}>
            {saving ? <Spinner size={14} /> : saving ? null : saved ? '✓ Saved!' : null}
            {saved ? 'Saved!' : 'Save Changes'}
          </Button>
        </div>

        {activeSection === 'general' && policy && (
          <div className="space-y-4">
            <Card className="p-5">
              <SectionHeader title="Scanning" sub="Control when and how Oximy Shield monitors AI tool usage." />
              <div className="space-y-4">
                {[
                  { key: 'scanningEnabled', label: 'Enable scanning', desc: 'Monitor AI tool visits and activity' },
                  { key: 'clipboardScanEnabled', label: 'Clipboard scanning', desc: 'Detect sensitive data in paste events' },
                  { key: 'notificationsEnabled', label: 'Browser notifications', desc: 'Show alerts for new tools and risks' },
                  { key: 'dataRedactionEnabled', label: 'Auto-redact sensitive data', desc: 'Never log raw secrets (recommended)' },
                  { key: 'warnOnNewTool', label: 'Warn on new AI tool', desc: 'Alert when an unrecognized AI tool is first detected' },
                  { key: 'blockOnCriticalRisk', label: 'Block on critical risk', desc: 'Prevent paste when critical secrets are detected' },
                ] .map(({ key, label, desc }) => (
                  <div key={key} className="flex items-center justify-between">
                    <div>
                      <div className="text-sm text-white font-medium">{label}</div>
                      <div className="text-xs text-slate-500">{desc}</div>
                    </div>
                    <Toggle
                      checked={policy[key as keyof PolicyConfig] as boolean}
                      onChange={(v) => update(key as keyof PolicyConfig, v)}
                    />
                  </div>
                ))}
              </div>
            </Card>
          </div>
        )}

        {activeSection === 'policy' && policy && (
          <div className="space-y-4">
            <Card className="p-5">
              <SectionHeader title="Policy Rules" sub="Rules that govern how Oximy Shield responds to AI tool usage." />
              <div className="space-y-3">
                {policy.rules.map((rule, idx) => (
                  <div key={rule.id} className="flex items-start gap-3 p-3 rounded-lg bg-slate-800/50 border border-slate-700/50">
                    <Toggle
                      checked={rule.enabled}
                      onChange={(v) => {
                        const rules = [...policy.rules];
                        rules[idx] = { ...rule, enabled: v };
                        update('rules', rules);
                      }}
                    />
                    <div className="flex-1">
                      <div className="text-sm font-medium text-white">{rule.name}</div>
                      <div className="text-xs text-slate-500 mt-0.5">{rule.description}</div>
                      <div className="mt-2">
                        <select
                          value={rule.action}
                          onChange={(e) => {
                            const rules = [...policy.rules];
                            rules[idx] = { ...rule, action: e.target.value as any };
                            update('rules', rules);
                          }}
                          className="text-xs bg-slate-700 border border-slate-600 rounded-lg px-2 py-1 text-slate-300 focus:outline-none focus:border-cyan-500/50"
                        >
                          <option value="allow">Allow</option>
                          <option value="warn">Warn</option>
                          <option value="block">Block</option>
                          <option value="allow_with_logging">Allow + Log</option>
                        </select>
                      </div>
                    </div>
                    <span className={`text-[10px] px-2 py-0.5 rounded-full font-medium ${
                      rule.action === 'block' ? 'bg-red-500/15 text-red-400' :
                      rule.action === 'warn' ? 'bg-amber-500/15 text-amber-400' :
                      'bg-emerald-500/15 text-emerald-400'
                    }`}>
                      {rule.action.replace('_', ' ')}
                    </span>
                  </div>
                ))}
              </div>
            </Card>
          </div>
        )}

        {activeSection === 'domains' && policy && (
          <div className="space-y-4">
            <Card className="p-5">
              <SectionHeader title="Approved Domains" sub="These AI tools are explicitly allowed." />
              <div className="space-y-2 mb-3">
                {policy.approvedDomains.map(d => (
                  <div key={d} className="flex items-center justify-between px-3 py-1.5 rounded-lg bg-emerald-500/5 border border-emerald-500/20">
                    <span className="text-sm text-emerald-400 font-mono">{d}</span>
                    <button onClick={() => removeDomain('approved', d)} className="text-slate-600 hover:text-red-400 text-xs">✕</button>
                  </div>
                ))}
              </div>
              <div className="flex gap-2">
                <input
                  value={newApproved}
                  onChange={e => setNewApproved(e.target.value)}
                  onKeyDown={e => e.key === 'Enter' && addDomain('approved')}
                  placeholder="Add domain (e.g. chat.openai.com)"
                  className="flex-1 bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-sm text-slate-200 placeholder-slate-600 focus:outline-none focus:border-emerald-500/50 font-mono"
                />
                <Button onClick={() => addDomain('approved')} variant="success" size="sm">+ Add</Button>
              </div>
            </Card>

            <Card className="p-5">
              <SectionHeader title="Blocked Domains" sub="These AI tools will be flagged as policy violations." />
              <div className="space-y-2 mb-3">
                {policy.blockedDomains.length === 0 && (
                  <div className="text-xs text-slate-600 py-2">No blocked domains configured.</div>
                )}
                {policy.blockedDomains.map(d => (
                  <div key={d} className="flex items-center justify-between px-3 py-1.5 rounded-lg bg-red-500/5 border border-red-500/20">
                    <span className="text-sm text-red-400 font-mono">{d}</span>
                    <button onClick={() => removeDomain('blocked', d)} className="text-slate-600 hover:text-red-400 text-xs">✕</button>
                  </div>
                ))}
              </div>
              <div className="flex gap-2">
                <input
                  value={newBlocked}
                  onChange={e => setNewBlocked(e.target.value)}
                  onKeyDown={e => e.key === 'Enter' && addDomain('blocked')}
                  placeholder="Add domain to block"
                  className="flex-1 bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-sm text-slate-200 placeholder-slate-600 focus:outline-none focus:border-red-500/50 font-mono"
                />
                <Button onClick={() => addDomain('blocked')} variant="danger" size="sm">+ Block</Button>
              </div>
            </Card>
          </div>
        )}

        {activeSection === 'privacy' && (
          <Card className="p-5">
            <SectionHeader title="Privacy & Data Collection" />
            <div className="space-y-4 text-sm text-slate-400">
              <p className="leading-relaxed">Oximy Shield is designed with privacy-first principles. Here is exactly what we collect and what we don't.</p>
              {[
                { icon: '✅', title: 'What we DO collect', items: ['Domain of AI tools visited', 'Visit counts and session duration', 'Redacted snippets of risky content (never raw)', 'Tool category and risk classification', 'Policy rule matches (type only, no content)'] },
                { icon: '🚫', title: 'What we NEVER collect', items: ['The actual content of your AI conversations', 'Raw API keys, passwords, or sensitive values', 'Personal browsing history outside AI tools', 'Clipboard contents (only scanned locally, never stored raw)', 'User identity beyond device ID (random, local-only)'] },
              ].map(section => (
                <div key={section.title} className="p-3 rounded-lg bg-slate-800/50 border border-slate-700/50">
                  <div className="font-semibold text-white mb-2">{section.icon} {section.title}</div>
                  <ul className="space-y-1">
                    {section.items.map(i => (
                      <li key={i} className="text-xs text-slate-500 flex gap-2"><span className="text-slate-700">—</span>{i}</li>
                    ))}
                  </ul>
                </div>
              ))}
              <p className="text-xs text-slate-600">All data is stored locally in Chrome's extension storage. No data is sent to external servers unless you configure a backend endpoint.</p>
            </div>
          </Card>
        )}

        {activeSection === 'data' && (
          <div className="space-y-4">
            <Card className="p-5">
              <SectionHeader title="Export Data" sub="Download your event log and tool inventory." />
              <div className="flex gap-3">
                <Button variant="secondary" size="sm" onClick={async () => {
                  const tools = await sendMessage<any[]>('GET_TOOLS');
                  const blob = new Blob([JSON.stringify(tools, null, 2)], { type: 'application/json' });
                  const url = URL.createObjectURL(blob);
                  const a = document.createElement('a');
                  a.href = url; a.download = 'oximy-tools.json'; a.click();
                }}>
                  📥 Export Tools (JSON)
                </Button>
                <Button variant="secondary" size="sm" onClick={async () => {
                  const events = await sendMessage<any[]>('GET_EVENTS');
                  const blob = new Blob([JSON.stringify(events, null, 2)], { type: 'application/json' });
                  const url = URL.createObjectURL(blob);
                  const a = document.createElement('a');
                  a.href = url; a.download = 'oximy-events.json'; a.click();
                }}>
                  📥 Export Events (JSON)
                </Button>
              </div>
            </Card>
            <Card className="p-5 border-red-900/30">
              <SectionHeader title="Danger Zone" />
              <p className="text-sm text-slate-500 mb-4">Clear all Oximy Shield data from this device. This action is irreversible.</p>
              <Button variant="danger" size="sm" onClick={clearData} disabled={clearing}>
                {clearing ? <Spinner size={12} /> : null}
                🗑 Clear All Data
              </Button>
            </Card>
          </div>
        )}
      </div>
    </div>
  );
}
