#!/usr/bin/env node

/**
 * DayBy MCP Server
 *
 * Post your dev progress from Claude, Cursor, or any MCP client.
 * All content is sanitized locally before it ever touches the network.
 *
 * Flow: draft_post → review → publish_post (nothing leaves without approval)
 */

import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { z } from 'zod';
import { Sanitizer, type SanitizerConfig } from './sanitizer.js';
import { DayByClient } from './dayby-client.js';
import * as fs from 'fs';
import * as path from 'path';

// --- Configuration ---

interface Config {
  apiUrl: string;
  apiKey: string;
  sanitizer: Partial<SanitizerConfig>;
}

function loadConfig(): Config {
  // 1. Check env vars
  const apiUrl = process.env.DAYBY_API_URL || 'https://dayby.dev';
  const apiKey = process.env.DAYBY_API_KEY || '';

  // 2. Load sanitizer config from file if it exists
  let sanitizerConfig: Partial<SanitizerConfig> = {};
  const configPaths = [
    path.join(process.env.HOME || '~', '.dayby', 'sanitizer.json'),
    path.join(process.cwd(), '.dayby-sanitizer.json'),
  ];

  for (const configPath of configPaths) {
    try {
      const raw = fs.readFileSync(configPath, 'utf-8');
      sanitizerConfig = JSON.parse(raw);
      break;
    } catch {
      // File doesn't exist, that's fine
    }
  }

  // 3. Also load from env (comma-separated)
  if (process.env.DAYBY_BLOCKED_TERMS) {
    sanitizerConfig.blockedTerms = [
      ...(sanitizerConfig.blockedTerms || []),
      ...process.env.DAYBY_BLOCKED_TERMS.split(',').map(s => s.trim()),
    ];
  }
  if (process.env.DAYBY_BLOCKED_DOMAINS) {
    sanitizerConfig.blockedDomains = [
      ...(sanitizerConfig.blockedDomains || []),
      ...process.env.DAYBY_BLOCKED_DOMAINS.split(',').map(s => s.trim()),
    ];
  }

  return { apiUrl, apiKey, sanitizer: sanitizerConfig };
}

// --- Draft Store (in-memory, local only) ---

interface Draft {
  id: string;
  originalContent: string;
  sanitizedTitle: string;
  sanitizedContent: string;
  strippedItems: string[];
  createdAt: Date;
}

const drafts = new Map<string, Draft>();

function generateDraftId(): string {
  return `draft_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
}

// --- Main ---

async function main() {
  const config = loadConfig();
  const sanitizer = new Sanitizer(config.sanitizer);
  const client = new DayByClient({ apiUrl: config.apiUrl, apiKey: config.apiKey });

  const server = new McpServer({
    name: 'dayby',
    version: '0.1.0',
  });

  // ========================================
  // Tool: draft_post
  // Sanitizes content locally, returns preview. NOTHING leaves the machine.
  // ========================================
  server.tool(
    'draft_post',
    'Create a sanitized draft of a dev progress post. Content is cleaned locally — nothing is sent to the network. Returns a preview for the user to review before publishing.',
    {
      title: z.string().describe('Post title — focus on the technology/skill learned'),
      content: z.string().describe('Post content — describe what you learned, built, or solved. The sanitizer will strip any sensitive data automatically.'),
      visibility: z.enum(['published', 'draft']).default('published').describe('Post visibility on DayBy'),
    },
    async ({ title, content, visibility }) => {
      // Sanitize both title and content locally
      const titleResult = sanitizer.sanitize(title);
      const contentResult = sanitizer.sanitize(content);

      const allStripped = [...titleResult.stripped, ...contentResult.stripped];
      const draftId = generateDraftId();

      const draft: Draft = {
        id: draftId,
        originalContent: content,
        sanitizedTitle: titleResult.clean,
        sanitizedContent: contentResult.clean,
        strippedItems: allStripped,
        createdAt: new Date(),
      };
      drafts.set(draftId, draft);

      // Build response
      let response = `📝 **Draft Preview** (ID: ${draftId})\n\n`;
      response += `**Title:** ${draft.sanitizedTitle}\n\n`;
      response += `**Content:**\n${draft.sanitizedContent}\n\n`;
      response += `**Visibility:** ${visibility}\n`;

      if (allStripped.length > 0) {
        response += `\n⚠️ **Sanitizer removed ${allStripped.length} sensitive item(s):**\n`;
        for (const item of allStripped.slice(0, 10)) {
          response += `  • ${item}\n`;
        }
        if (allStripped.length > 10) {
          response += `  • ...and ${allStripped.length - 10} more\n`;
        }
      } else {
        response += `\n✅ No sensitive data detected.\n`;
      }

      response += `\n👉 Review the above. If it looks good, use **publish_post** with draft ID: \`${draftId}\``;
      response += `\n💡 You can also use **edit_draft** to modify before publishing.`;

      return { content: [{ type: 'text' as const, text: response }] };
    }
  );

  // ========================================
  // Tool: edit_draft
  // Modify a draft before publishing
  // ========================================
  server.tool(
    'edit_draft',
    'Edit a draft post before publishing. Provide updated title and/or content — they will be re-sanitized locally.',
    {
      draft_id: z.string().describe('The draft ID from draft_post'),
      title: z.string().optional().describe('Updated title (will be re-sanitized)'),
      content: z.string().optional().describe('Updated content (will be re-sanitized)'),
    },
    async ({ draft_id, title, content }) => {
      const draft = drafts.get(draft_id);
      if (!draft) {
        return {
          content: [{ type: 'text' as const, text: `❌ Draft not found: ${draft_id}. Use draft_post to create a new one.` }],
        };
      }

      if (title) {
        const result = sanitizer.sanitize(title);
        draft.sanitizedTitle = result.clean;
        draft.strippedItems.push(...result.stripped);
      }

      if (content) {
        const result = sanitizer.sanitize(content);
        draft.sanitizedContent = result.clean;
        draft.originalContent = content;
        draft.strippedItems.push(...result.stripped);
      }

      let response = `✏️ **Draft Updated** (ID: ${draft_id})\n\n`;
      response += `**Title:** ${draft.sanitizedTitle}\n\n`;
      response += `**Content:**\n${draft.sanitizedContent}\n\n`;
      response += `\n👉 Use **publish_post** with draft ID: \`${draft_id}\` when ready.`;

      return { content: [{ type: 'text' as const, text: response }] };
    }
  );

  // ========================================
  // Tool: publish_post
  // Only NOW does data leave the machine — and only the sanitized version.
  // ========================================
  server.tool(
    'publish_post',
    'Publish a previously drafted post to DayBy. Only the sanitized version is sent — the original content never leaves your machine.',
    {
      draft_id: z.string().describe('The draft ID from draft_post'),
      generate_article: z.boolean().default(false).describe('Also generate an AI-formatted article on DayBy after publishing'),
    },
    async ({ draft_id, generate_article }) => {
      const draft = drafts.get(draft_id);
      if (!draft) {
        return {
          content: [{ type: 'text' as const, text: `❌ Draft not found: ${draft_id}. Use draft_post to create a new one.` }],
        };
      }

      if (!config.apiKey) {
        return {
          content: [{
            type: 'text' as const,
            text: '❌ No API key configured. Set DAYBY_API_KEY environment variable or add it to your MCP config.',
          }],
        };
      }

      try {
        // Only the sanitized content is sent
        const result = await client.createPost({
          title: draft.sanitizedTitle,
          content: draft.sanitizedContent,
        });

        let response = `✅ **Published to DayBy!**\n\n`;
        response += `**Title:** ${result.post.title}\n`;
        response += `**URL:** ${result.post.url}\n`;
        response += `**Slug:** ${result.post.slug}\n`;

        if (generate_article && result.post.slug) {
          try {
            await client.generateArticle(result.post.slug);
            response += `\n🤖 AI article generation triggered.`;
          } catch (e) {
            response += `\n⚠️ Article generation failed: ${e instanceof Error ? e.message : 'Unknown error'}`;
          }
        }

        // Clean up draft
        drafts.delete(draft_id);

        return { content: [{ type: 'text' as const, text: response }] };
      } catch (e) {
        return {
          content: [{
            type: 'text' as const,
            text: `❌ Failed to publish: ${e instanceof Error ? e.message : 'Unknown error'}`,
          }],
        };
      }
    }
  );

  // ========================================
  // Tool: list_posts
  // ========================================
  server.tool(
    'list_posts',
    'List your recent DayBy posts.',
    {
      page: z.number().default(1).describe('Page number'),
      per_page: z.number().default(10).describe('Posts per page'),
    },
    async ({ page, per_page }) => {
      if (!config.apiKey) {
        return {
          content: [{ type: 'text' as const, text: '❌ No API key configured.' }],
        };
      }

      try {
        const result = await client.listPosts(page, per_page);
        let response = `📋 **Your DayBy Posts** (page ${result.meta.page}/${result.meta.total_pages}, ${result.meta.total} total)\n\n`;

        for (const post of result.posts) {
          response += `• **${post.title}** — ${post.url}\n`;
          response += `  ${post.content.slice(0, 100)}${post.content.length > 100 ? '...' : ''}\n`;
          response += `  _${post.created_at.slice(0, 10)} · ${post.visibility}_\n\n`;
        }

        return { content: [{ type: 'text' as const, text: response }] };
      } catch (e) {
        return {
          content: [{
            type: 'text' as const,
            text: `❌ Failed to list posts: ${e instanceof Error ? e.message : 'Unknown error'}`,
          }],
        };
      }
    }
  );

  // ========================================
  // Tool: check_content
  // Dry-run sanitization — see what would get stripped without creating a draft.
  // ========================================
  server.tool(
    'check_content',
    'Check if content contains sensitive data without creating a draft. Useful for quick checks before writing a post.',
    {
      text: z.string().describe('Text to check for sensitive content'),
    },
    async ({ text }) => {
      const result = sanitizer.check(text);

      if (result.safe) {
        return {
          content: [{ type: 'text' as const, text: '✅ No sensitive data detected. Safe to post.' }],
        };
      }

      let response = `⚠️ **Found ${result.issues.length} sensitive item(s):**\n\n`;
      for (const issue of result.issues) {
        response += `  • ${issue}\n`;
      }
      response += `\nUse **draft_post** to create a sanitized version.`;

      return { content: [{ type: 'text' as const, text: response }] };
    }
  );

  // --- Start server ---
  const transport = new StdioServerTransport();
  await server.connect(transport);
}

main().catch(console.error);
