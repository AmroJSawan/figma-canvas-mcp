# Figma Canvas MCP

[![MCP Compatible](https://img.shields.io/badge/MCP-Compatible-blue)](https://modelcontextprotocol.io/)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![Node.js 18+](https://img.shields.io/badge/Node.js-18%2B-green)](https://nodejs.org)

> **Your Figma canvas, controlled by AI.** A Model Context Protocol (MCP) server that gives AI assistants (Claude, Cursor, Windsurf, and more) full read/write access to Figma — extract design systems, create components, manage variables, build FigJam boards, and debug plugins in real time.

**Forked from [figma-console-mcp](https://github.com/southleft/figma-console-mcp)** with a non-overlapping port range (`9243–9252`) and a distinct plugin identity (`Figma Canvas Bridge`), so it runs cleanly **alongside** the original without any conflicts.

---

## Why This Fork?

If you already run `figma-console-mcp` and want a **second independent MCP+Figma pair** — for a different project, workspace, or AI client — this fork gives you exactly that:

| | figma-console-mcp | figma-canvas-mcp |
|---|---|---|
| Port range | 9223–9232 | **9243–9252** |
| Plugin name | Figma Desktop Bridge | **Figma Canvas Bridge** |
| Plugin ID | figma-desktop-bridge-mcp | **figma-canvas-bridge-mcp** |
| Stable config dir | `~/.figma-console-mcp/` | **`~/.figma-canvas-mcp/`** |
| Conflict-free coexistence | — | **Yes** |

Both can be registered simultaneously in Claude Code, Claude Desktop, Cursor, or any other MCP client. They will never step on each other.

---

## Features

- **84+ tools** spanning the full Figma surface area
- **Design system extraction** — variables, components, styles, and tokens with CSS/Tailwind export
- **AI-assisted design creation** — create frames, components, and layouts via natural language
- **Variable management** — full CRUD for design tokens, with batch operations (100 variables per call)
- **Real-time console monitoring** — stream plugin logs, errors, and stack traces live
- **Visual debugging** — capture screenshots and render components as images
- **FigJam boards** — create stickies, flowcharts, tables, and code blocks
- **Slides support** — manage presentations, transitions, and slide content
- **Design-code parity** — compare Figma specs against your code implementation
- **Multi-file support** — connect to multiple open Figma files simultaneously

---

## Prerequisites

- **Node.js 18+** — `node --version` to check ([download](https://nodejs.org))
- **Figma Desktop** (not the web app — the plugin requires the desktop client)
- A **Figma Personal Access Token** (see below)
- An **MCP-compatible client**: Claude Code CLI, Claude Desktop, Cursor, Windsurf, etc.

---

## Setup

### Step 1 — Get a Figma Personal Access Token

1. Open Figma → click your avatar → **Settings → Security**
2. Scroll to **Personal access tokens** → **Generate new token**
3. Name it `Figma Canvas MCP`, set a reasonable expiry
4. Copy the token (starts with `figd_`) — you won't see it again

### Step 2 — Register the MCP Server

**Claude Code (CLI) — recommended:**
```bash
claude mcp add figma-canvas -s user \
  -e FIGMA_ACCESS_TOKEN=figd_YOUR_TOKEN_HERE \
  -e ENABLE_MCP_APPS=true \
  -- node /Users/YOUR_USERNAME/figma-canvas-mcp/dist/local.js
```

**Claude Desktop** (`~/Library/Application Support/Claude/claude_desktop_config.json`):
```json
{
  "mcpServers": {
    "figma-canvas": {
      "command": "/usr/local/bin/node",
      "args": ["/Users/YOUR_USERNAME/figma-canvas-mcp/dist/local.js"],
      "env": {
        "FIGMA_ACCESS_TOKEN": "figd_YOUR_TOKEN_HERE",
        "ENABLE_MCP_APPS": "true"
      }
    }
  }
}
```

> **Note:** Claude Desktop requires an absolute path to `node` because it does not inherit your shell `$PATH`. Run `which node` in your terminal to find the correct path.

**Cursor** (`~/.cursor/mcp.json`) and **Windsurf** (`~/.codeium/windsurf/mcp_config.json`):
```json
{
  "mcpServers": {
    "figma-canvas": {
      "command": "node",
      "args": ["/Users/YOUR_USERNAME/figma-canvas-mcp/dist/local.js"],
      "env": {
        "FIGMA_ACCESS_TOKEN": "figd_YOUR_TOKEN_HERE",
        "ENABLE_MCP_APPS": "true"
      }
    }
  }
}
```

### Step 3 — Install the Desktop Bridge Plugin

1. Open **Figma Desktop**
2. Go to **Plugins → Development → Import plugin from manifest...**
3. Select:
   ```
   ~/.figma-canvas-mcp/plugin/manifest.json
   ```
   > On first run, the server copies the plugin files to `~/.figma-canvas-mcp/` automatically.
4. Open a Figma file and run **Figma Canvas Bridge** from the Plugins menu

### Step 4 — Restart Your MCP Client

Restart Claude Code, Claude Desktop, Cursor, or Windsurf to load the new server.

### Step 5 — Verify the Connection

Ask your AI assistant:
```
Check the Figma Canvas status
```

You should see the active WebSocket connection on port 9243–9252.

---

## Running Alongside figma-console-mcp

This is the primary use case for this fork. Both servers can be active at the same time:

```bash
# Both registered in Claude Code simultaneously:
claude mcp add figma-console -s user -e FIGMA_ACCESS_TOKEN=... -- npx -y figma-console-mcp@latest
claude mcp add figma-canvas  -s user -e FIGMA_ACCESS_TOKEN=... -- node ~/figma-canvas-mcp/dist/local.js
```

In Figma Desktop, you will have two plugins available:
- **Figma Desktop Bridge** (ports 9223–9232) — from figma-console-mcp
- **Figma Canvas Bridge** (ports 9243–9252) — from this fork

Run whichever plugin corresponds to the MCP server you want active in that file.

---

## Tool Reference

The server exposes **84+ tools** organized into categories. Here is a summary of what is available:

### Core Reading

| Tool | Description |
|------|-------------|
| `figma_get_status` | Check WebSocket connection and list active Figma instances |
| `figma_get_design_system_kit` | Full design system snapshot — tokens, components, styles, and visual specs in one call |
| `figma_get_variables` | Extract all design tokens with multi-mode support; exports CSS and Tailwind |
| `figma_get_styles` | Color, text, and effect styles |
| `figma_get_component` | Component metadata or a full reconstruction spec |
| `figma_get_file_data` | Entire file tree with configurable verbosity |
| `figma_get_selection` | Read the user's current Figma selection |

### Design Creation & Editing

| Tool | Description |
|------|-------------|
| `figma_execute` | Run any Figma Plugin API code — create frames, shapes, text, components, and more |
| `figma_instantiate_component` | Create a component instance with specific properties and variant values |
| `figma_set_fills` | Apply solid colors or bind design token variables to fills |
| `figma_set_text` | Update text content on any text node |
| `figma_move_node` / `figma_resize_node` | Reposition and resize nodes |
| `figma_clone_node` | Duplicate any node |
| `figma_delete_node` | Remove nodes |
| `figma_arrange_component_set` | Organize variants into professional grid layouts |

### Variable (Token) Management

| Tool | Description |
|------|-------------|
| `figma_setup_design_tokens` | Create a complete token system (collection + modes + variables) atomically |
| `figma_batch_create_variables` | Create up to 100 variables in a single call |
| `figma_batch_update_variables` | Update up to 100 variable values in a single call |
| `figma_create_variable_collection` | Create a new token collection with named modes |
| `figma_create_variable` | Create a COLOR, FLOAT, STRING, or BOOLEAN variable |
| `figma_update_variable` | Update a variable's value in a specific mode |
| `figma_rename_variable` / `figma_delete_variable` | Rename or remove variables |
| `figma_add_mode` / `figma_rename_mode` | Add or rename modes (e.g., Dark, Mobile) |
| `figma_resolve_variable` | Traverse alias chains to get the concrete resolved value |

### Plugin Debugging

| Tool | Description |
|------|-------------|
| `figma_get_console_logs` | Retrieve buffered logs with optional filtering |
| `figma_watch_console` | Stream logs in real time for up to 5 minutes |
| `figma_clear_console` | Clear the log buffer |
| `figma_reload_plugin` | Reload the current page or plugin |

### Visual Debugging

| Tool | Description |
|------|-------------|
| `figma_take_screenshot` | Capture the Figma canvas as PNG, JPG, SVG, or PDF |
| `figma_get_component_image` | Render a specific component as an image |

### FigJam Boards

| Tool | Description |
|------|-------------|
| `figjam_create_sticky` / `figjam_create_stickies` | Create one or many sticky notes |
| `figjam_create_connector` | Connect nodes with labeled lines |
| `figjam_create_shape_with_text` | Flowchart shapes (diamond, ellipse, rectangle, etc.) |
| `figjam_create_table` | Create tables with cell data |
| `figjam_create_code_block` | Add syntax-highlighted code snippets |
| `figjam_auto_arrange` | Arrange nodes in grid, horizontal, or vertical layouts |
| `figjam_get_board_contents` | Read all content from a FigJam board |

### Slides Presentations

| Tool | Description |
|------|-------------|
| `figma_list_slides` / `figma_get_slide_content` | List or read slides |
| `figma_create_slide` / `figma_delete_slide` / `figma_duplicate_slide` | Manage slides |
| `figma_set_slide_transition` | Set transition effects (22 styles, 8 easing curves) |
| `figma_add_text_to_slide` / `figma_add_shape_to_slide` | Add content to slides |
| `figma_reorder_slides` | Rearrange slides via a 2D grid |
| `figma_focus_slide` | Navigate to a specific slide |

### Design–Code Workflow

| Tool | Description |
|------|-------------|
| `figma_check_design_parity` | Compare Figma specs to your code and produce a scored diff |
| `figma_generate_component_doc` | Generate markdown documentation merging design and code data |
| `figma_lint_design` | Accessibility and design quality checks (WCAG, hardcoded values, naming) |

### Comments

| Tool | Description |
|------|-------------|
| `figma_get_comments` | Retrieve all comments on a file |
| `figma_post_comment` | Post a comment, optionally pinned to a node |
| `figma_delete_comment` | Delete a comment |

---

## Configuration

| Environment Variable | Description | Default |
|---|---|---|
| `FIGMA_ACCESS_TOKEN` | Figma Personal Access Token (required) | — |
| `ENABLE_MCP_APPS` | Enable interactive Token Browser and Design System Dashboard | `false` |
| `FIGMA_WS_PORT` | Override the starting WebSocket port | `9243` |
| `FIGMA_WS_HOST` | Bind address for the WebSocket server | `localhost` |

### MCP Apps (optional)

Set `ENABLE_MCP_APPS=true` to unlock two interactive tools:

- **Token Browser** — Explore your design tokens with search, filtering, mode switching, and alias resolution
- **Design System Dashboard** — A health audit scorecard across six categories: Naming, Tokens, Components, Accessibility, Consistency, and Coverage

---

## Example Prompts

Once everything is connected, try these in your AI assistant:

```
Extract all design tokens from figma.com/design/abc123/My-App as Tailwind config
```

```
Create a notification card with a success icon, title "Changes saved",
and a dismiss button — use our brand color variables for fills
```

```
Search for the "Button" component and create a Large / Primary instance at x=100, y=200
```

```
Create a retrospective FigJam board with three columns: Went Well, To Improve, Action Items
```

```
Compare the spacing and typography of the Card component in Figma
against our React implementation in src/components/Card.tsx
```

```
Stream console logs from my plugin while I click through the interactions
```

---

## Architecture

```
AI Client (Claude, Cursor, Windsurf)
    │
    ▼ MCP stdio transport
MCP Server (dist/local.js)
    │
    ▼ WebSocket (ports 9243–9252)
Figma Canvas Bridge Plugin (ui.html)
    │
    ▼ postMessage
Plugin Worker (code.js)
    │
    ▼ Figma Plugin API
Figma Desktop
```

**REST API calls** (read-only) go directly from the MCP server to `api.figma.com` using your Personal Access Token.

**Write operations** (create nodes, set variables, execute Plugin API code) are relayed through the WebSocket bridge to the plugin, which runs them inside the Figma Desktop sandbox.

**Multi-file support:** the server can maintain WebSocket connections to multiple open Figma files simultaneously. Use `figma_get_status` to see which files are connected and `figma_list_open_files` to enumerate them.

---

## Development

```bash
# Install dependencies
npm install

# Build everything (local server + Cloudflare worker + MCP apps)
npm run build

# Build just the local server
npm run build:local

# Run in dev mode (requires wrangler)
npm run dev:local

# Type check
npm run type-check

# Run tests
npm test

# Format and lint
npm run format
npm run lint:fix
```

The source lives in `src/`. The compiled output in `dist/` is committed and is what the server runs from — no build step required for users.

---

## Key Differences from Upstream

This fork makes the following targeted changes relative to [figma-console-mcp](https://github.com/southleft/figma-console-mcp):

| File | Change |
|---|---|
| `plugin/manifest.json` | Name → "Figma Canvas Bridge", ID → `figma-canvas-bridge-mcp`, ports 9243–9252 |
| `dist/core/port-discovery.js` | `DEFAULT_WS_PORT=9243`, `PORT_FILE_PREFIX='figma-canvas-mcp-'` |
| `dist/local.js` | Stable config dir → `.figma-canvas-mcp`, user-facing strings → "Canvas Bridge" |
| `dist/core/websocket-server.js` | Port range 9243–9252, `import.meta.url`-relative path for `ui-full.html` |
| `plugin/ui.html` + `ui-full.html` | `WS_PORT_RANGE_START=9243`, `WS_PORT_RANGE_END=9252` |

The ESM `__dirname` fix in `websocket-server.js` is also included upstream — if you hit `ERR_MODULE_NOT_FOUND` for `ui-full.html`, this is the fix.

---

## Troubleshooting

**Plugin is not connecting**
- Confirm you imported the plugin from `~/.figma-canvas-mcp/plugin/manifest.json`, not from the `plugin/` directory in this repo
- Make sure the MCP server is running before you open Figma — the plugin connects on load
- Check `figma_get_status` in your AI client to see the live connection state

**Port conflict with figma-console-mcp**
- This fork uses ports 9243–9252 exclusively; there should be no conflict with the upstream 9223–9232 range
- If another process occupies 9243, the server automatically tries 9244–9252

**Claude Desktop cannot find `node`**
- Claude Desktop does not inherit your shell `$PATH`; use the absolute path: `which node`
- Common locations: `/usr/local/bin/node`, `/opt/homebrew/bin/node`

**`ENABLE_MCP_APPS` has no effect**
- Restart your MCP client after changing environment variables — they are read once at startup

---

## Credits

Built on top of the excellent [figma-console-mcp](https://github.com/southleft/figma-console-mcp) by [Southleft](https://github.com/southleft). All original functionality and architecture are theirs — this fork only adds port isolation for parallel use.

---

## License

MIT — see [LICENSE](LICENSE) for details.
