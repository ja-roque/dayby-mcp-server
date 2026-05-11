import { describe, it, expect } from 'vitest';
import { Sanitizer } from './sanitizer.js';

describe('Sanitizer', () => {
  const sanitizer = new Sanitizer();

  describe('default patterns', () => {
    it('strips API keys', () => {
      const fakeKey = 'xk_test_' + 'a1b2c3d4e5f6g7h8i9j0k1l2';
      const result = sanitizer.sanitize(`My api_key=${fakeKey}`);
      expect(result.clean).not.toContain(fakeKey);
      expect(result.stripped.length).toBeGreaterThan(0);
    });

    it('strips AWS access keys', () => {
      const result = sanitizer.sanitize('Key: AKIAIOSFODNN7EXAMPLE');
      expect(result.clean).not.toContain('AKIAIOSFODNN7EXAMPLE');
    });

    it('strips private IPs', () => {
      const result = sanitizer.sanitize('Server at 192.168.1.100');
      expect(result.clean).not.toContain('192.168.1.100');
      expect(result.clean).toContain('[REDACTED]');
    });

    it('strips email addresses', () => {
      const result = sanitizer.sanitize('Contact me at user@company.com');
      expect(result.clean).not.toContain('user@company.com');
    });

    it('strips database URLs', () => {
      const result = sanitizer.sanitize('postgres://user:pass@localhost/db');
      expect(result.clean).not.toContain('postgres://');
    });

    it('strips file paths with usernames', () => {
      const result = sanitizer.sanitize('File at /home/javier/project');
      expect(result.clean).not.toContain('/home/javier');
    });

    it('strips JWT tokens', () => {
      const result = sanitizer.sanitize('Token: eyJhbGciOiJIUzI1NiJ9.eyJ1c2VyX2lkIjoxfQ.abc123def456');
      expect(result.clean).not.toContain('eyJhbGci');
    });

    it('strips GitHub tokens', () => {
      const result = sanitizer.sanitize('ghp_ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijkl');
      expect(result.clean).not.toContain('ghp_');
    });
  });

  describe('safe content', () => {
    it('leaves clean text untouched', () => {
      const text = 'I built a feature using React and TypeScript today.';
      const result = sanitizer.sanitize(text);
      expect(result.clean).toBe(text);
      expect(result.stripped).toHaveLength(0);
    });

    it('leaves public IPs alone', () => {
      const result = sanitizer.sanitize('Server at 8.8.8.8');
      expect(result.clean).toContain('8.8.8.8');
    });
  });

  describe('blocked terms', () => {
    it('strips configured blocked terms', () => {
      const s = new Sanitizer({ blockedTerms: ['Acme Corp'] });
      const result = s.sanitize('Working on the Acme Corp project');
      expect(result.clean).not.toContain('Acme Corp');
    });

    it('strips blocked names', () => {
      const s = new Sanitizer({ blockedNames: ['John Doe'] });
      const result = s.sanitize('Paired with John Doe on the fix');
      expect(result.clean).not.toContain('John Doe');
    });
  });

  describe('blocked domains', () => {
    it('strips blocked domain URLs', () => {
      const s = new Sanitizer({ blockedDomains: ['internal.corp.com'] });
      const result = s.sanitize('Check https://jira.internal.corp.com/browse/TICK-123');
      expect(result.clean).not.toContain('internal.corp.com');
      expect(result.clean).toContain('[REDACTED-URL]');
    });
  });

  describe('check', () => {
    it('returns safe for clean content', () => {
      const result = sanitizer.check('Just a normal post about coding.');
      expect(result.safe).toBe(true);
      expect(result.issues).toHaveLength(0);
    });

    it('returns unsafe for sensitive content', () => {
      const result = sanitizer.check('My api_key=super_secret_key_1234567890');
      expect(result.safe).toBe(false);
      expect(result.issues.length).toBeGreaterThan(0);
    });
  });
});
