/**
 * DayBy MCP — device authorization flow.
 *
 * Usage:
 *   dayby-mcp auth           → interactive OAuth-style flow, saves token
 *   dayby-mcp auth --logout  → clears saved credentials
 */

import * as fs from 'fs';
import * as os from 'os';
import * as path from 'path';
import { exec } from 'child_process';

// --- Config ---

const DEFAULT_API_URL = 'https://dayby.dev';
const CREDENTIALS_DIR = path.join(os.homedir(), '.dayby');
const CREDENTIALS_FILE = path.join(CREDENTIALS_DIR, 'credentials.json');
const POLL_INTERVAL_MS = 2000;

// --- Types ---

interface Credentials {
  token: string;
  api_url: string;
}

// --- Storage ---

export function loadCredentials(): Credentials | null {
  try {
    return JSON.parse(fs.readFileSync(CREDENTIALS_FILE, 'utf-8')) as Credentials;
  } catch {
    return null;
  }
}

function saveCredentials(creds: Credentials): void {
  fs.mkdirSync(CREDENTIALS_DIR, { recursive: true });
  fs.writeFileSync(CREDENTIALS_FILE, JSON.stringify(creds, null, 2), { mode: 0o600 });
}

export function clearCredentials(): void {
  try {
    fs.unlinkSync(CREDENTIALS_FILE);
    console.log('Logged out. Credentials cleared.');
  } catch {
    console.log('No credentials found.');
  }
}

export function getStoredToken(apiUrl = DEFAULT_API_URL): string | null {
  const creds = loadCredentials();
  if (!creds) return null;
  // If the stored token is for a different server, ignore it
  if (creds.api_url !== apiUrl) return null;
  return creds.token;
}

// --- Browser ---

function openBrowser(url: string): void {
  const display = process.env.DISPLAY || ':0';
  const cmd =
    process.platform === 'darwin' ? `open "${url}"` :
    process.platform === 'win32'  ? `start "" "${url}"` :
                                    `DISPLAY=${display} xdg-open "${url}"`;
  exec(cmd, (err) => {
    if (err) {
      console.error(`Could not open browser: ${err.message}`);
      console.log(`Please open this URL manually:\n  ${url}`);
    }
  });
}

// --- Poll ---

async function pollForToken(apiUrl: string, code: string): Promise<string> {
  const url = `${apiUrl}/api/v2/auth/device/${code}`;

  for (;;) {
    await new Promise(r => setTimeout(r, POLL_INTERVAL_MS));

    const res = await fetch(url);

    if (res.status === 200) {
      const data = await res.json() as { token: string };
      return data.token;
    }

    if (res.status === 410) {
      throw new Error('Authorization expired. Please run `dayby-mcp auth` again.');
    }

    if (res.status !== 202) {
      throw new Error(`Unexpected response while waiting for authorization (${res.status}).`);
    }

    // 202 = still pending, keep polling
  }
}

// --- Main flow ---

export async function runAuthFlow(apiUrl = DEFAULT_API_URL): Promise<void> {
  console.log('\n🔐 DayBy Authentication\n');
  console.log(`Connecting to ${apiUrl}...`);

  // 1. Request a device code
  const res = await fetch(`${apiUrl}/api/v2/auth/device`, { method: 'POST' });
  if (!res.ok) {
    console.error(`\n❌ Could not reach DayBy (HTTP ${res.status}). Check your connection.\n`);
    process.exit(1);
  }

  const { code, verification_uri, expires_in } = await res.json() as {
    code: string;
    verification_uri: string;
    expires_in: number;
  };

  const expiresMinutes = Math.round(expires_in / 60);

  // 2. Open browser
  console.log('Opening DayBy in your browser...\n');
  console.log(`  URL:  ${verification_uri}`);
  console.log(`  Code: ${code}`);
  console.log(`  Expires in ${expiresMinutes} minutes\n`);
  openBrowser(verification_uri);

  // 3. Poll until the user clicks Authorize
  console.log('Waiting for you to authorize in the browser...');
  const token = await pollForToken(apiUrl, code);

  // 4. Save
  saveCredentials({ token, api_url: apiUrl });
  console.log('\n✅ Authenticated! You can now use DayBy MCP.\n');
}
