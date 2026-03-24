import { describe, it, expect } from 'vitest';
import { analyzeText, RISK_PATTERNS } from '../src/services/riskDetector';
import { detectToolByDomain } from '../src/services/toolRegistry';

// ─── Risk Detector Tests ──────────────────────────────────────────────────────

describe('analyzeText', () => {
  it('detects OpenAI API keys', () => {
    const text = 'Here is my key: sk-abcdefghijklmnopqrstuvwxyz12345678';
    const result = analyzeText(text);
    expect(result.hasRisk).toBe(true);
    expect(result.riskLevel).toBe('critical');
    expect(result.matches.some(m => m.type === 'openai_key')).toBe(true);
    expect(result.redactedText).toContain('[REDACTED:OPENAI_KEY]');
    expect(result.redactedText).not.toContain('sk-abcdef');
  });

  it('detects AWS access keys', () => {
    const text = 'AWS_ACCESS_KEY_ID=AKIAIOSFODNN7EXAMPLE';
    const result = analyzeText(text);
    expect(result.hasRisk).toBe(true);
    expect(result.matches.some(m => m.type === 'aws_key')).toBe(true);
    expect(result.riskLevel).toBe('critical');
  });

  it('detects GitHub tokens', () => {
    const text = 'export GH_TOKEN=ghp_abcdefghijklmnopqrstuvwxyz012345678';
    const result = analyzeText(text);
    expect(result.hasRisk).toBe(true);
    expect(result.matches.some(m => m.type === 'github_token')).toBe(true);
  });

  it('detects JWT tokens', () => {
    const jwt = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiIxMjM0NTY3ODkwIiwibmFtZSI6IkpvaG4gRG9lIn0.SflKxwRJSMeKKF2QT4fwpMeJf36POk6yJV_adQssw5c';
    const result = analyzeText(jwt);
    expect(result.hasRisk).toBe(true);
    expect(result.matches.some(m => m.type === 'jwt_token')).toBe(true);
  });

  it('detects email addresses', () => {
    const text = 'Please contact john.doe@company-internal.com for access.';
    const result = analyzeText(text);
    expect(result.hasRisk).toBe(true);
    expect(result.matches.some(m => m.type === 'email')).toBe(true);
    expect(result.riskLevel).toBe('medium');
  });

  it('detects database connection strings', () => {
    const text = 'mongodb://admin:password123@internal.db.company.com:27017/production';
    const result = analyzeText(text);
    expect(result.hasRisk).toBe(true);
    expect(result.matches.some(m => m.type === 'connection_string')).toBe(true);
    expect(result.riskLevel).toBe('critical');
  });

  it('detects CONFIDENTIAL markers', () => {
    const text = 'CONFIDENTIAL: Q4 earnings forecast - do not share externally.';
    const result = analyzeText(text);
    expect(result.hasRisk).toBe(true);
    expect(result.matches.some(m => m.type === 'confidential_marker')).toBe(true);
    expect(result.riskLevel).toBe('high');
  });

  it('detects RSA private keys', () => {
    const text = '-----BEGIN RSA PRIVATE KEY-----\nMIIEpAIBAAKCAQEA0Z3VS...\n-----END RSA PRIVATE KEY-----';
    const result = analyzeText(text);
    expect(result.hasRisk).toBe(true);
    expect(result.matches.some(m => m.type === 'private_key')).toBe(true);
    expect(result.riskLevel).toBe('critical');
  });

  it('detects Stripe secret keys', () => {
    const text = 'STRIPE_SECRET_KEY=REMOVED_STRIPE_KEY';
    const result = analyzeText(text);
    expect(result.hasRisk).toBe(true);
    expect(result.matches.some(m => m.type === 'stripe_key')).toBe(true);
  });

  it('returns no risk for clean text', () => {
    const text = 'Can you help me write a function to sort an array in JavaScript?';
    const result = analyzeText(text);
    expect(result.hasRisk).toBe(false);
    expect(result.riskLevel).toBe('none');
    expect(result.matches).toHaveLength(0);
  });

  it('redacts all secrets from mixed text', () => {
    const text = 'Key: sk-testabcdefghijklmnopqrstuvwxyz123 and email: user@corp.com';
    const result = analyzeText(text);
    expect(result.hasRisk).toBe(true);
    expect(result.redactedText).not.toContain('sk-test');
    expect(result.redactedText).not.toContain('user@corp.com');
    expect(result.redactedText).toContain('[REDACTED:OPENAI_KEY]');
    expect(result.redactedText).toContain('[REDACTED:EMAIL]');
  });

  it('picks the highest severity level across multiple matches', () => {
    const text = 'Contact user@test.com or use key sk-testabcdefghijklmnopqrstuvwxyz12345';
    const result = analyzeText(text);
    expect(result.riskLevel).toBe('critical'); // openai_key wins over email (medium)
  });

  it('detects Google API keys', () => {
    const text = 'GOOGLE_KEY=AIzaSyABCDEFGHIJKLMNOPQRSTUVWXYZ123456';
    const result = analyzeText(text);
    expect(result.hasRisk).toBe(true);
    expect(result.matches.some(m => m.type === 'google_api_key')).toBe(true);
  });
});

// ─── Tool Registry Tests ──────────────────────────────────────────────────────

describe('detectToolByDomain', () => {
  it('detects ChatGPT', () => {
    expect(detectToolByDomain('chat.openai.com')?.id).toBe('chatgpt');
    expect(detectToolByDomain('chatgpt.com')?.id).toBe('chatgpt');
  });

  it('detects Claude', () => {
    expect(detectToolByDomain('claude.ai')?.id).toBe('claude');
  });

  it('detects Google Gemini', () => {
    expect(detectToolByDomain('gemini.google.com')?.id).toBe('gemini');
  });

  it('detects GitHub Copilot', () => {
    expect(detectToolByDomain('github.com')?.id).toBe('github_copilot');
    expect(detectToolByDomain('copilot.github.com')?.id).toBe('github_copilot');
  });

  it('detects Cursor AI', () => {
    expect(detectToolByDomain('cursor.com')?.id).toBe('cursor');
  });

  it('detects Perplexity', () => {
    expect(detectToolByDomain('perplexity.ai')?.id).toBe('perplexity');
  });

  it('detects Midjourney', () => {
    expect(detectToolByDomain('midjourney.com')?.id).toBe('midjourney');
    expect(detectToolByDomain('www.midjourney.com')?.id).toBe('midjourney');
  });

  it('detects Notion AI', () => {
    expect(detectToolByDomain('notion.so')?.id).toBe('notion_ai');
  });

  it('detects Microsoft Copilot 365', () => {
    expect(detectToolByDomain('copilot.microsoft.com')?.id).toBe('copilot_365');
  });

  it('returns null for non-AI domains', () => {
    expect(detectToolByDomain('google.com')).toBeNull();
    expect(detectToolByDomain('amazon.com')).toBeNull();
    expect(detectToolByDomain('twitter.com')).toBeNull();
    expect(detectToolByDomain('facebook.com')).toBeNull();
  });

  it('correctly classifies tool categories', () => {
    expect(detectToolByDomain('chat.openai.com')?.category).toBe('llm_chat');
    expect(detectToolByDomain('cursor.com')?.category).toBe('coding_assistant');
    expect(detectToolByDomain('perplexity.ai')?.category).toBe('research_tool');
    expect(detectToolByDomain('notion.so')?.category).toBe('writing_tool');
    expect(detectToolByDomain('midjourney.com')?.category).toBe('image_generation');
    expect(detectToolByDomain('copilot.microsoft.com')?.category).toBe('enterprise_ai');
  });

  it('handles www prefix stripping', () => {
    expect(detectToolByDomain('www.cursor.com')?.id).toBe('cursor');
    expect(detectToolByDomain('www.perplexity.ai')?.id).toBe('perplexity');
  });

  it('detects Replit as high risk', () => {
    const tool = detectToolByDomain('replit.com');
    expect(tool?.id).toBe('replit_ai');
    expect(tool?.defaultRiskLevel).toBe('high');
  });
});
