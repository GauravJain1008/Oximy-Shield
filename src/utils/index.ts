import { AIToolCategory, RiskLevel } from '../types';

export function cx(...classes: (string | false | undefined | null)[]): string {
  return classes.filter(Boolean).join(' ');
}

export function formatTime(ms: number): string {
  if (ms < 60000) return `${Math.round(ms / 1000)}s`;
  if (ms < 3600000) return `${Math.round(ms / 60000)}m`;
  const h = Math.floor(ms / 3600000);
  const m = Math.round((ms % 3600000) / 60000);
  return m > 0 ? `${h}h ${m}m` : `${h}h`;
}

export function formatDate(timestamp: number): string {
  const d = new Date(timestamp);
  const now = new Date();
  const diffMs = now.getTime() - d.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  
  if (diffMins < 1) return 'just now';
  if (diffMins < 60) return `${diffMins}m ago`;
  const diffHrs = Math.floor(diffMins / 60);
  if (diffHrs < 24) return `${diffHrs}h ago`;
  const diffDays = Math.floor(diffHrs / 24);
  if (diffDays < 7) return `${diffDays}d ago`;
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

export function formatNumber(n: number): string {
  if (n >= 1000000) return `${(n / 1000000).toFixed(1)}M`;
  if (n >= 1000) return `${(n / 1000).toFixed(1)}K`;
  return String(n);
}

export const RISK_CONFIG: Record<RiskLevel, { label: string; color: string; bg: string; border: string }> = {
  none: { label: 'No Risk', color: '#10b981', bg: 'rgba(16,185,129,0.1)', border: 'rgba(16,185,129,0.3)' },
  low: { label: 'Low', color: '#84cc16', bg: 'rgba(132,204,22,0.1)', border: 'rgba(132,204,22,0.3)' },
  medium: { label: 'Medium', color: '#f59e0b', bg: 'rgba(245,158,11,0.1)', border: 'rgba(245,158,11,0.3)' },
  high: { label: 'High', color: '#f97316', bg: 'rgba(249,115,22,0.1)', border: 'rgba(249,115,22,0.3)' },
  critical: { label: 'Critical', color: '#ef4444', bg: 'rgba(239,68,68,0.1)', border: 'rgba(239,68,68,0.3)' },
};

export const CATEGORY_CONFIG: Record<AIToolCategory, { label: string; color: string; icon: string }> = {
  llm_chat: { label: 'LLM Chat', color: '#06b6d4', icon: '💬' },
  coding_assistant: { label: 'Coding', color: '#8b5cf6', icon: '⌨️' },
  research_tool: { label: 'Research', color: '#10b981', icon: '🔍' },
  writing_tool: { label: 'Writing', color: '#f59e0b', icon: '✍️' },
  image_generation: { label: 'Images', color: '#ec4899', icon: '🎨' },
  enterprise_ai: { label: 'Enterprise', color: '#3b82f6', icon: '🏢' },
  unknown: { label: 'Unknown', color: '#6b7280', icon: '❓' },
};

export function sendMessage<T>(type: string, payload?: unknown): Promise<T> {
  return new Promise((resolve, reject) => {
    chrome.runtime.sendMessage({ type, payload }, (response) => {
      if (chrome.runtime.lastError) {
        reject(new Error(chrome.runtime.lastError.message));
        return;
      }
      if (response?.success) {
        resolve(response.data as T);
      } else {
        reject(new Error(response?.error || 'Unknown error'));
      }
    });
  });
}
