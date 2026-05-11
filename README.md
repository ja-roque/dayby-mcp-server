# @dayby/mcp-server

Post your dev progress to [DayBy.dev](https://dayby.dev) from Claude, Cursor, or any MCP client — with **local sanitization** so your company secrets never leave your machine.

## How It Works

```
draft_post → sanitized locally, never touches network
           → Claude shows you a clean preview
           → you approve
           → publish_post → DayBy API (sanitized content only)
```

**The raw context from your codebase never touches the network.** Only the sanitized, approved version gets published.

## Tools

| Tool | What it does | Touches network? |
|---|---|---|
| `draft_post` | Creates a sanitized draft from your description | No |
| `edit_draft` | Modify a draft before publishing | No |
| `check_content` | Dry-run: see what would get stripped | No |
| `publish_post` | Publish an approved draft to DayBy | Yes (sanitized only) |
| `list_posts` | List your recent DayBy posts | Yes |
| `get_post` | Fetch a single post by slug | Yes |
| `update_post` | Update title, content, or visibility | Yes |
| `delete_post` | Permanently delete a post | Yes |

## What Gets Stripped (Automatically)

- API keys, tokens, secrets
- AWS ARNs and access keys
- Private IP addresses
- Email addresses
- SSH keys, JWTs, GitHub tokens
- Database connection URLs
- File paths with usernames
- Plus anything you configure in blocklist

## Setup

### 1. Install

**Option A — npx (no install needed):**

```bash
npx @dayby/mcp-server
```

**Option B — global install:**

```bash
npm install -g @dayby/mcp-server
```

**Option C — from source:**

```bash
git clone https://github.com/ja-roque/dayby-mcp-server.git
cd dayby-mcp-server
npm install && npm run build
```

### 2. Authenticate

Run the auth command to connect your DayBy account:

```bash
dayby-mcp auth
```

This opens your browser for a one-click authorization. Your token is saved locally at `~/.dayby/credentials.json`.

To log out:

```bash
dayby-mcp auth --logout
```

Alternatively, you can set the `DAYBY_API_KEY` environment variable (from Settings > API on dayby.dev).

### 3. Add to your MCP client

**Claude Code (simplest):**

```bash
claude mcp add dayby -- dayby-mcp
```

Or with npx:

```bash
claude mcp add dayby -- npx @dayby/mcp-server
```

**Claude Desktop** (`claude_desktop_config.json`):

```json
{
  "mcpServers": {
    "dayby": {
      "command": "npx",
      "args": ["@dayby/mcp-server"]
    }
  }
}
```

**Cursor** (`.cursor/mcp.json`):

```json
{
  "mcpServers": {
    "dayby": {
      "command": "npx",
      "args": ["@dayby/mcp-server"]
    }
  }
}
```

### 4. Configure Sanitizer (Optional but Recommended)

Create `~/.dayby/sanitizer.json`:

```json
{
  "blockedTerms": ["YourCompany", "ProjectCodename"],
  "blockedDomains": ["internal.yourcompany.com"],
  "blockedNames": ["Your Boss Name"],
  "customPatterns": ["JIRA-\\d+", "INTERNAL-\\d+"]
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
| `DAYBY_API_KEY` | Your DayBy API key (alternative to `dayby-mcp auth`) | (none) |
| `DAYBY_API_URL` | DayBy API URL | `https://dayby.dev` |
| `DAYBY_BLOCKED_TERMS` | Comma-separated blocked terms | (none) |
| `DAYBY_BLOCKED_DOMAINS` | Comma-separated blocked domains | (none) |

## Troubleshooting

**`dayby-mcp: command not found` after global install**

Your npm global bin isn't in your PATH. Run:

```bash
source ~/.bashrc
```

Or add this to your `~/.bashrc` / `~/.zshrc`:

```bash
export PATH="$(npm bin -g):$PATH"
```

Then restart your terminal or run `source ~/.bashrc` again.

**MCP server not showing up in Claude**

Restart Claude Code / Claude Desktop after adding the MCP config.

**`Not authenticated` errors**

Run `dayby-mcp auth` to connect your account, or set `DAYBY_API_KEY` in your environment.

## License

MIT
