import React, { useEffect, useState, useCallback } from 'react';
import { AITool, OximyEvent, RiskLevel } from '../types';
import { RiskBadge, CategoryBadge, StatusDot, Button, Spinner, ApprovalBadge } from '../components/ui';
import { formatDate, formatTime, sendMessage, RISK_CONFIG, CATEGORY_CONFIG } from '../utils';

interface PopupState {
  scanning: boolean;
  currentTool: AITool | null;
  recentEvents: OximyEvent[];
  activeSessions: number;
}

export default function Popup() {
  const [state, setState] = useState<PopupState | null>(null);
  const [loading, setLoading] = useState(true);
  const [toggling, setToggling] = useState(false);

  const load = useCallback(async () => {
    try {
      const data = await sendMessage<PopupState>('GET_STATE');
      setState(data);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  const toggleScanning = async () => {
    if (!state) return;
    setToggling(true);
    try {
      await sendMessage('SET_SCANNING', { enabled: !state.scanning });
      setState(s => s ? { ...s, scanning: !s.scanning } : s);
    } finally {
      setToggling(false);
    }
  };

  const openDashboard = () => sendMessage('OPEN_DASHBOARD');

  if (loading) {
    return (
      <div className="w-80 h-40 bg-slate-950 flex items-center justify-center">
        <Spinner size={24} />
      </div>
    );
  }

  const riskLevel = state?.currentTool?.riskLevel ?? 'none';
  const riskCfg = RISK_CONFIG[riskLevel];
  const riskyEvents = state?.recentEvents.filter(e => e.riskLevel !== 'none') ?? [];

  return (
    <div className="w-80 bg-slate-950 text-slate-100 flex flex-col min-h-0" style={{ fontFamily: "'DM Sans', system-ui, sans-serif" }}>
      {/* Header */}
      <div className="px-4 py-3 border-b border-slate-800 flex items-center justify-between">
        <div className="flex items-center gap-2.5">
          <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-cyan-400 to-blue-600 flex items-center justify-center text-xs font-bold text-slate-900">
            OS
          </div>
          <div>
            <div className="text-sm font-semibold text-white leading-none">Oximy Shield</div>
            <div className="text-[10px] text-slate-500 mt-0.5">AI Governance</div>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <StatusDot active={state?.scanning ?? false} pulse={state?.scanning} />
          <span className="text-[11px] text-slate-400">{state?.scanning ? 'Active' : 'Paused'}</span>
        </div>
      </div>

      {/* Current Tool Detection */}
      <div className="px-4 py-3 border-b border-slate-800">
        {state?.currentTool ? (
          <div>
            <div className="text-[10px] text-slate-500 uppercase tracking-wider font-medium mb-2">Currently Detected</div>
            <div className="flex items-start gap-3">
              <div className="w-9 h-9 rounded-lg bg-slate-800 border border-slate-700 flex items-center justify-center text-lg flex-shrink-0">
                {CATEGORY_CONFIG[state.currentTool.category].icon}
              </div>
              <div className="flex-1 min-w-0">
                <div className="font-semibold text-sm text-white leading-tight">{state.currentTool.name}</div>
                <div className="text-[11px] text-slate-500 mt-0.5">{state.currentTool.domain}</div>
                <div className="flex items-center gap-1.5 mt-2">
                  <RiskBadge level={state.currentTool.riskLevel} size="xs" />
                  <CategoryBadge category={state.currentTool.category} />
                </div>
              </div>
              <ApprovalBadge approved={state.currentTool.approved} />
            </div>
            {/* Risk indicator bar */}
            <div className="mt-3 h-1 bg-slate-800 rounded-full overflow-hidden">
              <div
                className="h-full rounded-full transition-all duration-700"
                style={{
                  width: `${riskLevel === 'none' ? 5 : riskLevel === 'low' ? 25 : riskLevel === 'medium' ? 50 : riskLevel === 'high' ? 75 : 100}%`,
                  background: riskCfg.color,
                  boxShadow: `0 0 8px ${riskCfg.color}80`,
                }}
              />
            </div>
          </div>
        ) : (
          <div className="flex items-center gap-3 py-1">
            <div className="w-9 h-9 rounded-lg bg-slate-800/60 border border-slate-700/50 flex items-center justify-center text-lg opacity-40">🤖</div>
            <div>
              <div className="text-sm text-slate-400">No AI tool detected</div>
              <div className="text-[11px] text-slate-600">Browse to an AI tool to begin</div>
            </div>
          </div>
        )}
      </div>

      {/* Quick Stats */}
      <div className="px-4 py-2.5 border-b border-slate-800 grid grid-cols-3 gap-0">
        {[
          { label: 'Sessions', value: state?.activeSessions ?? 0, icon: '⚡' },
          { label: 'Alerts', value: riskyEvents.length, icon: '⚠️' },
          { label: 'Events', value: state?.recentEvents.length ?? 0, icon: '📋' },
        ].map((stat) => (
          <div key={stat.label} className="flex flex-col items-center py-1.5 first:border-r first:border-slate-800 last:border-l last:border-slate-800">
            <div className="text-base font-bold text-white">{stat.value}</div>
            <div className="text-[10px] text-slate-500">{stat.label}</div>
          </div>
        ))}
      </div>

      {/* Recent Alerts */}
      <div className="px-4 py-3 flex-1">
        <div className="text-[10px] text-slate-500 uppercase tracking-wider font-medium mb-2">Recent Activity</div>
        {state?.recentEvents && state.recentEvents.length > 0 ? (
          <div className="space-y-1.5">
            {state.recentEvents.slice(0, 4).map((evt) => (
              <EventRow key={evt.id} event={evt} />
            ))}
          </div>
        ) : (
          <div className="text-center py-4 text-slate-600 text-xs">No recent activity</div>
        )}
      </div>

      {/* Actions */}
      <div className="px-4 py-3 border-t border-slate-800 flex gap-2">
        <Button
          onClick={toggleScanning}
          variant={state?.scanning ? 'secondary' : 'success'}
          size="sm"
          disabled={toggling}
          className="flex-1"
        >
          {toggling ? <Spinner size={12} /> : null}
          {state?.scanning ? '⏸ Pause' : '▶ Resume'}
        </Button>
        <Button onClick={openDashboard} variant="primary" size="sm" className="flex-1">
          Dashboard →
        </Button>
      </div>

      {/* Branding */}
      <div className="px-4 pb-2 flex items-center justify-center">
        <span className="text-[9px] text-slate-700 tracking-widest uppercase">Oximy Shield v1.0 — Enterprise AI Governance</span>
      </div>
    </div>
  );
}

function EventRow({ event }: { event: OximyEvent }) {
  const icons: Record<string, string> = {
    tool_detected: '🔍',
    new_tool_discovered: '🆕',
    risky_paste_detected: '⚠️',
    policy_violation: '🚫',
    session_started: '▶️',
    session_ended: '⏹️',
    recommendation_generated: '💡',
    clipboard_scan: '📋',
  };
  const riskCfg = RISK_CONFIG[event.riskLevel];
  return (
    <div className="flex items-center gap-2 py-1 px-2 rounded-lg hover:bg-slate-800/40 transition-colors group">
      <span className="text-sm">{icons[event.type] || '●'}</span>
      <div className="flex-1 min-w-0">
        <div className="text-xs text-slate-300 truncate font-medium">
          {event.toolName || event.domain}
        </div>
        <div className="text-[10px] text-slate-600 capitalize">{event.type.replace(/_/g, ' ')}</div>
      </div>
      <div className="text-right flex-shrink-0">
        {event.riskLevel !== 'none' && (
          <div className="w-1.5 h-1.5 rounded-full mb-0.5 ml-auto" style={{ background: riskCfg.color }} />
        )}
        <div className="text-[9px] text-slate-600">{formatDate(event.timestamp)}</div>
      </div>
    </div>
  );
}
