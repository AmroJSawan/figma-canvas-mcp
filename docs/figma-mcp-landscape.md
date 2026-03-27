# Figma MCP Landscape — Official + Community

> Research compiled March 2026. Covers all known MCP approaches for Figma integration with AI agents.
> Last enriched: March 24 2026 via live research (GitHub blog, Figma help center, upstream repo).

---

## Overview

There are three distinct approaches to connecting AI agents to Figma, each with different trade-offs:

| Approach | Access | Requires | Read | Write | Free plan |
|---|---|---|---|---|---|
| Official Figma MCP (remote) | REST API | Figma account | Yes | Limited | Yes (6 calls/month) |
| Official Figma MCP (desktop) | REST API + Desktop | Dev/Full seat on paid plan | Yes | Limited | No |
| Community WebSocket bridge (e.g. figma-console-mcp) | Plugin API (live canvas) | Desktop + plugin running | Yes | Full | Yes |
| Browser CDP approach | Plugin API via DevTools | Chrome + browser MCP | Yes | Full | Yes |

---

## Official Figma MCP Server

### Installation

**Claude Code (recommended):**
```bash
claude plugin install figma@claude-plugins-official
```

**Remote server (any client):**
```bash
# VS Code: Cmd+Shift+P → MCP:Add Server → HTTP → paste URL
# Cursor: /add-plugin figma
# Claude Code:
claude mcp add --transport http figma https://mcp.figma.com/mcp
```

### Available Tools

| Tool | Purpose |
|---|---|
| `get_design_context` | Structured design representation for code generation (primary tool) |
| `get_variable_defs` | Extracts variables, colors, spacing, typography |
| `get_code_connect_map` | Maps Figma nodes to code components (Code Connect) |
| `get_screenshot` | Visual reference of selection |
| `get_metadata` | XML layer representation with properties |
| `get_figjam` | FigJam board content |
| `create_design_system_rules` | Generates guidance files for consistent output |
| `generate_figma_design` | Creates Figma designs from web pages (rolling out) |
| `generate_diagram` | FigJam diagram generation from description |

### Rate Limits

| Plan | Limit |
|---|---|
| Starter / View / Collab seats | 6 tool calls per month |
| Dev / Full seats (Professional+) | Per-minute limits matching REST API Tier 1 |

### What It Can and Cannot Do

**Can:**
- Read design context, variables, components from Figma files
- Generate code from selected frames (default: React + Tailwind)
- Leverage Code Connect to map Figma components to codebase components
- Capture screenshots of selections
- Create FigJam diagrams

**Cannot (as of March 2026):**
- Access live plugin runtime state
- Work without a Figma account
- Code-to-canvas on the desktop server (remote only)

### New: Write Capabilities (March 2026)

As of March 6 2026, the official remote Figma MCP server gained a write capability:

**UI-to-Figma layer generation:** Capture live web UI (production, staging, or localhost URL) and
send it to Figma as editable design layers. Available in:
- VS Code + GitHub Copilot
- Claude Code
- Codex by OpenAI

Requires the **remote** MCP server (`mcp.figma.com`), not the desktop local server. Available on
all Figma plans and seats (no Dev Mode seat required).

This narrows the gap between the official MCP and the community WebSocket bridge, but full Plugin
API write access (variables CRUD, node manipulation, design system tooling, component operations)
remains exclusive to the bridge approach.

### Code Connect

Figma's Code Connect maps design components to their code equivalents. When set up, `get_design_context` returns code snippets from your actual codebase instead of generated React/Tailwind. This is the correct workflow for production codebases.

---

## Community: figma-console-mcp (WebSocket Bridge)

This is the architecture used by the `figma-canvas-mcp` project in this repo.

### Architecture

```
Claude / AI Agent
      |
  MCP Server (Node.js, local)
      |
  WebSocket (ports 9223-9232)
      |
  Figma Desktop Bridge Plugin (code.js in Figma sandbox)
      |
  Figma Plugin API (full read/write access)
```

The plugin runs in Figma's QuickJS sandbox and relays commands from the MCP server. The MCP server also makes direct Figma REST API calls for read operations that don't need live canvas state.

### Key Advantage Over Official MCP

- **Full write access** to the Figma canvas via Plugin API
- Works with any Figma account including free tier
- Live canvas state (sees changes before they're saved to cloud)
- Can execute arbitrary plugin JavaScript (`figma_execute`)
- No rate limits beyond what Figma Desktop can handle

### Available Tool Categories

1. **Execution**: `figma_execute` — arbitrary JS in plugin context
2. **Variables**: full CRUD (create, read, update, delete, batch)
3. **Components**: get, instantiate, search, library
4. **Node mutations**: resize, move, fills, strokes, clone, delete, rename, text
5. **Screenshots**: plugin-based `figma_capture_screenshot` (live state) + REST-based `figma_take_screenshot`
6. **Design system**: lint, design system kit, token browser, dashboard
7. **FigJam**: stickies, connectors, shapes, tables, code blocks, board contents
8. **Slides**: full slide management

### Limitations

- Requires Figma Desktop running with plugin active
- Plugin must be loaded in each file before use
- Node IDs are session-specific (stale after Figma restart)
- No built-in `GET_NODE_STATE` — reading fills + variable bindings requires `figma_execute`
- `figma_set_fills` accepts only hex strings — no variable binding support in the tool schema
- **macOS port bug:** Port advertisement files may be written to `$TMPDIR` instead of `/tmp`, causing silent connection failures (open issue on upstream repo)
- **Pattern fill crash:** `node.fills = ...` throws on files with PATTERN fills — must migrate to `setFillsAsync()`

---

## Community: claude-talk-to-figma-mcp

Similar WebSocket bridge architecture. Key differences from figma-console-mcp:

- Simpler, more focused scope
- Works with Claude Desktop, Claude Code, Cursor, Windsurf, VS Code + Copilot, Cline, Roo Code
- No built-in batch operations or design system dashboard
- Channel-ID based connection model

**Repo:** https://github.com/arinspunk/claude-talk-to-figma-mcp

---

## Community: Browser CDP Approach

Discovered by [@cianfrani](https://cianfrani.dev/posts/a-better-figma-mcp/). Uses Chrome DevTools Protocol instead of a dedicated plugin:

```bash
claude mcp add chrome-devtools npx chrome-devtools-mcp@latest
```

**How it works:**
1. User opens Figma in Chrome
2. Agent accesses `figma` global object via CDP
3. Agent executes Plugin API JavaScript directly through the browser

**Advantages:** No plugin infrastructure, no WebSocket server, single dependency.

**Limitation:** The `figma` global isn't available until a plugin has been opened once in the file. Requires user to open any plugin first.

---

## Figma REST API — Relevant Endpoints

### Variables (Enterprise)
```
GET /v1/files/:file_key/variables/local
```
Returns `meta.variableCollections` and `meta.variables`. Requires Enterprise plan for full variables API; some fallback via Styles API on other plans.

### File Data
```
GET /v1/files/:file_key?depth=N&geometry=paths
GET /v1/files/:file_key/nodes?ids=1:2,3:4
```

### Components & Styles
```
GET /v1/files/:file_key/components
GET /v1/files/:file_key/styles
```

### REST API Changes (2024-2026)

**New:**
- Extended collections: `parentVariableCollectionId`, `isExtension`, `variableOverrides`
- Variable code syntax support
- Library analytics (daily updates): component/style/variable usage counts
- GET file metadata (without full content)
- Webhook v2 with `DEV_MODE_STATUS_UPDATE` event

**Deprecated/Removed:**
- `files:read` scope → use granular scopes (`file_content:read`)
- Non-expiring Personal Access Tokens (now 90-day max, requires scopes)
- `GET /v2/teams/:team_id/webhooks` → use context-based `GET /v2/webhooks`
- `containingStateGroup` → `containingComponentSet`
- `preserveRatio` → `targetAspectRatio`
- HTTP requests now return 403 — HTTPS required

**Breaking (Oct 2024, Library Analytics):**
- `num_instances` → `usages`
- `num_teams_using` → `teams_using`
- `num_files_using` → `files_using`

---

## Choosing the Right Approach

| Use case | Recommended |
|---|---|
| Read design context, generate code | Official Figma MCP |
| Full canvas automation, design system maintenance | WebSocket bridge (figma-console-mcp / figma-canvas-mcp) |
| Quick ad-hoc automation without setup | Browser CDP approach |
| Production codebase integration with Code Connect | Official Figma MCP + Code Connect |
| Free account, full write access | WebSocket bridge |

---

## Sources

- [Official Figma MCP Guide (Help Center)](https://help.figma.com/hc/en-us/articles/32132100833559-Guide-to-the-Figma-MCP-server)
- [Official Figma MCP GitHub Guide](https://github.com/figma/mcp-server-guide)
- [Figma Blog: Claude Code to Figma](https://www.figma.com/blog/introducing-claude-code-to-figma/)
- [Claude Code + Figma MCP Server (Builder.io)](https://www.builder.io/blog/claude-code-figma-mcp-server)
- [Connect Claude Code to MCP](https://code.claude.com/docs/en/mcp)
- [claude-talk-to-figma-mcp (GitHub)](https://github.com/arinspunk/claude-talk-to-figma-mcp)
- [A Better Figma MCP (cianfrani.dev)](https://cianfrani.dev/posts/a-better-figma-mcp/)
- [Figma REST API Changelog](https://developers.figma.com/docs/rest-api/changelog/)
- [Remote Server Installation](https://developers.figma.com/docs/figma-mcp-server/remote-server-installation/)
