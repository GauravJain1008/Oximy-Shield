import { AITool, OximyEvent, Recommendation, RecommendationType } from '../types';
import { riskLevelToScore } from './riskDetector';

function makeId() {
  return 'rec-' + Math.random().toString(36).slice(2, 10);
}

export function generateRecommendations(
  tools: AITool[],
  events: OximyEvent[],
  existing: Recommendation[]
): Recommendation[] {
  const existingIds = new Set(existing.filter(r => !r.dismissed).map(r => r.type + ':' + r.toolId));
  const recs: Recommendation[] = [];
  const now = Date.now();

  // 1. Unreviewed tools with high visit count → recommend review
  const unreviewedHighUsage = tools.filter(t => t.approved === null && t.visitCount >= 3);
  for (const tool of unreviewedHighUsage) {
    const key = 'review_tool:' + tool.id;
    if (!existingIds.has(key)) {
      recs.push({
        id: makeId(),
        type: 'review_tool',
        title: `Review "${tool.name}" access policy`,
        description: `This tool has been visited ${tool.visitCount} times but has no policy set. Define whether it should be approved or blocked.`,
        priority: 'high',
        toolId: tool.id,
        toolName: tool.name,
        actionLabel: 'Set Policy',
        dismissed: false,
        createdAt: now,
      });
    }
  }

  // 2. New tools in last 24h → warn
  const newTools = tools.filter(t => now - t.firstSeen < 86400000 && t.approved === null);
  for (const tool of newTools.slice(0, 2)) {
    const key = 'approve_tool:' + tool.id;
    if (!existingIds.has(key)) {
      recs.push({
        id: makeId(),
        type: 'approve_tool',
        title: `New AI tool detected: "${tool.name}"`,
        description: `"${tool.name}" was seen for the first time today. Review and approve or block it based on your policy.`,
        priority: 'medium',
        toolId: tool.id,
        toolName: tool.name,
        actionLabel: 'Review Tool',
        dismissed: false,
        createdAt: now,
      });
    }
  }

  // 3. High risk events → warn about data leak
  const recentRiskyEvents = events.filter(
    e => e.type === 'risky_paste_detected' && now - e.timestamp < 3600000
  );
  if (recentRiskyEvents.length >= 2) {
    const key = 'warn_data_leak:undefined';
    if (!existingIds.has(key)) {
      recs.push({
        id: makeId(),
        type: 'warn_data_leak',
        title: 'Sensitive data pasted into AI tools recently',
        description: `${recentRiskyEvents.length} risky paste events detected in the last hour. Consider training your team on data handling practices.`,
        priority: 'critical',
        actionLabel: 'View Events',
        dismissed: false,
        createdAt: now,
      });
    }
  }

  // 4. Multiple tools in same category → consolidate
  const categories = new Map<string, AITool[]>();
  for (const tool of tools.filter(t => t.approved !== false)) {
    const cat = tool.category;
    if (!categories.has(cat)) categories.set(cat, []);
    categories.get(cat)!.push(tool);
  }
  for (const [cat, catTools] of categories.entries()) {
    if (catTools.length >= 3) {
      const key = 'consolidate_tools:undefined';
      if (!existingIds.has(key)) {
        recs.push({
          id: makeId(),
          type: 'consolidate_tools',
          title: `${catTools.length} ${cat.replace('_', ' ')} tools in use`,
          description: `Your team is using ${catTools.length} different tools in the same category. Consolidating could save costs and reduce risk surface.`,
          priority: 'medium',
          actionLabel: 'View Tools',
          dismissed: false,
          createdAt: now,
        });
        break; // one per run
      }
    }
  }

  // 5. High risk tool with no policy → enable policy
  const highRiskNoPolicies = tools.filter(
    t => (t.riskLevel === 'high' || t.riskLevel === 'critical') && t.approved === null
  );
  for (const tool of highRiskNoPolicies.slice(0, 1)) {
    const key = 'enable_policy:' + tool.id;
    if (!existingIds.has(key)) {
      recs.push({
        id: makeId(),
        type: 'enable_policy',
        title: `High-risk tool "${tool.name}" has no policy`,
        description: `"${tool.name}" is categorized as ${tool.riskLevel} risk but no policy is set. Enable a policy to control access.`,
        priority: 'high',
        toolId: tool.id,
        toolName: tool.name,
        actionLabel: 'Enable Policy',
        dismissed: false,
        createdAt: now,
      });
    }
  }

  return [...recs, ...existing.filter(r => !r.dismissed)].slice(0, 10);
}

export function overallRiskScore(tools: AITool[], events: OximyEvent[]): number {
  if (tools.length === 0) return 0;
  
  // Base: average tool risk
  const toolRiskAvg = tools.reduce((sum, t) => sum + riskLevelToScore(t.riskLevel), 0) / tools.length;
  
  // Boost for recent events
  const now = Date.now();
  const recentRisky = events.filter(
    e => ['risky_paste_detected', 'policy_violation'].includes(e.type) && now - e.timestamp < 86400000
  ).length;
  
  const eventBoost = Math.min(recentRisky * 5, 30);
  
  // Penalty for unreviewed tools
  const unreviewedPct = tools.filter(t => t.approved === null).length / tools.length;
  const unreviewedPenalty = unreviewedPct * 15;

  return Math.min(Math.round(toolRiskAvg + eventBoost + unreviewedPenalty), 100);
}
