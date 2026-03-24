/**
 * Oximy Shield — Lightweight Backend API
 *
 * Run: node backend/server.js
 * Or:  PORT=3001 node backend/server.js
 *
 * Endpoints:
 *   POST /events            — Ingest redacted events from extension
 *   GET  /summary           — Dashboard summary aggregation
 *   GET  /alerts            — Recent risk alerts
 *   GET  /recommendations   — Generated recommendations
 *   GET  /policy            — Retrieve current policy
 *   POST /policy            — Update policy
 *   GET  /tools             — List all discovered tools
 *   POST /tools/approve     — Approve a tool by ID
 *   POST /tools/block       — Block a tool by ID
 */

const http = require('http');
const { URL } = require('url');

const PORT = process.env.PORT || 3001;
const CORS_ORIGIN = process.env.CORS_ORIGIN || '*';

// ─── In-Memory Store (replace with DB in production) ─────────────────────────

const store = {
  events: [],          // OximyEvent[]
  tools: new Map(),    // id → AITool
  policy: defaultPolicy(),
  recommendations: [],
};

function defaultPolicy() {
  return {
    version: '1.0.0',
    scanningEnabled: true,
    clipboardScanEnabled: true,
    notificationsEnabled: true,
    dataRedactionEnabled: true,
    warnOnNewTool: true,
    blockOnCriticalRisk: false,
    approvedDomains: ['copilot.microsoft.com', 'github.com'],
    blockedDomains: [],
    rules: [],
  };
}

// ─── Rate Limiting (simple in-memory) ────────────────────────────────────────

const rateLimits = new Map(); // ip → { count, resetAt }
const RATE_LIMIT = 100;
const RATE_WINDOW_MS = 60000;

function checkRateLimit(ip) {
  const now = Date.now();
  const entry = rateLimits.get(ip) || { count: 0, resetAt: now + RATE_WINDOW_MS };
  if (now > entry.resetAt) {
    entry.count = 0;
    entry.resetAt = now + RATE_WINDOW_MS;
  }
  entry.count++;
  rateLimits.set(ip, entry);
  return entry.count <= RATE_LIMIT;
}

// ─── Router ───────────────────────────────────────────────────────────────────

async function router(req, res) {
  const url = new URL(req.url, `http://localhost:${PORT}`);
  const path = url.pathname;
  const method = req.method;

  // CORS
  res.setHeader('Access-Control-Allow-Origin', CORS_ORIGIN);
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  if (method === 'OPTIONS') { res.writeHead(204); res.end(); return; }

  // Rate limit
  const ip = req.socket.remoteAddress || 'unknown';
  if (!checkRateLimit(ip)) {
    return json(res, 429, { error: 'Rate limit exceeded' });
  }

  // Routing table
  if (method === 'POST' && path === '/events') return handlePostEvents(req, res);
  if (method === 'GET'  && path === '/summary') return handleGetSummary(req, res);
  if (method === 'GET'  && path === '/alerts') return handleGetAlerts(req, res);
  if (method === 'GET'  && path === '/recommendations') return handleGetRecs(req, res);
  if (method === 'GET'  && path === '/policy') return handleGetPolicy(req, res);
  if (method === 'POST' && path === '/policy') return handlePostPolicy(req, res);
  if (method === 'GET'  && path === '/tools') return handleGetTools(req, res);
  if (method === 'POST' && path === '/tools/approve') return handleToolAction(req, res, true);
  if (method === 'POST' && path === '/tools/block') return handleToolAction(req, res, false);
  if (method === 'GET'  && path === '/health') return json(res, 200, { status: 'ok', timestamp: Date.now() });

  json(res, 404, { error: 'Not found' });
}

// ─── Handlers ─────────────────────────────────────────────────────────────────

async function handlePostEvents(req, res) {
  const body = await readBody(req);
  if (!body || typeof body !== 'object') return json(res, 400, { error: 'Invalid body' });

  const events = Array.isArray(body) ? body : [body];
  const now = Date.now();

  for (const evt of events) {
    // Validate required fields
    if (!evt.type || !evt.timestamp || !evt.domain) continue;

    // Ensure no raw sensitive data slips through
    if (evt.redactedContent) {
      evt.redactedContent = evt.redactedContent.map(sanitize);
    }

    store.events.unshift({ ...evt, receivedAt: now });

    // Update tool stats
    if (evt.toolId && evt.toolName) {
      const existing = store.tools.get(evt.toolId) || {
        id: evt.toolId,
        name: evt.toolName,
        domain: evt.domain,
        category: evt.details?.category || 'unknown',
        approved: null,
        firstSeen: now,
        visitCount: 0,
        totalTimeMs: 0,
        riskLevel: evt.riskLevel || 'none',
      };
      existing.visitCount = (existing.visitCount || 0) + (evt.type === 'tool_detected' ? 1 : 0);
      existing.lastSeen = now;
      store.tools.set(evt.toolId, existing);
    }
  }

  // Trim to 1000 events
  if (store.events.length > 1000) store.events.splice(1000);

  // Regenerate recommendations
  store.recommendations = generateRecommendations();

  json(res, 200, { accepted: events.length, total: store.events.length });
}

function handleGetSummary(_req, res) {
  const tools = [...store.tools.values()];
  const events = store.events;
  const now = Date.now();
  const weekAgo = now - 7 * 86400000;

  const topTools = tools
    .sort((a, b) => (b.visitCount || 0) - (a.visitCount || 0))
    .slice(0, 5)
    .map(t => ({
      toolId: t.id,
      toolName: t.name,
      domain: t.domain,
      category: t.category,
      visits: t.visitCount || 0,
      totalTimeMs: t.totalTimeMs || 0,
      riskScore: riskToScore(t.riskLevel),
      approved: t.approved,
    }));

  json(res, 200, {
    totalTools: tools.length,
    newToolsThisWeek: tools.filter(t => t.firstSeen >= weekAgo).length,
    riskEvents: events.filter(e => e.riskLevel && e.riskLevel !== 'none').length,
    policyViolations: events.filter(e => e.type === 'policy_violation').length,
    totalVisits: tools.reduce((s, t) => s + (t.visitCount || 0), 0),
    topTools,
    recentEvents: events.slice(0, 20),
    usageTrend: generateTrend(events),
    recommendations: store.recommendations.slice(0, 5),
  });
}

function handleGetAlerts(_req, res) {
  const alerts = store.events
    .filter(e => e.riskLevel && e.riskLevel !== 'none')
    .slice(0, 50);
  json(res, 200, { alerts, count: alerts.length });
}

function handleGetRecs(_req, res) {
  json(res, 200, { recommendations: store.recommendations });
}

function handleGetPolicy(_req, res) {
  json(res, 200, store.policy);
}

async function handlePostPolicy(req, res) {
  const body = await readBody(req);
  if (!body || typeof body !== 'object') return json(res, 400, { error: 'Invalid policy' });
  store.policy = { ...store.policy, ...body };
  json(res, 200, { success: true, policy: store.policy });
}

function handleGetTools(_req, res) {
  json(res, 200, { tools: [...store.tools.values()] });
}

async function handleToolAction(req, res, approve) {
  const body = await readBody(req);
  const toolId = body?.toolId;
  if (!toolId) return json(res, 400, { error: 'toolId required' });

  const tool = store.tools.get(toolId);
  if (!tool) return json(res, 404, { error: 'Tool not found' });

  tool.approved = approve;
  store.tools.set(toolId, tool);
  json(res, 200, { success: true, tool });
}

// ─── Recommendation Engine ────────────────────────────────────────────────────

function generateRecommendations() {
  const tools = [...store.tools.values()];
  const events = store.events;
  const recs = [];
  const now = Date.now();

  const unreviewed = tools.filter(t => t.approved === null && (t.visitCount || 0) >= 2);
  for (const t of unreviewed.slice(0, 3)) {
    recs.push({
      id: `rec-review-${t.id}`,
      type: 'review_tool',
      title: `Review "${t.name}" policy`,
      description: `Visited ${t.visitCount} times with no policy set.`,
      priority: 'high',
      toolId: t.id,
      toolName: t.name,
      actionLabel: 'Set Policy',
      dismissed: false,
      createdAt: now,
    });
  }

  const riskyEvents = events.filter(e =>
    e.type === 'risky_paste_detected' && (now - e.timestamp) < 3600000
  );
  if (riskyEvents.length >= 2) {
    recs.push({
      id: 'rec-dataleak',
      type: 'warn_data_leak',
      title: 'Sensitive data pasting detected',
      description: `${riskyEvents.length} risky paste events in the last hour.`,
      priority: 'critical',
      actionLabel: 'View Events',
      dismissed: false,
      createdAt: now,
    });
  }

  return recs.slice(0, 10);
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function generateTrend(events) {
  const byDate = {};
  for (const evt of events) {
    const d = new Date(evt.timestamp).toISOString().split('T')[0];
    if (!byDate[d]) byDate[d] = { date: d, visits: 0, uniqueTools: new Set(), riskEvents: 0, timeSpentMs: 0 };
    if (evt.type === 'tool_detected') byDate[d].visits++;
    if (evt.riskLevel && evt.riskLevel !== 'none') byDate[d].riskEvents++;
    if (evt.toolId) byDate[d].uniqueTools.add(evt.toolId);
  }
  return Object.values(byDate)
    .map(d => ({ ...d, uniqueTools: d.uniqueTools.size }))
    .sort((a, b) => a.date.localeCompare(b.date))
    .slice(-14);
}

function riskToScore(level) {
  return { none: 0, low: 25, medium: 50, high: 75, critical: 95 }[level] || 0;
}

function sanitize(text) {
  // Ensure no raw secrets reach storage
  return text.replace(/sk-[a-zA-Z0-9]{20,}/g, '[REDACTED:KEY]')
             .replace(/AKIA[0-9A-Z]{16}/g, '[REDACTED:AWS_KEY]')
             .replace(/ghp_[A-Za-z0-9_]{36}/g, '[REDACTED:GH_TOKEN]');
}

function json(res, status, data) {
  const body = JSON.stringify(data);
  res.writeHead(status, {
    'Content-Type': 'application/json',
    'Content-Length': Buffer.byteLength(body),
    'X-Powered-By': 'Oximy Shield',
  });
  res.end(body);
}

async function readBody(req) {
  return new Promise((resolve) => {
    let data = '';
    req.on('data', chunk => { data += chunk; if (data.length > 50000) req.destroy(); });
    req.on('end', () => {
      try { resolve(JSON.parse(data)); }
      catch { resolve(null); }
    });
    req.on('error', () => resolve(null));
  });
}

// ─── Server ───────────────────────────────────────────────────────────────────

const server = http.createServer(router);
server.listen(PORT, () => {
  console.log(`\n🛡️  Oximy Shield Backend`);
  console.log(`   Listening on http://localhost:${PORT}`);
  console.log(`   Endpoints:`);
  console.log(`     POST /events      — Ingest events`);
  console.log(`     GET  /summary     — Dashboard data`);
  console.log(`     GET  /alerts      — Risk alerts`);
  console.log(`     GET  /tools       — Tool inventory`);
  console.log(`     GET  /policy      — Policy config`);
  console.log(`     GET  /health      — Health check\n`);
});

server.on('error', (err) => {
  console.error('Server error:', err);
  process.exit(1);
});
