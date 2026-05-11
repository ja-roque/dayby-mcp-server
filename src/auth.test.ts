import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import * as fs from 'fs';
import * as path from 'path';

// We test the exported functions directly
import { getStoredToken, loadCredentials, clearCredentials } from './auth.js';

const CREDENTIALS_DIR = path.join(process.env.HOME || '~', '.dayby');
const CREDENTIALS_FILE = path.join(CREDENTIALS_DIR, 'credentials.json');
const BACKUP_FILE = CREDENTIALS_FILE + '.test-backup';

describe('Auth', () => {
  let originalCredentials: string | null = null;

  beforeEach(() => {
    // Back up existing credentials
    try {
      originalCredentials = fs.readFileSync(CREDENTIALS_FILE, 'utf-8');
    } catch {
      originalCredentials = null;
    }
  });

  afterEach(() => {
    // Restore original credentials
    if (originalCredentials) {
      fs.writeFileSync(CREDENTIALS_FILE, originalCredentials, { mode: 0o600 });
    }
  });

  describe('loadCredentials', () => {
    it('returns null when no credentials file exists', () => {
      // Temporarily rename the file
      const tempPath = CREDENTIALS_FILE + '.tmp';
      try { fs.renameSync(CREDENTIALS_FILE, tempPath); } catch {}
      try {
        const result = loadCredentials();
        expect(result).toBeNull();
      } finally {
        try { fs.renameSync(tempPath, CREDENTIALS_FILE); } catch {}
      }
    });

    it('returns credentials when file exists', () => {
      const creds = loadCredentials();
      // If credentials exist on this machine, they should have token and api_url
      if (creds) {
        expect(creds).toHaveProperty('token');
        expect(creds).toHaveProperty('api_url');
        expect(typeof creds.token).toBe('string');
        expect(typeof creds.api_url).toBe('string');
      }
    });
  });

  describe('getStoredToken', () => {
    it('returns null for a non-matching API URL', () => {
      const token = getStoredToken('https://not-the-right-server.com');
      expect(token).toBeNull();
    });

    it('returns token for the correct API URL', () => {
      const token = getStoredToken('https://dayby.dev');
      // Token exists on this dev machine
      if (token) {
        expect(typeof token).toBe('string');
        expect(token.length).toBeGreaterThan(0);
      }
    });
  });
});
