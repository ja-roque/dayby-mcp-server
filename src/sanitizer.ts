/**
 * Local sanitization layer — strips sensitive data BEFORE anything leaves the machine.
 * Runs entirely offline. No network calls.
 */

export interface SanitizerConfig {
  /** Company/org names to strip */
  blockedTerms: string[];
  /** Internal domains (e.g., "internal.corp.com") */
  blockedDomains: string[];
  /** Teammate/people names to strip */
  blockedNames: string[];
  /** Custom regex patterns to strip */
  customPatterns: string[];
}

const DEFAULT_PATTERNS: RegExp[] = [
  // API keys & tokens
  /(?:api[_-]?key|token|secret|password|bearer)\s*[:=]\s*['"]?[A-Za-z0-9_\-/.+]{16,}['"]?/gi,
  // AWS ARNs
  /arn:aws:[a-z0-9\-]+:[a-z0-9\-]*:\d{12}:[a-zA-Z0-9\-_/:.]+/g,
  // AWS access keys
  /(?:AKIA|ABIA|ACCA|ASIA)[A-Z0-9]{16}/g,
  // Private IPs
  /\b(?:10\.\d{1,3}\.\d{1,3}\.\d{1,3}|172\.(?:1[6-9]|2\d|3[01])\.\d{1,3}\.\d{1,3}|192\.168\.\d{1,3}\.\d{1,3})\b/g,
  // Email addresses
  /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g,
  // SSH keys
  /ssh-(?:rsa|ed25519|ecdsa)\s+[A-Za-z0-9+/=]{40,}/g,
  // JWT tokens
  /eyJ[A-Za-z0-9_-]{10,}\.eyJ[A-Za-z0-9_-]{10,}\.[A-Za-z0-9_-]+/g,
  // GitHub tokens
  /gh[ps]_[A-Za-z0-9_]{36,}/g,
  // Generic secrets in env-like format
  /[A-Z_]{3,}=["']?[A-Za-z0-9+/=_\-]{20,}["']?/g,
  // Database URLs
  /(?:postgres|mysql|mongodb|redis):\/\/[^\s"']+/gi,
  // File paths with usernames
  /\/(?:home|Users)\/[a-zA-Z0-9._-]+/g,
];

export class Sanitizer {
  private config: SanitizerConfig;
  private compiledBlockedTerms: RegExp[];
  private compiledCustomPatterns: RegExp[];

  constructor(config: Partial<SanitizerConfig> = {}) {
    this.config = {
      blockedTerms: config.blockedTerms || [],
      blockedDomains: config.blockedDomains || [],
      blockedNames: config.blockedNames || [],
      customPatterns: config.customPatterns || [],
    };

    // Compile blocked terms into case-insensitive regexes with word boundaries
    this.compiledBlockedTerms = [
      ...this.config.blockedTerms,
      ...this.config.blockedNames,
    ]
      .filter(t => t.length > 0)
      .map(term => new RegExp(`\\b${escapeRegex(term)}\\b`, 'gi'));

    this.compiledCustomPatterns = this.config.customPatterns
      .filter(p => p.length > 0)
      .map(p => new RegExp(p, 'gi'));
  }

  /**
   * Sanitize text locally. Returns the cleaned text and a list of what was stripped.
   */
  sanitize(text: string): { clean: string; stripped: string[] } {
    const stripped: string[] = [];
    let clean = text;

    // 1. Strip default sensitive patterns
    for (const pattern of DEFAULT_PATTERNS) {
      const matches = clean.match(pattern);
      if (matches) {
        stripped.push(...matches.map(m => `[pattern: ${m.slice(0, 20)}...]`));
        clean = clean.replace(pattern, '[REDACTED]');
      }
    }

    // 2. Strip blocked domains
    for (const domain of this.config.blockedDomains) {
      const domainRegex = new RegExp(
        `(?:https?://)?(?:[a-z0-9-]+\\.)*${escapeRegex(domain)}[/\\w.-]*`,
        'gi'
      );
      const matches = clean.match(domainRegex);
      if (matches) {
        stripped.push(...matches.map(m => `[domain: ${domain}]`));
        clean = clean.replace(domainRegex, '[REDACTED-URL]');
      }
    }

    // 3. Strip blocked terms and names
    for (const termRegex of this.compiledBlockedTerms) {
      const matches = clean.match(termRegex);
      if (matches) {
        stripped.push(...matches.map(m => `[term: ${m}]`));
        clean = clean.replace(termRegex, '[REDACTED]');
      }
    }

    // 4. Strip custom patterns
    for (const pattern of this.compiledCustomPatterns) {
      const matches = clean.match(pattern);
      if (matches) {
        stripped.push(...matches.map(m => `[custom: ${m.slice(0, 20)}...]`));
        clean = clean.replace(pattern, '[REDACTED]');
      }
    }

    // 5. Clean up multiple consecutive [REDACTED] tags
    clean = clean.replace(/(\[REDACTED(?:-URL)?\]\s*){2,}/g, '[REDACTED] ');

    return { clean: clean.trim(), stripped };
  }

  /**
   * Check if text contains any blocked content without modifying it.
   */
  check(text: string): { safe: boolean; issues: string[] } {
    const { stripped } = this.sanitize(text);
    return { safe: stripped.length === 0, issues: stripped };
  }
}

function escapeRegex(str: string): string {
  return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}
