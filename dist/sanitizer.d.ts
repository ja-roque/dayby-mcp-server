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
export declare class Sanitizer {
    private config;
    private compiledBlockedTerms;
    private compiledCustomPatterns;
    constructor(config?: Partial<SanitizerConfig>);
    /**
     * Sanitize text locally. Returns the cleaned text and a list of what was stripped.
     */
    sanitize(text: string): {
        clean: string;
        stripped: string[];
    };
    /**
     * Check if text contains any blocked content without modifying it.
     */
    check(text: string): {
        safe: boolean;
        issues: string[];
    };
}
