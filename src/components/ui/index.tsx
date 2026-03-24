import React from 'react';
import { cx, RISK_CONFIG, CATEGORY_CONFIG } from '../../utils';
import { AIToolCategory, RiskLevel } from '../../types';

// ─── RiskBadge ────────────────────────────────────────────────────────────────

export function RiskBadge({ level, size = 'sm' }: { level: RiskLevel; size?: 'xs' | 'sm' | 'md' }) {
  const c = RISK_CONFIG[level];
  const sizes = { xs: 'px-1.5 py-0.5 text-[10px]', sm: 'px-2 py-0.5 text-xs', md: 'px-3 py-1 text-sm' };
  return (
    <span
      className={cx('inline-flex items-center rounded-full font-semibold tracking-wide', sizes[size])}
      style={{ color: c.color, background: c.bg, border: `1px solid ${c.border}` }}
    >
      {level === 'critical' && <span className="mr-1">●</span>}
      {c.label}
    </span>
  );
}

// ─── CategoryBadge ────────────────────────────────────────────────────────────

export function CategoryBadge({ category }: { category: AIToolCategory }) {
  const c = CATEGORY_CONFIG[category];
  return (
    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium"
      style={{ color: c.color, background: `${c.color}18`, border: `1px solid ${c.color}30` }}>
      <span>{c.icon}</span>
      {c.label}
    </span>
  );
}

// ─── Card ─────────────────────────────────────────────────────────────────────

export function Card({ children, className }: { children: React.ReactNode; className?: string }) {
  return (
    <div className={cx('bg-slate-900 border border-slate-700/50 rounded-xl overflow-hidden', className)}>
      {children}
    </div>
  );
}

// ─── KPI Card ─────────────────────────────────────────────────────────────────

export function KpiCard({
  label, value, sub, icon, trend, color = '#06b6d4',
}: {
  label: string;
  value: string | number;
  sub?: string;
  icon: string;
  trend?: number;
  color?: string;
}) {
  return (
    <div className="bg-slate-900 border border-slate-700/50 rounded-xl p-4 flex flex-col gap-2 relative overflow-hidden">
      <div className="absolute inset-0 opacity-5" style={{ background: `radial-gradient(ellipse at top right, ${color}, transparent 70%)` }} />
      <div className="flex items-center justify-between">
        <span className="text-xs font-semibold text-slate-400 tracking-wider uppercase">{label}</span>
        <span className="text-lg">{icon}</span>
      </div>
      <div className="text-3xl font-bold text-white tracking-tight">{value}</div>
      {(sub || trend !== undefined) && (
        <div className="flex items-center gap-2 text-xs">
          {trend !== undefined && (
            <span className={trend >= 0 ? 'text-emerald-400' : 'text-red-400'}>
              {trend >= 0 ? '↑' : '↓'} {Math.abs(trend)}%
            </span>
          )}
          {sub && <span className="text-slate-500">{sub}</span>}
        </div>
      )}
    </div>
  );
}

// ─── Status Dot ───────────────────────────────────────────────────────────────

export function StatusDot({ active, pulse }: { active: boolean; pulse?: boolean }) {
  return (
    <span className="relative flex h-2.5 w-2.5">
      {active && pulse && (
        <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
      )}
      <span className={cx('relative inline-flex rounded-full h-2.5 w-2.5', active ? 'bg-emerald-500' : 'bg-slate-600')} />
    </span>
  );
}

// ─── Approval Badge ───────────────────────────────────────────────────────────

export function ApprovalBadge({ approved }: { approved: boolean | null }) {
  if (approved === true) return (
    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium text-emerald-400 bg-emerald-400/10 border border-emerald-400/30">
      ✓ Approved
    </span>
  );
  if (approved === false) return (
    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium text-red-400 bg-red-400/10 border border-red-400/30">
      ✗ Blocked
    </span>
  );
  return (
    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium text-amber-400 bg-amber-400/10 border border-amber-400/30">
      ? Unreviewed
    </span>
  );
}

// ─── Button ───────────────────────────────────────────────────────────────────

export function Button({
  children, onClick, variant = 'primary', size = 'sm', disabled, className,
}: {
  children: React.ReactNode;
  onClick?: () => void;
  variant?: 'primary' | 'secondary' | 'danger' | 'ghost' | 'success';
  size?: 'xs' | 'sm' | 'md';
  disabled?: boolean;
  className?: string;
}) {
  const variants = {
    primary: 'bg-cyan-500 hover:bg-cyan-400 text-slate-900 font-semibold',
    secondary: 'bg-slate-700 hover:bg-slate-600 text-slate-200',
    danger: 'bg-red-500/20 hover:bg-red-500/30 text-red-400 border border-red-500/30',
    success: 'bg-emerald-500/20 hover:bg-emerald-500/30 text-emerald-400 border border-emerald-500/30',
    ghost: 'hover:bg-slate-700/50 text-slate-400 hover:text-slate-200',
  };
  const sizes = {
    xs: 'px-2.5 py-1 text-xs rounded-lg',
    sm: 'px-3.5 py-1.5 text-xs rounded-lg',
    md: 'px-5 py-2.5 text-sm rounded-xl',
  };
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className={cx(
        'inline-flex items-center justify-center gap-1.5 transition-all duration-150 font-medium',
        'disabled:opacity-40 disabled:cursor-not-allowed',
        variants[variant], sizes[size], className
      )}
    >
      {children}
    </button>
  );
}

// ─── Spinner ──────────────────────────────────────────────────────────────────

export function Spinner({ size = 16 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" className="animate-spin">
      <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="3" strokeDasharray="31.4" strokeDashoffset="10" strokeLinecap="round" />
    </svg>
  );
}

// ─── Empty State ──────────────────────────────────────────────────────────────

export function EmptyState({ icon, title, sub }: { icon: string; title: string; sub?: string }) {
  return (
    <div className="flex flex-col items-center justify-center py-12 gap-3 text-center">
      <span className="text-4xl opacity-40">{icon}</span>
      <div className="text-slate-400 font-medium">{title}</div>
      {sub && <div className="text-slate-600 text-sm">{sub}</div>}
    </div>
  );
}

// ─── Toggle ───────────────────────────────────────────────────────────────────

export function Toggle({ checked, onChange }: { checked: boolean; onChange: (v: boolean) => void }) {
  return (
    <button
      role="switch"
      aria-checked={checked}
      onClick={() => onChange(!checked)}
      className={cx(
        'relative inline-flex h-5 w-9 items-center rounded-full transition-colors duration-200',
        checked ? 'bg-cyan-500' : 'bg-slate-600'
      )}
    >
      <span className={cx(
        'inline-block h-3.5 w-3.5 transform rounded-full bg-white shadow-md transition-transform duration-200',
        checked ? 'translate-x-4.5' : 'translate-x-1'
      )} />
    </button>
  );
}

// ─── Section Header ───────────────────────────────────────────────────────────

export function SectionHeader({ title, sub, action }: { title: string; sub?: string; action?: React.ReactNode }) {
  return (
    <div className="flex items-center justify-between mb-4">
      <div>
        <h2 className="text-sm font-semibold text-white tracking-wide">{title}</h2>
        {sub && <p className="text-xs text-slate-500 mt-0.5">{sub}</p>}
      </div>
      {action}
    </div>
  );
}
