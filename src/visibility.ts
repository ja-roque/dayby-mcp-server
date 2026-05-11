/**
 * Visibility mapping between MCP (user-facing) and DayBy API values.
 *
 * MCP uses "published"/"draft" (intuitive for users).
 * DayBy API uses "publik"/"draft"/"hidden" (Rails enum).
 */

export function toApiVisibility(v: string): string {
  return v === 'published' ? 'publik' : v;
}

export function fromApiVisibility(v: string): string {
  return v === 'publik' ? 'published' : v;
}
