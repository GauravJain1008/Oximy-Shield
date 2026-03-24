// Oximy Shield — Background Service Worker
import { detectToolByDomain, toolDefToAITool } from '../services/toolRegistry';
import { riskLevelToScore } from '../services/riskDetector';
import { generateRecommendations } from '../services/recommendations';
import {
  getPolicy,
  getTools,
  saveTool,
  getToolById,
  updateToolApproval,
  addEvent,
  getEvents,
  getRecentEvents,
  getRecommendations,
  saveRecommendations,
  addSession,
  getUsageStats,
  updateUsageStat,
  getDeviceId,
  isOnboarded,
  savePolicy,
  dismissRecommendation,
  clearAllData,
} from '../services/storage';
import { AITool, ChromeMessage, ChromeResponse, OximyEvent, Session } from '../types';

// ─── State ────────────────────────────────────────────────────────────────────

let currentSessionId = generateId('session');
let scanning = true;

// tabId → active session info
const activeSessions = new Map<number, { toolId: string; startTime: number }>();

// Deduplication: prevent the same tool from generating multiple events
// when tabs.onUpdated fires several times for one navigation, or when
// both the tab event and the content script message arrive for the same page.
// Key: tabId, Value: { toolId, timestamp of last recorded event }
const lastDetection = new Map<number, { toolId: string; timestamp: number }>();
const DEDUP_WINDOW_MS = 5000; // ignore repeat detections within 5 seconds

// ─── Init ─────────────────────────────────────────────────────────────────────

chrome.runtime.onInstalled.addListener(async () => {
  const onboarded = await isOnboarded();
  if (!onboarded) {
    chrome.tabs.create({ url: chrome.runtime.getURL('onboarding.html') });
  }
  await initializeDefaults();
});

// ─── Tab Monitoring ───────────────────────────────────────────────────────────
// Primary detection path: background watches all tab URL changes.
// Fires when the user navigates to any URL.

chrome.tabs.onUpdated.addListener(async (tabId, changeInfo, tab) => {
  if (!scanning) return;
  // Only process when navigation is fully complete and we have a URL
  if (changeInfo.status !== 'complete' || !tab.url) return;
  // Skip internal Chrome/extension pages
  if (tab.url.startsWith('chrome://') || tab.url.startsWith('chrome-extension://')) return;

  try {
    const hostname = new URL(tab.url).hostname;
    const toolDef = detectToolByDomain(hostname);
    if (!toolDef) return;

    await handleToolDetection(tabId, hostname, toolDef.id);
  } catch (e) {
    console.error('[Oximy] tabs.onUpdated error:', e);
  }
});

// Secondary path: content script sends TOOL_DETECTED for SPA sub-navigations
// where the URL changes without a full page reload (e.g. ChatGPT switching
// conversations). tabs.onUpdated won't fire in those cases.
// This is handled inside the message handler below.

chrome.tabs.onRemoved.addListener(async (tabId) => {
  lastDetection.delete(tabId);

  if (activeSessions.has(tabId)) {
    const session = activeSessions.get(tabId)!;
    const now = Date.now();
    const duration = now - session.startTime;
    activeSessions.delete(tabId);

    // Flush the final time-spent to the stored tool record
    const tool = await getToolById(session.toolId);
    if (tool) {
      tool.totalTimeMs = (tool.totalTimeMs || 0) + duration;
      await saveTool(tool);
    }
  }
});

// ─── Core Detection Logic ─────────────────────────────────────────────────────
// Single function used by both tabs.onUpdated and the TOOL_DETECTED message
// handler so detection behaviour is identical regardless of trigger source.

async function handleToolDetection(
  tabId: number,
  hostname: string,
  toolId: string,
): Promise<void> {
  // ── Deduplication ──────────────────────────────────────────────────────────
  // Prevent duplicate events when onUpdated fires multiple times for one
  // navigation, or when both tab event and content script message arrive.
  const now = Date.now();
  const lastEvt = lastDetection.get(tabId);
  if (lastEvt && lastEvt.toolId === toolId && now - lastEvt.timestamp < DEDUP_WINDOW_MS) {
    return; // same tool, same tab, within dedup window — skip
  }
  lastDetection.set(tabId, { toolId, timestamp: now });

  const toolDef = detectToolByDomain(hostname);
  if (!toolDef) return;

  const policy = await getPolicy();
  const deviceId = await getDeviceId();
  const date = new Date(now).toISOString().split('T')[0];

  // ── Policy: blocked domain check ──────────────────────────────────────────
  // Check the actual hostname the browser is on, not toolDef.domains[0].
  // This correctly handles all aliases (chatgpt.com, chat.openai.com, etc.)
  const canonicalDomain = hostname.replace(/^www\./, '');
  const isBlocked = policy.blockedDomains.some(
    (d) => canonicalDomain === d || canonicalDomain.endsWith('.' + d)
  );

  if (isBlocked) {
    // Record the violation so the dashboard counter increments
    const violationEvent: OximyEvent = {
      id: generateId('evt'),
      type: 'policy_violation',
      timestamp: now,
      domain: hostname,
      toolId: toolDef.id,
      toolName: toolDef.name,
      riskLevel: 'high',
      details: { reason: 'Domain is on the blocked list', policy: 'blocked_domains' },
      sessionId: currentSessionId,
      deviceId,
    };
    await addEvent(violationEvent);
    await updateUsageStat(date, { visits: 0, riskEvents: 1, timeSpentMs: 0 });
    updateBadge('high');
    return; // do not record a normal tool visit
  }

  // ── Tool record: upsert ───────────────────────────────────────────────────
  let tool = await getToolById(toolDef.id);
  const isNew = !tool;

  if (!tool) {
    tool = {
      ...toolDefToAITool(toolDef, now),
      firstSeen: now,
      visitCount: 0,
      totalTimeMs: 0,
    };
  }

  tool.visitCount += 1;
  tool.lastSeen = now;
  // NOTE: do NOT set tool.isNew here — isNew is a transient event detail,
  // not a permanent property of the stored tool record.
  await saveTool(tool);

  // ── Session tracking ──────────────────────────────────────────────────────
  if (activeSessions.has(tabId)) {
    const prev = activeSessions.get(tabId)!;
    const duration = now - prev.startTime;

    await addSession({
      id: generateId('sess'),
      toolId: prev.toolId,
      domain: hostname,
      startTime: prev.startTime,
      endTime: now,
      durationMs: duration,
      eventsCount: 1,
    });

    // Flush time-spent to the previous tool's record
    const prevTool = await getToolById(prev.toolId);
    if (prevTool) {
      prevTool.totalTimeMs = (prevTool.totalTimeMs || 0) + duration;
      await saveTool(prevTool);
    }
  }
  activeSessions.set(tabId, { toolId: tool.id, startTime: now });

  // ── Event: TOOL_DETECTED or NEW_TOOL_DISCOVERED ───────────────────────────
  const event: OximyEvent = {
    id: generateId('evt'),
    type: isNew ? 'new_tool_discovered' : 'tool_detected',
    timestamp: now,
    domain: hostname,
    toolId: tool.id,
    toolName: tool.name,
    riskLevel: tool.riskLevel,
    details: {
      category: tool.category,
      isNew,
      visitCount: tool.visitCount,
      vendor: toolDef.vendor ?? null,
    },
    sessionId: currentSessionId,
    deviceId,
  };
  await addEvent(event);

  // ── Usage stats ───────────────────────────────────────────────────────────
  // Count unique tools seen today so the chart has accurate data.
  const allTools = await getTools();
  const toolsSeenToday = new Set(
    (await getEvents())
      .filter((e) => e.timestamp >= new Date(now).setHours(0, 0, 0, 0))
      .map((e) => e.toolId)
      .filter(Boolean)
  ).size;

  await updateUsageStat(date, {
    visits: 1,
    uniqueTools: toolsSeenToday,
    riskEvents: 0,
    timeSpentMs: 0,
  });

  // ── Notification: new tool ────────────────────────────────────────────────
  if (isNew && policy.warnOnNewTool && policy.notificationsEnabled) {
    chrome.notifications.create(`oximy-new-${tool.id}`, {
      type: 'basic',
      iconUrl: 'icons/icon48.png',
      title: '🆕 New AI Tool Detected',
      message: `${tool.name} was seen for the first time. Review its policy in Oximy Shield.`,
      priority: 1,
    });
  }

  // ── Recommendations ───────────────────────────────────────────────────────
  const events = await getEvents();
  const existingRecs = await getRecommendations();
  const newRecs = generateRecommendations(allTools, events, existingRecs);
  await saveRecommendations(newRecs);

  // ── Badge ─────────────────────────────────────────────────────────────────
  updateBadge(tool.riskLevel);
}

// ─── Message Handler ──────────────────────────────────────────────────────────

chrome.runtime.onMessage.addListener(
  (message: ChromeMessage, sender, sendResponse: (r: ChromeResponse) => void) => {
    // Extract the real tab ID from the message sender so content scripts don't
    // need to call chrome.tabs.getCurrent() (which doesn't work in content scripts).
    const senderTabId = sender.tab?.id ?? -1;
    handleMessage(message, senderTabId).then(sendResponse).catch((e) => {
      sendResponse({ success: false, error: String(e) });
    });
    return true; // keep channel open for async response
  }
);

async function handleMessage(msg: ChromeMessage, senderTabId = -1): Promise<ChromeResponse> {
  switch (msg.type) {
    case 'GET_STATE': {
      const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
      let currentTool = null;
      if (tab?.url) {
        try {
          const hostname = new URL(tab.url).hostname;
          const def = detectToolByDomain(hostname);
          if (def) currentTool = await getToolById(def.id);
        } catch {}
      }
      const events = await getRecentEvents(10);
      return {
        success: true,
        data: {
          scanning,
          currentTool,
          recentEvents: events,
          activeSessions: activeSessions.size,
        },
      };
    }

    case 'TOOL_DETECTED': {
      // Content scripts cannot call chrome.tabs.getCurrent() — we use the real
      // tab ID extracted from sender.tab.id in the message listener above.
      const { hostname, toolId } = msg.payload as {
        hostname: string;
        toolId: string;
      };
      if (scanning && hostname && toolId) {
        await handleToolDetection(senderTabId, hostname, toolId);
      }
      return { success: true };
    }

    case 'SET_SCANNING': {
      scanning = (msg.payload as { enabled: boolean }).enabled;
      chrome.action.setBadgeText({ text: scanning ? '' : '⏸' });
      return { success: true };
    }

    case 'GET_SUMMARY': {
      const tools = await getTools();
      const events = await getEvents();
      const recs = await getRecommendations();
      const stats = await getUsageStats();
      const now = Date.now();
      const weekAgo = now - 7 * 86400000;
      const twoWeeksAgo = now - 14 * 86400000;

      // Only event types that represent genuine risk, not routine detections
      const RISK_EVENT_TYPES = ['risky_paste_detected', 'risky_input_detected', 'policy_violation'];

      return {
        success: true,
        data: {
          totalTools: tools.length,
          newToolsThisWeek: tools.filter((t) => t.firstSeen >= weekAgo).length,
          newToolsLastWeek: tools.filter((t) => t.firstSeen >= twoWeeksAgo && t.firstSeen < weekAgo).length,
          riskEvents: events.filter((e) => RISK_EVENT_TYPES.includes(e.type)).length,
          policyViolations: events.filter((e) => e.type === 'policy_violation').length,
          activeSessions: activeSessions.size,
          totalVisits: tools.reduce((s, t) => s + t.visitCount, 0),
          scanning,
          // Map AITool → ToolUsageStat so dashboard fields (.toolId, .toolName) resolve correctly
          topTools: [...tools]
            .sort((a, b) => b.visitCount - a.visitCount)
            .slice(0, 5)
            .map((t) => ({
              toolId: t.id,
              toolName: t.name,
              domain: t.domain,
              category: t.category,
              visits: t.visitCount,
              totalTimeMs: t.totalTimeMs,
              riskScore: riskLevelToScore(t.riskLevel),
              approved: t.approved,
            })),
          recentEvents: events.slice(0, 20),
          usageTrend: stats.slice(-14),
          recommendations: recs.filter((r) => !r.dismissed).slice(0, 5),
        },
      };
    }

    case 'GET_TOOLS': {
      const tools = await getTools();
      return { success: true, data: tools };
    }

    case 'GET_EVENTS': {
      const events = await getRecentEvents(50);
      return { success: true, data: events };
    }

    case 'APPROVE_TOOL': {
      await updateToolApproval(msg.payload as string, true);
      return { success: true };
    }

    case 'BLOCK_TOOL': {
      await updateToolApproval(msg.payload as string, false);
      return { success: true };
    }

    case 'GET_POLICY': {
      const policy = await getPolicy();
      return { success: true, data: policy };
    }

    case 'UPDATE_POLICY': {
      await savePolicy(msg.payload as any);
      return { success: true };
    }

    case 'DISMISS_RECOMMENDATION': {
      await dismissRecommendation(msg.payload as string);
      return { success: true };
    }

    case 'RISK_DETECTED': {
      // Content script runs analyzeText() locally and sends only the structured
      // DetectionResult — never raw text. We trust the riskLevel and matches it
      // computed and skip re-running the regex engine here.
      const {
        redactedSnippet,
        matches,
        riskLevel,
        domain,
        toolId,
        source, // 'paste' | 'input'
      } = msg.payload as {
        redactedSnippet: string;
        matches: Array<{ type: string; label: string; severity: string; count: number }>;
        riskLevel: string;
        domain: string;
        toolId: string;
        source: 'paste' | 'input';
      };

      if (!riskLevel || riskLevel === 'none') return { success: true };

      const deviceId = await getDeviceId();

      // Resolve toolName from storage so the event log shows a readable label
      const tool = await getToolById(toolId);
      const toolName = tool?.name ?? domain;

      const eventType = source === 'input' ? 'risky_input_detected' : 'risky_paste_detected';

      const event: OximyEvent = {
        id: generateId('evt'),
        type: eventType as OximyEvent['type'],
        timestamp: Date.now(),
        domain,
        toolId,
        toolName,
        riskLevel: riskLevel as OximyEvent['riskLevel'],
        details: {
          patterns: matches.map(m => m.type),
          patternLabels: matches.map(m => m.label),
          matchCount: matches.reduce((sum, m) => sum + m.count, 0),
          source,
        },
        // Store only the already-redacted snippet — never raw content
        redactedContent: [redactedSnippet],
        sessionId: currentSessionId,
        deviceId,
      };

      await addEvent(event);

      const date = new Date().toISOString().split('T')[0];
      await updateUsageStat(date, { riskEvents: 1 });

      const policy = await getPolicy();

      // Named notification ID prevents duplicate OS notifications for the same
      // tool + risk level within a short window (Chrome deduplicates by ID).
      if (policy.notificationsEnabled && riskLevel !== 'low') {
        const notifId = `oximy-risk-${toolId}-${riskLevel}`;
        chrome.notifications.create(notifId, {
          type: 'basic',
          iconUrl: 'icons/icon48.png',
          title: `⚠️ ${riskLevel.toUpperCase()} Risk — ${toolName}`,
          message: `${source === 'paste' ? 'Pasted' : 'Typed'} content contains: ${matches.map(m => m.label).join(', ')}`,
          priority: riskLevel === 'critical' ? 2 : 1,
        });
      }

      updateBadge(riskLevel);
      return { success: true };
    }

    case 'OPEN_DASHBOARD': {
      chrome.tabs.create({ url: chrome.runtime.getURL('dashboard.html') });
      return { success: true };
    }

    case 'CLEAR_DATA': {
      await clearAllData();
      return { success: true };
    }

    default:
      return { success: false, error: 'Unknown message type' };
  }
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function generateId(prefix: string): string {
  return `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
}

function updateBadge(riskLevel: string) {
  const colors: Record<string, string> = {
    none: '#10b981',
    low: '#84cc16',
    medium: '#f59e0b',
    high: '#f97316',
    critical: '#ef4444',
  };
  const color = colors[riskLevel] || '#6b7280';
  chrome.action.setBadgeBackgroundColor({ color });
  if (riskLevel === 'high' || riskLevel === 'critical') {
    chrome.action.setBadgeText({ text: '!' });
  } else {
    chrome.action.setBadgeText({ text: '' });
  }
}

// ─── Initialization ───────────────────────────────────────────────────────────
// Only writes the default policy if none has been saved yet.
// No tools, events, or fake data are ever pre-populated.
// All data in storage comes exclusively from real browser activity.

async function initializeDefaults() {
  const policy = await getPolicy();
  if (!policy.version) {
    // Storage was fully cleared — re-save the default policy so Settings has
    // something to render. Everything else starts empty and fills via real events.
    await savePolicy(policy);
  }
}
