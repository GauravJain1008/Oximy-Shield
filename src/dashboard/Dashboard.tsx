import React, { useEffect, useState, useCallback } from 'react';
import {
  LineChart, Line, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, PieChart, Pie, Cell, Legend
} from 'recharts';
import {
  AITool, OximyEvent, Recommendation, UsageStat, DashboardSummary
} from '../types';
import { RISK_CONFIG, CATEGORY_CONFIG, formatDate, formatTime, formatNumber, sendMessage } from '../utils';
import {
  RiskBadge, CategoryBadge, KpiCard, Card, Button, ApprovalBadge,
  EmptyState, SectionHeader, StatusDot, Spinner, Toggle
} from '../components/ui';
import { overallRiskScore } from '../services/recommendations';
import { CATEGORY_COLORS } from '../services/toolRegistry';

type Tab = 'overview' | 'tools' | 'events' | 'recommendations';

export default function Dashboard() {
  const [summary, setSummary] = useState<DashboardSummary | null>(null);
  const [tools, setTools] = useState<AITool[]>([]);
  const [events, setEvents] = useState<OximyEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<Tab>('overview');
  const [refreshing, setRefreshing] = useState(false);

  const load = useCallback(async () => {
    try {
      const [sum, toolList, eventList] = await Promise.all([
        sendMessage<DashboardSummary>('GET_SUMMARY'),
        sendMessage<AITool[]>('GET_TOOLS'),
        sendMessage<OximyEvent[]>('GET_EVENTS'),
      ]);
      setSummary(sum);
      setTools(toolList);
      setEvents(eventList);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  const refresh = async () => {
    setRefreshing(true);
    await load();
    setRefreshing(false);
  };

  const approveTool = async (id: string) => {
    await sendMessage('APPROVE_TOOL', id);
    setTools(ts => ts.map(t => t.id === id ? { ...t, approved: true } : t));
  };

  const blockTool = async (id: string) => {
    await sendMessage('BLOCK_TOOL', id);
    setTools(ts => ts.map(t => t.id === id ? { ...t, approved: false } : t));
  };

  const dismissRec = async (id: string) => {
    await sendMessage('DISMISS_RECOMMENDATION', id);
    setSummary(s => s ? { ...s, recommendations: s.recommendations.filter(r => r.id !== id) } : s);
  };

  const riskScore = summary ? overallRiskScore(tools, events) : 0;

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-950 flex items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-cyan-400 to-blue-600 flex items-center justify-center text-xl font-bold text-slate-900">OS</div>
          <Spinner size={24} />
          <p className="text-slate-500 text-sm">Loading dashboard...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100" style={{ fontFamily: "'DM Sans', system-ui, sans-serif" }}>
      {/* Sidebar */}
      <div className="fixed left-0 top-0 bottom-0 w-56 bg-slate-900/80 border-r border-slate-800 backdrop-blur-sm z-10 flex flex-col">
        {/* Logo */}
        <div className="px-5 py-5 border-b border-slate-800">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-cyan-400 to-blue-600 flex items-center justify-center text-xs font-bold text-slate-900">OS</div>
            <div>
              <div className="text-sm font-bold text-white">Oximy Shield</div>
              <div className="text-[10px] text-slate-500">AI Governance</div>
            </div>
          </div>
        </div>

        {/* Nav */}
        <nav className="flex-1 px-3 py-4 space-y-1">
          {([
            { id: 'overview', label: 'Overview', icon: '◈' },
            { id: 'tools', label: 'AI Tools', icon: '🤖' },
            { id: 'events', label: 'Events', icon: '📋' },
            { id: 'recommendations', label: 'Insights', icon: '💡' },
          ] as { id: Tab; label: string; icon: string }[]).map(item => (
            <button
              key={item.id}
              onClick={() => setActiveTab(item.id)}
              className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all ${
                activeTab === item.id
                  ? 'bg-cyan-500/10 text-cyan-400 border border-cyan-500/20'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/50'
              }`}
            >
              <span className="text-base">{item.icon}</span>
              {item.label}
              {item.id === 'recommendations' && summary?.recommendations.length ? (
                <span className="ml-auto bg-cyan-500 text-slate-900 text-[10px] font-bold px-1.5 py-0.5 rounded-full">
                  {summary.recommendations.length}
                </span>
              ) : null}
            </button>
          ))}
        </nav>

        {/* Risk Score Gauge */}
        <div className="px-4 py-4 border-t border-slate-800">
          <div className="text-[10px] text-slate-500 uppercase tracking-wider mb-2 font-medium">Org Risk Score</div>
          <RiskGauge score={riskScore} />
        </div>

        {/* Options link */}
        <div className="px-4 py-3 border-t border-slate-800">
          <button
            onClick={() => chrome.runtime.openOptionsPage()}
            className="w-full flex items-center gap-2 px-3 py-2 rounded-lg text-xs text-slate-500 hover:text-slate-300 hover:bg-slate-800/50 transition-all"
          >
            ⚙️ Settings & Policy
          </button>
        </div>
      </div>

      {/* Main Content */}
      <div className="ml-56 p-6 min-h-screen">
        {/* Top Bar */}
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-xl font-bold text-white">
              {activeTab === 'overview' && 'Security Overview'}
              {activeTab === 'tools' && 'AI Tool Inventory'}
              {activeTab === 'events' && 'Event Log'}
              {activeTab === 'recommendations' && 'Recommendations & Insights'}
            </h1>
            <p className="text-sm text-slate-500 mt-0.5">
              Last updated {formatDate(Date.now())}
            </p>
          </div>
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-slate-800 border border-slate-700">
              <StatusDot active={summary?.scanning ?? true} pulse={summary?.scanning ?? true} />
              <span className="text-xs text-slate-400">
                {summary?.scanning !== false ? 'Live Monitoring' : 'Monitoring Paused'}
              </span>
            </div>
            <Button onClick={refresh} variant="secondary" size="sm" disabled={refreshing}>
              {refreshing ? <Spinner size={12} /> : '↻'} Refresh
            </Button>
          </div>
        </div>

        {activeTab === 'overview' && <OverviewTab summary={summary} tools={tools} events={events} riskScore={riskScore} scanning={summary?.scanning ?? true} />}
        {activeTab === 'tools' && <ToolsTab tools={tools} onApprove={approveTool} onBlock={blockTool} />}
        {activeTab === 'events' && <EventsTab events={events} />}
        {activeTab === 'recommendations' && <RecommendationsTab recs={summary?.recommendations ?? []} onDismiss={dismissRec} />}
      </div>
    </div>
  );
}

// ─── Overview Tab ─────────────────────────────────────────────────────────────

function OverviewTab({ summary, tools, events, riskScore, scanning }: {
  summary: DashboardSummary | null;
  tools: AITool[];
  events: OximyEvent[];
  riskScore: number;
  scanning: boolean;
}) {
  const categoryData = Object.entries(
    tools.reduce((acc, t) => {
      acc[t.category] = (acc[t.category] || 0) + 1;
      return acc;
    }, {} as Record<string, number>)
  ).map(([cat, count]) => ({
    name: CATEGORY_CONFIG[cat as keyof typeof CATEGORY_CONFIG]?.label || cat,
    value: count,
    color: CATEGORY_COLORS[cat as keyof typeof CATEGORY_COLORS] || '#6b7280',
  }));

  const trendData = (summary?.usageTrend || []).map(d => ({
    date: d.date.slice(5), // MM-DD
    visits: d.visits,
    risks: d.riskEvents,
  }));

  return (
    <div className="space-y-6">
      {/* KPI Row */}
      <div className="grid grid-cols-4 gap-4">
        <KpiCard label="AI Tools Detected" value={summary?.totalTools ?? 0} sub="tools in inventory" icon="🤖" color="#06b6d4" />
        <KpiCard
          label="New This Week"
          value={summary?.newToolsThisWeek ?? 0}
          sub={summary?.newToolsLastWeek != null ? `${summary.newToolsLastWeek} last week` : 'no prior data'}
          icon="🆕"
          trend={
            summary && summary.newToolsLastWeek > 0
              ? Math.round(((summary.newToolsThisWeek - summary.newToolsLastWeek) / summary.newToolsLastWeek) * 100)
              : undefined
          }
          color="#8b5cf6"
        />
        <KpiCard label="Risk Events" value={summary?.riskEvents ?? 0} sub="total flagged" icon="⚠️" color="#ef4444" />
        <KpiCard label="Policy Violations" value={summary?.policyViolations ?? 0} sub="this period" icon="🚫" color="#f97316" />
      </div>

      {/* Charts Row */}
      <div className="grid grid-cols-3 gap-4">
        {/* Usage Trend */}
        <Card className="col-span-2 p-4">
          <SectionHeader title="AI Usage Trend" sub="Daily visits & risk events (14 days)" />
          {trendData.length === 0 ? (
            <EmptyState
              icon="📈"
              title="No usage data yet"
              sub="Visit an AI tool to start building your trend history"
            />
          ) : (
            <ResponsiveContainer width="100%" height={200}>
              <LineChart data={trendData} margin={{ top: 5, right: 5, bottom: 5, left: -20 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
                <XAxis dataKey="date" tick={{ fill: '#475569', fontSize: 10 }} tickLine={false} axisLine={false} />
                <YAxis tick={{ fill: '#475569', fontSize: 10 }} tickLine={false} axisLine={false} />
                <Tooltip contentStyle={{ background: '#0f172a', border: '1px solid #1e293b', borderRadius: '8px', color: '#e2e8f0' }} />
                <Line type="monotone" dataKey="visits" stroke="#06b6d4" strokeWidth={2} dot={false} name="Visits" />
                <Line type="monotone" dataKey="risks" stroke="#ef4444" strokeWidth={2} dot={false} name="Risk Events" strokeDasharray="4 4" />
              </LineChart>
            </ResponsiveContainer>
          )}
        </Card>

        {/* Category Breakdown */}
        <Card className="p-4">
          <SectionHeader title="By Category" />
          {categoryData.length === 0 ? (
            <EmptyState
              icon="🤖"
              title="No tools yet"
              sub="Detected tools will appear here"
            />
          ) : (
            <>
              <ResponsiveContainer width="100%" height={200}>
                <PieChart>
                  <Pie data={categoryData} cx="50%" cy="50%" innerRadius={50} outerRadius={75} paddingAngle={3} dataKey="value">
                    {categoryData.map((entry, i) => (
                      <Cell key={i} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip contentStyle={{ background: '#0f172a', border: '1px solid #1e293b', borderRadius: '8px', color: '#e2e8f0' }} />
                </PieChart>
              </ResponsiveContainer>
              <div className="space-y-1.5 mt-2">
                {categoryData.map(d => (
                  <div key={d.name} className="flex items-center gap-2 text-xs">
                    <div className="w-2 h-2 rounded-full flex-shrink-0" style={{ background: d.color }} />
                    <span className="text-slate-400 flex-1">{d.name}</span>
                    <span className="text-slate-300 font-medium">{d.value}</span>
                  </div>
                ))}
              </div>
            </>
          )}
        </Card>
      </div>

      {/* Bottom Row */}
      <div className="grid grid-cols-2 gap-4">
        {/* Top Tools */}
        <Card className="p-4">
          <SectionHeader title="Top AI Tools" sub="By visit count" />
          {(summary?.topTools || []).length === 0 ? (
            <EmptyState
              icon="🤖"
              title="No tools detected yet"
              sub="Browse to ChatGPT, Claude, or any AI tool to begin"
            />
          ) : (
            <div className="space-y-2">
              {(summary?.topTools || []).slice(0, 5).map((tool, i) => (
                <div key={tool.toolId} className="flex items-center gap-3">
                  <span className="text-slate-600 text-xs w-4 text-right">{i + 1}</span>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="text-sm text-white font-medium truncate">{tool.toolName}</span>
                      <RiskBadge level={tool.riskScore > 60 ? 'high' : tool.riskScore > 30 ? 'medium' : 'low'} size="xs" />
                    </div>
                    <div className="h-1.5 bg-slate-800 rounded-full overflow-hidden">
                      <div
                        className="h-full rounded-full"
                        style={{
                          width: `${Math.min((tool.visits / ((summary?.topTools[0]?.visits || 1))) * 100, 100)}%`,
                          background: CATEGORY_COLORS[tool.category] || '#06b6d4',
                        }}
                      />
                    </div>
                  </div>
                  <span className="text-xs text-slate-500 flex-shrink-0">{tool.visits}v</span>
                </div>
              ))}
            </div>
          )}
        </Card>

        {/* Recent Alerts */}
        <Card className="p-4">
          <SectionHeader title="Recent Alerts" sub="Risk & policy events" />
          <div className="space-y-2">
            {events.filter(e => e.riskLevel !== 'none').slice(0, 5).map((evt) => (
              <div key={evt.id} className="flex items-start gap-2.5 p-2 rounded-lg bg-slate-800/40">
                <div className="w-1.5 h-1.5 rounded-full mt-1.5 flex-shrink-0" style={{ background: RISK_CONFIG[evt.riskLevel].color }} />
                <div className="flex-1 min-w-0">
                  <div className="text-xs text-white font-medium">{evt.toolName || evt.domain}</div>
                  <div className="text-[10px] text-slate-500 capitalize">{evt.type.replace(/_/g, ' ')}</div>
                </div>
                <div className="text-right flex-shrink-0">
                  <RiskBadge level={evt.riskLevel} size="xs" />
                  <div className="text-[9px] text-slate-600 mt-1">{formatDate(evt.timestamp)}</div>
                </div>
              </div>
            ))}
            {events.filter(e => e.riskLevel !== 'none').length === 0 && (
              <EmptyState icon="✅" title="No risk events" sub="All clear!" />
            )}
          </div>
        </Card>
      </div>
    </div>
  );
}

// ─── Tools Tab ────────────────────────────────────────────────────────────────

function ToolsTab({ tools, onApprove, onBlock }: {
  tools: AITool[];
  onApprove: (id: string) => void;
  onBlock: (id: string) => void;
}) {
  const [filter, setFilter] = useState<'all' | 'approved' | 'blocked' | 'unreviewed'>('all');
  const [search, setSearch] = useState('');

  const filtered = tools.filter(t => {
    if (filter === 'approved' && t.approved !== true) return false;
    if (filter === 'blocked' && t.approved !== false) return false;
    if (filter === 'unreviewed' && t.approved !== null) return false;
    if (search && !t.name.toLowerCase().includes(search.toLowerCase())) return false;
    return true;
  });

  return (
    <div>
      {/* Filters */}
      <div className="flex items-center gap-3 mb-4">
        <input
          type="text"
          placeholder="Search tools..."
          value={search}
          onChange={e => setSearch(e.target.value)}
          className="flex-1 bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-sm text-slate-200 placeholder-slate-600 focus:outline-none focus:border-cyan-500/50"
        />
        {(['all', 'approved', 'blocked', 'unreviewed'] as const).map(f => (
          <button
            key={f}
            onClick={() => setFilter(f)}
            className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all capitalize ${
              filter === f
                ? 'bg-cyan-500/10 text-cyan-400 border border-cyan-500/20'
                : 'text-slate-400 hover:text-slate-200 bg-slate-800/50 border border-slate-700/50'
            }`}
          >
            {f}
          </button>
        ))}
      </div>

      {/* Table */}
      <Card>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-slate-800">
                {['Tool', 'Category', 'Risk', 'Status', 'Visits', 'Time Spent', 'Last Seen', 'Actions'].map(h => (
                  <th key={h} className="text-left px-4 py-3 text-[10px] text-slate-500 uppercase tracking-wider font-semibold">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {filtered.map((tool) => (
                <tr key={tool.id} className="border-b border-slate-800/50 hover:bg-slate-800/30 transition-colors">
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2.5">
                      <div className="w-8 h-8 rounded-lg bg-slate-800 border border-slate-700 flex items-center justify-center text-base flex-shrink-0">
                        {CATEGORY_CONFIG[tool.category].icon}
                      </div>
                      <div>
                        <div className="text-sm font-medium text-white flex items-center gap-1.5">
                          {tool.name}
                          {tool.isNew && <span className="text-[9px] bg-cyan-500/20 text-cyan-400 px-1.5 py-0.5 rounded-full border border-cyan-500/30 font-semibold">NEW</span>}
                        </div>
                        <div className="text-[10px] text-slate-500">{tool.domain}</div>
                      </div>
                    </div>
                  </td>
                  <td className="px-4 py-3"><CategoryBadge category={tool.category} /></td>
                  <td className="px-4 py-3"><RiskBadge level={tool.riskLevel} size="xs" /></td>
                  <td className="px-4 py-3"><ApprovalBadge approved={tool.approved} /></td>
                  <td className="px-4 py-3 text-sm text-slate-300 font-medium">{tool.visitCount}</td>
                  <td className="px-4 py-3 text-sm text-slate-300">{formatTime(tool.totalTimeMs)}</td>
                  <td className="px-4 py-3 text-xs text-slate-500">{formatDate(tool.lastSeen)}</td>
                  <td className="px-4 py-3">
                    <div className="flex gap-1.5">
                      {tool.approved !== true && (
                        <Button onClick={() => onApprove(tool.id)} variant="success" size="xs">✓ Approve</Button>
                      )}
                      {tool.approved !== false && (
                        <Button onClick={() => onBlock(tool.id)} variant="danger" size="xs">✗ Block</Button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
              {filtered.length === 0 && (
                <tr><td colSpan={8}><EmptyState icon="🔍" title="No tools found" /></td></tr>
              )}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );
}

// ─── Events Tab ───────────────────────────────────────────────────────────────

function EventsTab({ events }: { events: OximyEvent[] }) {
  const [filter, setFilter] = useState<string>('all');

  const eventTypes = ['all', ...new Set(events.map(e => e.type))];
  const filtered = filter === 'all' ? events : events.filter(e => e.type === filter);

  const EVENT_ICONS: Record<string, string> = {
    tool_detected: '🔍',
    new_tool_discovered: '🆕',
    risky_paste_detected: '⚠️',
    policy_violation: '🚫',
    session_started: '▶️',
    session_ended: '⏹️',
    recommendation_generated: '💡',
  };

  return (
    <div>
      {/* Type filter */}
      <div className="flex items-center gap-2 mb-4 flex-wrap">
        {eventTypes.slice(0, 6).map(t => (
          <button
            key={t}
            onClick={() => setFilter(t)}
            className={`px-3 py-1 rounded-lg text-xs font-medium capitalize transition-all ${
              filter === t
                ? 'bg-cyan-500/10 text-cyan-400 border border-cyan-500/20'
                : 'text-slate-400 bg-slate-800/50 border border-slate-700/50 hover:text-slate-200'
            }`}
          >
            {t.replace(/_/g, ' ')}
          </button>
        ))}
      </div>

      <Card>
        <div className="divide-y divide-slate-800/50">
          {filtered.map((evt) => (
            <div key={evt.id} className="flex items-start gap-4 px-4 py-3 hover:bg-slate-800/20 transition-colors">
              <div
                className="w-8 h-8 rounded-lg flex items-center justify-center text-base flex-shrink-0 mt-0.5"
                style={{ background: `${RISK_CONFIG[evt.riskLevel].color}15` }}
              >
                {EVENT_ICONS[evt.type] || '📋'}
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-0.5">
                  <span className="text-sm font-medium text-white">{evt.toolName || evt.domain}</span>
                  <RiskBadge level={evt.riskLevel} size="xs" />
                  {evt.type === 'new_tool_discovered' && (
                    <span className="text-[9px] bg-cyan-500/20 text-cyan-400 px-1.5 py-0.5 rounded-full border border-cyan-500/30">NEW</span>
                  )}
                </div>
                <div className="text-xs text-slate-500 capitalize">{evt.type.replace(/_/g, ' ')}</div>
                {evt.redactedContent && evt.redactedContent.length > 0 && (
                  <div className="mt-1.5 px-2 py-1 bg-slate-900 rounded border border-slate-700 text-[10px] text-slate-400 font-mono truncate">
                    {evt.redactedContent[0]}
                  </div>
                )}
                {evt.details?.patterns && (
                  <div className="mt-1 flex gap-1 flex-wrap">
                    {(evt.details.patterns as string[]).map(p => (
                      <span key={p} className="text-[9px] bg-red-500/10 text-red-400 border border-red-500/20 px-1.5 py-0.5 rounded font-mono">{p}</span>
                    ))}
                  </div>
                )}
              </div>
              <div className="text-right flex-shrink-0">
                <div className="text-[10px] text-slate-500">{formatDate(evt.timestamp)}</div>
                <div className="text-[9px] text-slate-700 mt-1 font-mono">{evt.domain}</div>
              </div>
            </div>
          ))}
          {filtered.length === 0 && (
            <EmptyState icon="📋" title="No events" sub="Events will appear here as AI tools are used" />
          )}
        </div>
      </Card>
    </div>
  );
}

// ─── Recommendations Tab ──────────────────────────────────────────────────────

function RecommendationsTab({ recs, onDismiss }: { recs: Recommendation[]; onDismiss: (id: string) => void }) {
  const PRIORITY_CONFIG = {
    critical: { color: '#ef4444', bg: 'rgba(239,68,68,0.07)', border: 'rgba(239,68,68,0.2)', icon: '🚨' },
    high: { color: '#f97316', bg: 'rgba(249,115,22,0.07)', border: 'rgba(249,115,22,0.2)', icon: '⚠️' },
    medium: { color: '#f59e0b', bg: 'rgba(245,158,11,0.07)', border: 'rgba(245,158,11,0.2)', icon: '💡' },
    low: { color: '#84cc16', bg: 'rgba(132,204,22,0.07)', border: 'rgba(132,204,22,0.2)', icon: 'ℹ️' },
  };

  const active = recs.filter(r => !r.dismissed);

  if (active.length === 0) {
    return <EmptyState icon="✅" title="All caught up!" sub="No recommendations at this time. Keep monitoring." />;
  }

  return (
    <div className="grid grid-cols-2 gap-4">
      {active.map((rec) => {
        const p = PRIORITY_CONFIG[rec.priority];
        return (
          <div
            key={rec.id}
            className="rounded-xl p-4 border relative overflow-hidden"
            style={{ background: p.bg, borderColor: p.border }}
          >
            <div className="flex items-start gap-3">
              <span className="text-2xl">{p.icon}</span>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1">
                  <span className="text-xs font-bold uppercase tracking-wider" style={{ color: p.color }}>
                    {rec.priority} priority
                  </span>
                </div>
                <h3 className="text-sm font-semibold text-white mb-1.5">{rec.title}</h3>
                <p className="text-xs text-slate-400 leading-relaxed mb-3">{rec.description}</p>
                <div className="flex items-center gap-2">
                  <Button variant="primary" size="xs">{rec.actionLabel}</Button>
                  <Button variant="ghost" size="xs" onClick={() => onDismiss(rec.id)}>Dismiss</Button>
                </div>
              </div>
            </div>
            <div className="text-[9px] text-slate-700 mt-3">{formatDate(rec.createdAt)}</div>
          </div>
        );
      })}
    </div>
  );
}

// ─── Risk Gauge ───────────────────────────────────────────────────────────────

function RiskGauge({ score }: { score: number }) {
  const color = score >= 75 ? '#ef4444' : score >= 50 ? '#f97316' : score >= 25 ? '#f59e0b' : '#10b981';
  const label = score >= 75 ? 'High' : score >= 50 ? 'Medium' : score >= 25 ? 'Low' : 'Safe';
  return (
    <div className="space-y-2">
      <div className="flex items-end justify-between">
        <span className="text-2xl font-bold text-white">{score}</span>
        <span className="text-xs font-semibold" style={{ color }}>{label}</span>
      </div>
      <div className="h-1.5 bg-slate-800 rounded-full overflow-hidden">
        <div
          className="h-full rounded-full transition-all duration-1000"
          style={{ width: `${score}%`, background: color, boxShadow: `0 0 8px ${color}80` }}
        />
      </div>
      <div className="text-[9px] text-slate-600">Risk Score / 100</div>
    </div>
  );
}
