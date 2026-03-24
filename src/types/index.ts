// ─── Core Event Schema ────────────────────────────────────────────────────────

export type EventType =
  | 'tool_detected'
  | 'risky_paste_detected'
  | 'risky_input_detected'
  | 'policy_violation'
  | 'session_started'
  | 'session_ended'
  | 'recommendation_generated'
  | 'new_tool_discovered'
  | 'clipboard_scan';

export type RiskLevel = 'none' | 'low' | 'medium' | 'high' | 'critical';

export type AIToolCategory =
  | 'llm_chat'
  | 'coding_assistant'
  | 'research_tool'
  | 'writing_tool'
  | 'image_generation'
  | 'enterprise_ai'
  | 'unknown';

export interface AITool {
  id: string;
  name: string;
  domain: string;
  category: AIToolCategory;
  approved: boolean | null; // null = unreviewed
  firstSeen: number;
  lastSeen: number;
  visitCount: number;
  totalTimeMs: number;
  riskLevel: RiskLevel;
  isNew?: boolean;
}

export interface RiskPattern {
  type: string;
  label: string;
  pattern: RegExp;
  severity: RiskLevel;
  redactedValue: string;
}

export interface OximyEvent {
  id: string;
  type: EventType;
  timestamp: number;
  domain: string;
  toolId?: string;
  toolName?: string;
  riskLevel: RiskLevel;
  details: Record<string, unknown>;
  redactedContent?: string[];
  sessionId: string;
  deviceId: string;
}

export interface Session {
  id: string;
  toolId: string;
  domain: string;
  startTime: number;
  endTime?: number;
  durationMs?: number;
  eventsCount: number;
}

// ─── Policy ──────────────────────────────────────────────────────────────────

export type PolicyAction = 'allow' | 'warn' | 'block' | 'allow_with_logging';

export interface PolicyRule {
  id: string;
  name: string;
  domain?: string;
  category?: AIToolCategory;
  action: PolicyAction;
  enabled: boolean;
  createdAt: number;
  description: string;
}

export interface PolicyConfig {
  version: string;
  scanningEnabled: boolean;
  clipboardScanEnabled: boolean;
  notificationsEnabled: boolean;
  dataRedactionEnabled: boolean;
  warnOnNewTool: boolean;
  blockOnCriticalRisk: boolean;
  approvedDomains: string[];
  blockedDomains: string[];
  rules: PolicyRule[];
}

// ─── Analytics ───────────────────────────────────────────────────────────────

export interface UsageStat {
  date: string; // YYYY-MM-DD
  visits: number;
  uniqueTools: number;
  riskEvents: number;
  timeSpentMs: number;
}

export interface ToolUsageStat {
  toolId: string;
  toolName: string;
  domain: string;
  category: AIToolCategory;
  visits: number;
  totalTimeMs: number;
  riskScore: number;
  approved: boolean | null;
}

export interface DashboardSummary {
  totalTools: number;
  newToolsThisWeek: number;
  newToolsLastWeek: number;   // for week-over-week trend calculation
  riskScore: number;
  riskEvents: number;
  policyViolations: number;
  activeSessions: number;
  totalVisits: number;
  scanning: boolean;          // real scanning state from background worker
  topTools: ToolUsageStat[];
  recentEvents: OximyEvent[];
  usageTrend: UsageStat[];
  recommendations: Recommendation[];
}

// ─── Recommendations ─────────────────────────────────────────────────────────

export type RecommendationType =
  | 'approve_tool'
  | 'review_tool'
  | 'block_tool'
  | 'train_team'
  | 'warn_data_leak'
  | 'consolidate_tools'
  | 'enable_policy';

export interface Recommendation {
  id: string;
  type: RecommendationType;
  title: string;
  description: string;
  priority: 'low' | 'medium' | 'high' | 'critical';
  toolId?: string;
  toolName?: string;
  actionLabel: string;
  dismissed: boolean;
  createdAt: number;
}

// ─── State ───────────────────────────────────────────────────────────────────

export interface ExtensionState {
  scanning: boolean;
  currentTool: AITool | null;
  currentDomain: string;
  currentRiskLevel: RiskLevel;
  recentEvents: OximyEvent[];
  sessionId: string;
  deviceId: string;
}

// ─── Messages (Background ↔ Content/Popup) ───────────────────────────────────

export type MessageType =
  | 'GET_STATE'
  | 'SET_SCANNING'
  | 'TOOL_DETECTED'
  | 'RISK_DETECTED'
  | 'OPEN_DASHBOARD'
  | 'GET_SUMMARY'
  | 'GET_TOOLS'
  | 'GET_EVENTS'
  | 'APPROVE_TOOL'
  | 'BLOCK_TOOL'
  | 'GET_POLICY'
  | 'UPDATE_POLICY'
  | 'DISMISS_RECOMMENDATION'
  | 'CLEAR_DATA';

export interface ChromeMessage {
  type: MessageType;
  payload?: unknown;
}

export interface ChromeResponse<T = unknown> {
  success: boolean;
  data?: T;
  error?: string;
}
