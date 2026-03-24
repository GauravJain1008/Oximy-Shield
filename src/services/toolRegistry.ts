import { AITool, AIToolCategory, RiskLevel } from '../types';

export interface ToolDefinition {
  id: string;
  name: string;
  domains: string[];
  category: AIToolCategory;
  defaultRiskLevel: RiskLevel;
  vendor?: string;
  description?: string;
}

export const KNOWN_AI_TOOLS: ToolDefinition[] = [
  // LLM Chat
  { id: 'chatgpt', name: 'ChatGPT', domains: ['chat.openai.com', 'chatgpt.com'], category: 'llm_chat', defaultRiskLevel: 'medium', vendor: 'OpenAI' },
  { id: 'claude', name: 'Claude', domains: ['claude.ai'], category: 'llm_chat', defaultRiskLevel: 'medium', vendor: 'Anthropic' },
  { id: 'gemini', name: 'Google Gemini', domains: ['gemini.google.com', 'bard.google.com'], category: 'llm_chat', defaultRiskLevel: 'medium', vendor: 'Google' },
  { id: 'perplexity', name: 'Perplexity AI', domains: ['perplexity.ai'], category: 'research_tool', defaultRiskLevel: 'low', vendor: 'Perplexity' },
  { id: 'poe', name: 'Poe', domains: ['poe.com'], category: 'llm_chat', defaultRiskLevel: 'medium', vendor: 'Quora' },
  { id: 'mistral', name: 'Mistral Chat', domains: ['chat.mistral.ai'], category: 'llm_chat', defaultRiskLevel: 'low', vendor: 'Mistral AI' },
  { id: 'meta_ai', name: 'Meta AI', domains: ['meta.ai', 'www.meta.ai'], category: 'llm_chat', defaultRiskLevel: 'medium', vendor: 'Meta' },
  { id: 'grok', name: 'Grok', domains: ['grok.x.ai', 'x.com'], category: 'llm_chat', defaultRiskLevel: 'medium', vendor: 'xAI' },
  { id: 'groq', name: 'Groq Chat', domains: ['groq.com'], category: 'llm_chat', defaultRiskLevel: 'low', vendor: 'Groq' },
  { id: 'you_ai', name: 'You.com', domains: ['you.com'], category: 'research_tool', defaultRiskLevel: 'low', vendor: 'You.com' },
  { id: 'phind', name: 'Phind', domains: ['phind.com'], category: 'coding_assistant', defaultRiskLevel: 'medium', vendor: 'Phind' },

  // Coding Assistants
  { id: 'github_copilot', name: 'GitHub Copilot', domains: ['github.com', 'copilot.github.com'], category: 'coding_assistant', defaultRiskLevel: 'medium', vendor: 'Microsoft/GitHub' },
  { id: 'cursor', name: 'Cursor AI', domains: ['cursor.so', 'cursor.com', 'www.cursor.com'], category: 'coding_assistant', defaultRiskLevel: 'high', vendor: 'Anysphere' },
  { id: 'tabnine', name: 'Tabnine', domains: ['tabnine.com', 'app.tabnine.com'], category: 'coding_assistant', defaultRiskLevel: 'medium', vendor: 'Tabnine' },
  { id: 'codeium', name: 'Codeium', domains: ['codeium.com'], category: 'coding_assistant', defaultRiskLevel: 'medium', vendor: 'Codeium' },
  { id: 'replit_ai', name: 'Replit Ghostwriter', domains: ['replit.com'], category: 'coding_assistant', defaultRiskLevel: 'high', vendor: 'Replit' },
  { id: 'v0', name: 'v0 by Vercel', domains: ['v0.dev'], category: 'coding_assistant', defaultRiskLevel: 'medium', vendor: 'Vercel' },
  { id: 'bolt', name: 'Bolt.new', domains: ['bolt.new'], category: 'coding_assistant', defaultRiskLevel: 'medium', vendor: 'StackBlitz' },

  // Writing Tools
  { id: 'notion_ai', name: 'Notion AI', domains: ['notion.so', 'notion.com'], category: 'writing_tool', defaultRiskLevel: 'medium', vendor: 'Notion' },
  { id: 'jasper', name: 'Jasper AI', domains: ['jasper.ai', 'app.jasper.ai'], category: 'writing_tool', defaultRiskLevel: 'low', vendor: 'Jasper' },
  { id: 'copy_ai', name: 'Copy.ai', domains: ['copy.ai', 'app.copy.ai'], category: 'writing_tool', defaultRiskLevel: 'low', vendor: 'Copy.ai' },
  { id: 'writesonic', name: 'Writesonic', domains: ['writesonic.com'], category: 'writing_tool', defaultRiskLevel: 'low', vendor: 'Writesonic' },
  { id: 'grammarly_ai', name: 'Grammarly AI', domains: ['grammarly.com', 'app.grammarly.com'], category: 'writing_tool', defaultRiskLevel: 'medium', vendor: 'Grammarly' },
  { id: 'otter_ai', name: 'Otter.ai', domains: ['otter.ai'], category: 'writing_tool', defaultRiskLevel: 'medium', vendor: 'Otter.ai' },

  // Image Generation
  { id: 'midjourney', name: 'Midjourney', domains: ['midjourney.com', 'www.midjourney.com'], category: 'image_generation', defaultRiskLevel: 'low', vendor: 'Midjourney' },
  { id: 'dalle', name: 'DALL-E', domains: ['labs.openai.com'], category: 'image_generation', defaultRiskLevel: 'low', vendor: 'OpenAI' },
  { id: 'stable_diffusion', name: 'Stability AI', domains: ['stability.ai', 'dreamstudio.ai'], category: 'image_generation', defaultRiskLevel: 'low', vendor: 'Stability AI' },
  { id: 'adobe_firefly', name: 'Adobe Firefly', domains: ['firefly.adobe.com'], category: 'image_generation', defaultRiskLevel: 'low', vendor: 'Adobe' },
  { id: 'canva_ai', name: 'Canva AI', domains: ['canva.com', 'www.canva.com'], category: 'image_generation', defaultRiskLevel: 'low', vendor: 'Canva' },
  { id: 'ideogram', name: 'Ideogram', domains: ['ideogram.ai'], category: 'image_generation', defaultRiskLevel: 'low', vendor: 'Ideogram' },

  // Enterprise AI
  { id: 'copilot_365', name: 'Microsoft Copilot 365', domains: ['copilot.microsoft.com', 'microsoft365.com'], category: 'enterprise_ai', defaultRiskLevel: 'low', vendor: 'Microsoft' },
  { id: 'azure_openai', name: 'Azure OpenAI', domains: ['oai.azure.com'], category: 'enterprise_ai', defaultRiskLevel: 'medium', vendor: 'Microsoft' },
  { id: 'google_workspace_ai', name: 'Google Workspace AI', domains: ['workspace.google.com'], category: 'enterprise_ai', defaultRiskLevel: 'low', vendor: 'Google' },
  { id: 'aws_bedrock', name: 'AWS Bedrock Console', domains: ['console.aws.amazon.com'], category: 'enterprise_ai', defaultRiskLevel: 'medium', vendor: 'Amazon' },
  { id: 'salesforce_einstein', name: 'Salesforce Einstein', domains: ['salesforce.com', 'lightning.salesforce.com'], category: 'enterprise_ai', defaultRiskLevel: 'medium', vendor: 'Salesforce' },
  { id: 'hubspot_ai', name: 'HubSpot AI', domains: ['app.hubspot.com'], category: 'enterprise_ai', defaultRiskLevel: 'low', vendor: 'HubSpot' },

  // Research / Other
  { id: 'consensus', name: 'Consensus AI', domains: ['consensus.app'], category: 'research_tool', defaultRiskLevel: 'none', vendor: 'Consensus' },
  { id: 'elicit', name: 'Elicit', domains: ['elicit.com', 'elicit.org'], category: 'research_tool', defaultRiskLevel: 'none', vendor: 'Elicit' },
  { id: 'huggingface', name: 'Hugging Face', domains: ['huggingface.co'], category: 'research_tool', defaultRiskLevel: 'medium', vendor: 'Hugging Face' },
  { id: 'together_ai', name: 'Together AI', domains: ['api.together.xyz', 'together.ai'], category: 'enterprise_ai', defaultRiskLevel: 'medium', vendor: 'Together AI' },
  { id: 'openrouter', name: 'OpenRouter', domains: ['openrouter.ai'], category: 'llm_chat', defaultRiskLevel: 'medium', vendor: 'OpenRouter' },
];

// Build domain lookup index
const domainIndex = new Map<string, ToolDefinition>();
for (const tool of KNOWN_AI_TOOLS) {
  for (const domain of tool.domains) {
    domainIndex.set(domain.toLowerCase(), tool);
  }
}

export function detectToolByDomain(hostname: string): ToolDefinition | null {
  const clean = hostname.toLowerCase().replace(/^www\./, '');
  // Exact match
  if (domainIndex.has(clean)) return domainIndex.get(clean)!;
  // Partial match (subdomain check)
  for (const [domain, tool] of domainIndex.entries()) {
    if (clean.endsWith('.' + domain) || clean === domain) return tool;
  }
  return null;
}

export function toolDefToAITool(def: ToolDefinition, now: number): Omit<AITool, 'firstSeen' | 'visitCount' | 'totalTimeMs'> {
  return {
    id: def.id,
    name: def.name,
    domain: def.domains[0],
    category: def.category,
    approved: null,
    lastSeen: now,
    riskLevel: def.defaultRiskLevel,
  };
}

export const CATEGORY_LABELS: Record<AIToolCategory, string> = {
  llm_chat: 'LLM Chat',
  coding_assistant: 'Coding Assistant',
  research_tool: 'Research Tool',
  writing_tool: 'Writing Tool',
  image_generation: 'Image Generation',
  enterprise_ai: 'Enterprise AI',
  unknown: 'Unknown',
};

export const CATEGORY_COLORS: Record<AIToolCategory, string> = {
  llm_chat: '#06b6d4',
  coding_assistant: '#8b5cf6',
  research_tool: '#10b981',
  writing_tool: '#f59e0b',
  image_generation: '#ec4899',
  enterprise_ai: '#3b82f6',
  unknown: '#6b7280',
};
