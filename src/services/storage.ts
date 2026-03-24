import { AITool, OximyEvent, PolicyConfig, Recommendation, Session, UsageStat } from '../types';

// ─── Default Policy Config ────────────────────────────────────────────────────

export const DEFAULT_POLICY: PolicyConfig = {
  version: '1.0.0',
  scanningEnabled: true,
  clipboardScanEnabled: true,
  notificationsEnabled: true,
  dataRedactionEnabled: true,
  warnOnNewTool: true,
  blockOnCriticalRisk: false,
  approvedDomains: ['copilot.microsoft.com', 'workspace.google.com', 'github.com'],
  blockedDomains: [],
  rules: [
    {
      id: 'rule-1',
      name: 'Warn on new AI tool',
      action: 'warn',
      enabled: true,
      createdAt: Date.now(),
      description: 'Show a notification whenever a new AI tool is detected for the first time.',
    },
    {
      id: 'rule-2',
      name: 'Log all AI sessions',
      action: 'allow_with_logging',
      enabled: true,
      createdAt: Date.now(),
      description: 'Record all AI tool sessions with duration and event count.',
    },
    {
      id: 'rule-3',
      name: 'Block on critical risk',
      action: 'warn',
      enabled: false,
      createdAt: Date.now(),
      description: 'Block paste and show alert when critical sensitive data is detected.',
    },
  ],
};

// ─── Storage Keys ─────────────────────────────────────────────────────────────

const KEYS = {
  TOOLS: 'oximy_tools',
  EVENTS: 'oximy_events',
  POLICY: 'oximy_policy',
  RECOMMENDATIONS: 'oximy_recommendations',
  SESSIONS: 'oximy_sessions',
  USAGE_STATS: 'oximy_usage_stats',
  DEVICE_ID: 'oximy_device_id',
  ONBOARDED: 'oximy_onboarded',
};

// ─── Generic Helpers ──────────────────────────────────────────────────────────

async function get<T>(key: string, fallback: T): Promise<T> {
  return new Promise((resolve) => {
    chrome.storage.local.get(key, (result) => {
      resolve(result[key] !== undefined ? result[key] : fallback);
    });
  });
}

async function set<T>(key: string, value: T): Promise<void> {
  return new Promise((resolve) => {
    chrome.storage.local.set({ [key]: value }, resolve);
  });
}

// ─── Device ID ───────────────────────────────────────────────────────────────

export async function getDeviceId(): Promise<string> {
  let id = await get<string>(KEYS.DEVICE_ID, '');
  if (!id) {
    id = 'device-' + Math.random().toString(36).slice(2, 11);
    await set(KEYS.DEVICE_ID, id);
  }
  return id;
}

// ─── Policy ──────────────────────────────────────────────────────────────────

export async function getPolicy(): Promise<PolicyConfig> {
  return get<PolicyConfig>(KEYS.POLICY, DEFAULT_POLICY);
}

export async function savePolicy(policy: PolicyConfig): Promise<void> {
  return set(KEYS.POLICY, policy);
}

// ─── Tools ───────────────────────────────────────────────────────────────────

export async function getTools(): Promise<AITool[]> {
  return get<AITool[]>(KEYS.TOOLS, []);
}

export async function saveTool(tool: AITool): Promise<void> {
  const tools = await getTools();
  const idx = tools.findIndex((t) => t.id === tool.id);
  if (idx >= 0) {
    tools[idx] = tool;
  } else {
    tools.push(tool);
  }
  return set(KEYS.TOOLS, tools);
}

export async function getToolById(id: string): Promise<AITool | undefined> {
  const tools = await getTools();
  return tools.find((t) => t.id === id);
}

export async function updateToolApproval(toolId: string, approved: boolean): Promise<void> {
  const tools = await getTools();
  const idx = tools.findIndex((t) => t.id === toolId);
  if (idx >= 0) {
    tools[idx].approved = approved;
    await set(KEYS.TOOLS, tools);
  }
}

// ─── Events ──────────────────────────────────────────────────────────────────

const MAX_EVENTS = 500;

export async function getEvents(): Promise<OximyEvent[]> {
  return get<OximyEvent[]>(KEYS.EVENTS, []);
}

export async function addEvent(event: OximyEvent): Promise<void> {
  const events = await getEvents();
  events.unshift(event); // newest first
  if (events.length > MAX_EVENTS) events.splice(MAX_EVENTS);
  return set(KEYS.EVENTS, events);
}

export async function getRecentEvents(limit = 20): Promise<OximyEvent[]> {
  const events = await getEvents();
  return events.slice(0, limit);
}

// ─── Recommendations ─────────────────────────────────────────────────────────

export async function getRecommendations(): Promise<Recommendation[]> {
  return get<Recommendation[]>(KEYS.RECOMMENDATIONS, []);
}

export async function saveRecommendations(recs: Recommendation[]): Promise<void> {
  return set(KEYS.RECOMMENDATIONS, recs);
}

export async function dismissRecommendation(id: string): Promise<void> {
  const recs = await getRecommendations();
  const idx = recs.findIndex((r) => r.id === id);
  if (idx >= 0) {
    recs[idx].dismissed = true;
    await saveRecommendations(recs);
  }
}

// ─── Sessions ────────────────────────────────────────────────────────────────

export async function getSessions(): Promise<Session[]> {
  return get<Session[]>(KEYS.SESSIONS, []);
}

export async function addSession(session: Session): Promise<void> {
  const sessions = await getSessions();
  sessions.unshift(session);
  if (sessions.length > 200) sessions.splice(200);
  return set(KEYS.SESSIONS, sessions);
}

// ─── Usage Stats ─────────────────────────────────────────────────────────────

export async function getUsageStats(): Promise<UsageStat[]> {
  return get<UsageStat[]>(KEYS.USAGE_STATS, []);
}

export async function updateUsageStat(date: string, delta: Partial<UsageStat>): Promise<void> {
  const stats = await getUsageStats();
  const idx = stats.findIndex((s) => s.date === date);
  if (idx >= 0) {
    stats[idx] = { ...stats[idx], ...delta,
      visits: (stats[idx].visits || 0) + (delta.visits || 0),
      riskEvents: (stats[idx].riskEvents || 0) + (delta.riskEvents || 0),
      timeSpentMs: (stats[idx].timeSpentMs || 0) + (delta.timeSpentMs || 0),
    };
  } else {
    stats.push({
      date,
      visits: delta.visits || 0,
      uniqueTools: delta.uniqueTools || 0,
      riskEvents: delta.riskEvents || 0,
      timeSpentMs: delta.timeSpentMs || 0,
    });
  }
  stats.sort((a, b) => a.date.localeCompare(b.date));
  return set(KEYS.USAGE_STATS, stats);
}

// ─── Onboarding ──────────────────────────────────────────────────────────────

export async function isOnboarded(): Promise<boolean> {
  return get<boolean>(KEYS.ONBOARDED, false);
}

export async function setOnboarded(): Promise<void> {
  return set(KEYS.ONBOARDED, true);
}

// ─── Clear All ───────────────────────────────────────────────────────────────

export async function clearAllData(): Promise<void> {
  return new Promise((resolve) => {
    chrome.storage.local.clear(resolve);
  });
}


