# @dayby/mcp-server

Post your dev progress to [DayBy.dev](https://dayby.dev) from Claude, Cursor, or any MCP client — with **local sanitization** so your company secrets never leave your machine.

## How It Works

```
You're coding with Claude → learn something cool →
  draft_post (sanitized locally, never touches network) →
  Claude shows you a clean preview →
  You say "ship it" →
  publish_post → DayBy API (only sanitized content sent)
```

**The raw context from your codebase never touches the network.** Only the sanitized, approved version gets published.

## Tools

| Tool | What it does | Touches network? |
|---|---|---|
| `draft_post` | Creates a sanitized draft from your description | ❌ No |
| `edit_draft` | Modify a draft before publishing | ❌ No |
| `check_content` | Dry-run: see what would get stripped | ❌ No |
| `publish_post` | Publish an approved draft to DayBy | ✅ Yes (sanitized only) |
| `list_posts` | List your recent DayBy posts | ✅ Yes |

## What Gets Stripped (Automatically)

- API keys, tokens, secrets
- AWS ARNs and access keys
- Private IP addresses
- Email addresses
- SSH keys, JWTs, GitHub tokens
- Database connection URLs
- File paths with usernames
- Plus anything you configure in blocklist ↓

## Setup

### 1. Get a DayBy API Key

1. Sign up at [dayby.dev](https://dayby.dev)
2. Go to Settings → API
3. Enable API access and generate a key

### 2. Configure Sanitizer (Optional but Recommended)

Create `~/.dayby/sanitizer.json`:

```json
{
  "blockedTerms": ["YourCompany", "ProjectCodename"],
  "blockedDomains": ["internal.yourcompany.com"],
  "blockedNames": ["Your Boss Name"],
  "customPatterns": ["JIRA-\\d+", "INTERNAL-\\d+"]
}
```

### 3. Install

```bash
npm install -g @dayby/mcp-server
```

### 4. Add to Claude Code / Claude Desktop / Cursor

**Claude Code (simplest):**
```bash
claude mcp add dayby -- dayby-mcp
```

**Claude Desktop** (`claude_desktop_config.json`):
```json
{
  "mcpServers": {
    "dayby": {
      "command": "dayby-mcp",
      "env": {
        "DAYBY_API_KEY": "your-api-key-here"
      }
    }
  }
}
```

**Cursor** (`.cursor/mcp.json`):
```json
{
  "mcpServers": {
    "dayby": {
      "command": "dayby-mcp",
      "env": {
        "DAYBY_API_KEY": "your-api-key-here"
      }
    }
  }
}
```

## Usage Examples

**While coding:**
> "I just figured out how to use PostgreSQL partial indexes to optimize a multi-tenant query. Draft a DayBy post about it."

**After a PR:**
> "I built a rate limiter using Redis sorted sets today. Post it to DayBy."

**Quick check:**
> "Check if this text has any sensitive data before I post it."

Claude will use `draft_post` to sanitize locally, show you a preview, and only publish when you approve.

## Environment Variables

| Variable | Description | Default |
|---|---|---|
| `DAYBY_API_KEY` | Your DayBy API key | (required) |
| `DAYBY_API_URL` | DayBy API URL | `https://dayby.dev` |
| `DAYBY_BLOCKED_TERMS` | Comma-separated blocked terms | (none) |
| `DAYBY_BLOCKED_DOMAINS` | Comma-separated blocked domains | (none) |

## License

MIT
