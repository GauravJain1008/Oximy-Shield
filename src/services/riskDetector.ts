import { RiskLevel, RiskPattern } from '../types';

// ─── Risk Patterns ────────────────────────────────────────────────────────────

export const RISK_PATTERNS: RiskPattern[] = [
  // API Keys / Secrets
  {
    type: 'openai_key',
    label: 'OpenAI API Key',
    pattern: /sk-[a-zA-Z0-9]{20,60}/g,
    severity: 'critical',
    redactedValue: '[REDACTED:OPENAI_KEY]',
  },
  {
    type: 'aws_key',
    label: 'AWS Access Key',
    pattern: /AKIA[0-9A-Z]{16}/g,
    severity: 'critical',
    redactedValue: '[REDACTED:AWS_KEY]',
  },
  {
    type: 'aws_secret',
    label: 'AWS Secret Key',
    // Require explicit context — the key must follow a recognisable assignment.
    // The old bare /[a-zA-Z0-9/+]{40}/g matched every UUID, hash, and long word.
    pattern: /(?:aws_secret(?:_access)?_key|AWS_SECRET(?:_ACCESS)?_KEY)\s*[:=]\s*["']?([A-Za-z0-9/+=]{40})["']?/gi,
    severity: 'critical',
    redactedValue: '[REDACTED:AWS_SECRET]',
  },
  {
    type: 'anthropic_key',
    label: 'Anthropic API Key',
    pattern: /sk-ant-[a-zA-Z0-9\-_]{20,}/g,
    severity: 'critical',
    redactedValue: '[REDACTED:ANTHROPIC_KEY]',
  },
  {
    type: 'npm_token',
    label: 'npm Access Token',
    pattern: /npm_[a-zA-Z0-9]{36}/g,
    severity: 'critical',
    redactedValue: '[REDACTED:NPM_TOKEN]',
  },
  {
    type: 'bearer_token',
    label: 'Bearer Token',
    pattern: /Bearer\s+[a-zA-Z0-9\-._~+/]{20,}/g,
    severity: 'high',
    redactedValue: 'Bearer [REDACTED:TOKEN]',
  },
  {
    type: 'github_token',
    label: 'GitHub Token',
    pattern: /gh[pousr]_[A-Za-z0-9_]{36}/g,
    severity: 'critical',
    redactedValue: '[REDACTED:GITHUB_TOKEN]',
  },
  {
    type: 'google_api_key',
    label: 'Google API Key',
    pattern: /AIza[0-9A-Za-z-_]{35}/g,
    severity: 'critical',
    redactedValue: '[REDACTED:GOOGLE_KEY]',
  },
  {
    type: 'stripe_key',
    label: 'Stripe Secret Key',
    pattern: /sk_(?:live|test)_[0-9a-zA-Z]{24,}/g,
    severity: 'critical',
    redactedValue: '[REDACTED:STRIPE_KEY]',
  },
  {
    type: 'slack_token',
    label: 'Slack Token',
    pattern: /xox[baprs]-([0-9a-zA-Z]{10,48})/g,
    severity: 'high',
    redactedValue: '[REDACTED:SLACK_TOKEN]',
  },
  {
    type: 'jwt_token',
    label: 'JWT Token',
    pattern: /eyJ[a-zA-Z0-9_-]{10,}\.eyJ[a-zA-Z0-9_-]{10,}\.[a-zA-Z0-9_-]{10,}/g,
    severity: 'high',
    redactedValue: '[REDACTED:JWT]',
  },
  {
    type: 'private_key',
    label: 'Private Key',
    pattern: /-----BEGIN (?:RSA |EC |)PRIVATE KEY-----/g,
    severity: 'critical',
    redactedValue: '[REDACTED:PRIVATE_KEY]',
  },
  {
    type: 'password_field',
    label: 'Password-like String',
    pattern: /(?:password|passwd|pwd|secret)\s*[:=]\s*["']?([^\s"']{8,})/gi,
    severity: 'high',
    redactedValue: '[REDACTED:PASSWORD]',
  },
  {
    type: 'connection_string',
    label: 'Database Connection String',
    pattern: /(?:mongodb|postgresql|mysql|redis|mssql):\/\/[^\s"'<>]+/gi,
    severity: 'critical',
    redactedValue: '[REDACTED:DB_CONNECTION]',
  },
  // PII
  {
    type: 'email',
    label: 'Email Address',
    pattern: /\b[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}\b/g,
    severity: 'medium',
    redactedValue: '[REDACTED:EMAIL]',
  },
  {
    type: 'phone',
    label: 'Phone Number',
    pattern: /\b(?:\+?1[-.\s]?)?\(?[0-9]{3}\)?[-.\s]?[0-9]{3}[-.\s]?[0-9]{4}\b/g,
    severity: 'medium',
    redactedValue: '[REDACTED:PHONE]',
  },
  {
    type: 'ssn',
    label: 'Social Security Number',
    pattern: /\b\d{3}[-\s]?\d{2}[-\s]?\d{4}\b/g,
    severity: 'critical',
    redactedValue: '[REDACTED:SSN]',
  },
  {
    type: 'credit_card',
    label: 'Credit Card Number',
    pattern: /\b(?:4[0-9]{12}(?:[0-9]{3})?|5[1-5][0-9]{14}|3[47][0-9]{13}|6(?:011|5[0-9]{2})[0-9]{12})\b/g,
    severity: 'critical',
    redactedValue: '[REDACTED:CREDIT_CARD]',
  },
  // Code / Source
  {
    type: 'source_code',
    label: 'Source Code Snippet',
    pattern: /(?:function\s+\w+\s*\(|class\s+\w+\s*(?:extends|implements|{)|import\s+(?:{[^}]+}|\*)\s+from|const\s+\w+\s*=\s*(?:async\s+)?\(|module\.exports\s*=)/g,
    severity: 'medium',
    redactedValue: '[REDACTED:CODE]',
  },
  // Confidential markers
  {
    type: 'confidential_marker',
    label: 'Confidential Document Marker',
    pattern: /\b(?:CONFIDENTIAL|PROPRIETARY|TOP SECRET|INTERNAL ONLY|DO NOT SHARE|NDA)\b/gi,
    severity: 'high',
    redactedValue: '[REDACTED:CONFIDENTIAL]',
  },
  {
    type: 'ip_address',
    label: 'Internal IP Address',
    pattern: /\b(?:10\.\d{1,3}\.\d{1,3}\.\d{1,3}|172\.(?:1[6-9]|2\d|3[01])\.\d{1,3}\.\d{1,3}|192\.168\.\d{1,3}\.\d{1,3})\b/g,
    severity: 'low',
    redactedValue: '[REDACTED:INTERNAL_IP]',
  },
];

export interface DetectionResult {
  hasRisk: boolean;
  riskLevel: RiskLevel;
  matches: Array<{
    type: string;
    label: string;
    severity: RiskLevel;
    count: number;
  }>;
  redactedText: string;
}

const SEVERITY_ORDER: Record<RiskLevel, number> = {
  none: 0,
  low: 1,
  medium: 2,
  high: 3,
  critical: 4,
};

export function analyzeText(text: string): DetectionResult {
  const matchResults: DetectionResult['matches'] = [];
  let redactedText = text;
  let maxSeverity: RiskLevel = 'none';

  for (const pattern of RISK_PATTERNS) {
    // Reset pattern state
    pattern.pattern.lastIndex = 0;
    const matches = text.match(pattern.pattern);
    if (matches && matches.length > 0) {
      matchResults.push({
        type: pattern.type,
        label: pattern.label,
        severity: pattern.severity,
        count: matches.length,
      });
      if (SEVERITY_ORDER[pattern.severity] > SEVERITY_ORDER[maxSeverity]) {
        maxSeverity = pattern.severity;
      }
      // Redact the text
      pattern.pattern.lastIndex = 0;
      redactedText = redactedText.replace(pattern.pattern, pattern.redactedValue);
    }
  }

  return {
    hasRisk: matchResults.length > 0,
    riskLevel: maxSeverity,
    matches: matchResults,
    redactedText,
  };
}

export function scoreToRiskLevel(score: number): RiskLevel {
  if (score >= 80) return 'critical';
  if (score >= 60) return 'high';
  if (score >= 40) return 'medium';
  if (score >= 20) return 'low';
  return 'none';
}

export function riskLevelToScore(level: RiskLevel): number {
  const map: Record<RiskLevel, number> = {
    none: 0,
    low: 25,
    medium: 50,
    high: 75,
    critical: 95,
  };
  return map[level];
}

export const RISK_COLORS: Record<RiskLevel, string> = {
  none: '#10b981',
  low: '#84cc16',
  medium: '#f59e0b',
  high: '#f97316',
  critical: '#ef4444',
};

export const RISK_LABELS: Record<RiskLevel, string> = {
  none: 'No Risk',
  low: 'Low Risk',
  medium: 'Medium Risk',
  high: 'High Risk',
  critical: 'Critical',
};
