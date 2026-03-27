# Figma Canvas MCP

[![MCP Compatible](https://img.shields.io/badge/MCP-Compatible-blue)](https://modelcontextprotocol.io/)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![Node.js 18+](https://img.shields.io/badge/Node.js-18%2B-green)](https://nodejs.org)

> **Your Figma canvas, controlled by AI.** An MCP server that gives AI assistants full read/write access to Figma — extract design systems, create components, manage variables, build FigJam boards, and debug plugins in real time.

---

## Quick Setup

Three steps: get a token → register the server → install the plugin.

---

### Step 1 — Get Your Figma Token

Your token lets the server read and write to your Figma files.

1. Open **Figma Desktop** → click your avatar (top-right) → **Settings**
2. Go to the **Security** tab
3. Scroll to **Personal access tokens** → click **Generate new token**
4. Name it `Figma Canvas MCP`, choose an expiry
5. **Copy the token** — it starts with `figd_` and you won't see it again

---

### Step 2 — Register the MCP Server

Pick the client you use and run the command or edit the config file.

**Claude Code (terminal):**
```bash
claude mcp add figma-canvas -s user \
  -e FIGMA_ACCESS_TOKEN=figd_YOUR_TOKEN_HERE \
  -e ENABLE_MCP_APPS=true \
  -- node /path/to/figma-canvas-mcp/dist/local.js
```

**Claude Desktop** — edit `~/Library/Application Support/Claude/claude_desktop_config.json`:
```json
{
  "mcpServers": {
    "figma-canvas": {
      "command": "/usr/local/bin/node",
      "args": ["/path/to/figma-canvas-mcp/dist/local.js"],
      "env": {
        "FIGMA_ACCESS_TOKEN": "figd_YOUR_TOKEN_HERE",
        "ENABLE_MCP_APPS": "true"
      }
    }
  }
}
```
> Claude Desktop doesn't inherit your shell `$PATH` — use the absolute path to `node`. Find it by running `which node` in your terminal. Common values: `/usr/local/bin/node` or `/opt/homebrew/bin/node`.

**Cursor** — edit `~/.cursor/mcp.json`:
```json
{
  "mcpServers": {
    "figma-canvas": {
      "command": "node",
      "args": ["/path/to/figma-canvas-mcp/dist/local.js"],
      "env": {
        "FIGMA_ACCESS_TOKEN": "figd_YOUR_TOKEN_HERE",
        "ENABLE_MCP_APPS": "true"
      }
    }
  }
}
```

**Windsurf** — edit `~/.codeium/windsurf/mcp_config.json`:
```json
{
  "mcpServers": {
    "figma-canvas": {
      "command": "node",
      "args": ["/path/to/figma-canvas-mcp/dist/local.js"],
      "env": {
        "FIGMA_ACCESS_TOKEN": "figd_YOUR_TOKEN_HERE",
        "ENABLE_MCP_APPS": "true"
      }
    }
  }
}
```

After saving, **restart your MCP client** to load the server.

---

### Step 3 — Install the Figma Plugin

The plugin is what lets the server actually draw things inside Figma Desktop.

1. Open **Figma Desktop** (the desktop app — not the browser)
2. Go to **Plugins → Development → Import plugin from manifest...**
3. Navigate to and select:
   ```
   ~/.figma-canvas-mcp/plugin/manifest.json
   ```
   > The server automatically copies the plugin files to `~/.figma-canvas-mcp/` the first time it runs. Start the MCP server first if you don't see that folder yet.
4. Open any Figma file
5. Go to **Plugins → Development → Figma Canvas Bridge** to run it

---

### Step 4 — Verify It's Working

Ask your AI assistant:

```
Check the Figma Canvas status
```

You should see an active WebSocket connection. If the plugin is running in a Figma file, the file name will appear in the response.

---

## What You Can Do

Once connected, just describe what you want:

```
Show me all the colors and typography in my design system
```
```
Create a notification card with a success icon and a dismiss button,
using our brand color variables
```
```
Add a sticky note to the FigJam board for each item in this sprint
```
```
Compare the Button component in Figma against src/components/Button.tsx
```
```
Stream the console logs from my plugin while I test the interactions
```

---

## Why This Fork?

This is a fork of [figma-console-mcp](https://github.com/southleft/figma-console-mcp) built to run **alongside the original** without any conflicts. If you already use `figma-console-mcp`, this gives you a fully independent second MCP+Figma pair on a separate port range and plugin identity.

| | figma-console-mcp | figma-canvas-mcp |
|---|---|---|
| Port range | 9223–9232 | **9243–9252** |
| Plugin name | Figma Desktop Bridge | **Figma Canvas Bridge** |
| Plugin ID | figma-desktop-bridge-mcp | **figma-canvas-bridge-mcp** |
| Config dir | `~/.figma-console-mcp/` | **`~/.figma-canvas-mcp/`** |
| Runs alongside original | — | **Yes** |

To run both at the same time:

```bash
claude mcp add figma-console -s user -e FIGMA_ACCESS_TOKEN=... -- npx -y figma-console-mcp@latest
claude mcp add figma-canvas  -s user -e FIGMA_ACCESS_TOKEN=... -- node ~/figma-canvas-mcp/dist/local.js
```

In Figma Desktop, run whichever plugin matches the MCP server you want active in that file.

---

## Features

- **84+ tools** spanning the full Figma surface area
- **Design system extraction** — variables, components, and styles with CSS/Tailwind export
- **AI-assisted design creation** — create frames, components, and layouts via natural language
- **Variable management** — full CRUD for design tokens, with batch operations (up to 100 per call)
- **Real-time console monitoring** — stream plugin logs, errors, and stack traces live
- **Visual debugging** — capture canvas screenshots and render components as images
- **FigJam boards** — create stickies, flowcharts, tables, and code blocks
- **Slides** — manage presentations, transitions, and slide content
- **Design-code parity** — compare Figma specs against your code implementation
- **Multi-file support** — connect to multiple open Figma files simultaneously

---

## Tool Reference

The server exposes **84+ tools** organized by category.

### Core Reading

| Tool | Description |
|------|-------------|
| `figma_get_status` | Check WebSocket connection and list active Figma instances |
| `figma_get_design_system_kit` | Full design system snapshot — tokens, components, styles, and specs in one call |
| `figma_get_variables` | All design tokens with multi-mode support; exports CSS and Tailwind |
| `figma_get_styles` | Color, text, and effect styles |
| `figma_get_component` | Component metadata or full reconstruction spec |
| `figma_get_file_data` | Entire file tree with configurable verbosity |
| `figma_get_selection` | Read the user's current Figma selection |

### Design Creation & Editing

| Tool | Description |
|------|-------------|
| `figma_execute` | Run any Figma Plugin API code — create frames, shapes, text, components, and more |
| `figma_instantiate_component` | Place a component instance with specific property and variant values |
| `figma_set_fills` | Apply colors or bind design token variables to fills |
| `figma_set_text` | Update text content on any text node |
| `figma_move_node` / `figma_resize_node` | Reposition and resize nodes |
| `figma_clone_node` | Duplicate any node |
| `figma_delete_node` | Remove a node |
| `figma_arrange_component_set` | Organize variants into a professional grid layout |

### Variable (Token) Management

| Tool | Description |
|------|-------------|
| `figma_setup_design_tokens` | Create a complete token system (collection + modes + variables) atomically |
| `figma_batch_create_variables` | Create up to 100 variables in a single call |
| `figma_batch_update_variables` | Update up to 100 variable values in a single call |
| `figma_create_variable_collection` | Create a token collection with named modes |
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
| `figma_take_screenshot` | Capture the canvas as PNG, JPG, SVG, or PDF |
| `figma_get_component_image` | Render a specific component as an image |

### FigJam Boards

| Tool | Description |
|------|-------------|
| `figjam_create_sticky` / `figjam_create_stickies` | Create one or many sticky notes |
| `figjam_create_connector` | Connect nodes with labeled lines |
| `figjam_create_shape_with_text` | Flowchart shapes (diamond, ellipse, rectangle, etc.) |
| `figjam_create_table` | Create tables with cell data |
| `figjam_create_code_block` | Add syntax-highlighted code snippets |
| `figjam_auto_arrange` | Arrange nodes in grid, horizontal, or vertical layout |
| `figjam_get_board_contents` | Read all content from a FigJam board |

### Slides

| Tool | Description |
|------|-------------|
| `figma_list_slides` / `figma_get_slide_content` | List or inspect slides |
| `figma_create_slide` / `figma_delete_slide` / `figma_duplicate_slide` | Manage slides |
| `figma_set_slide_transition` | Set transition effects (22 styles, 8 easing curves) |
| `figma_add_text_to_slide` / `figma_add_shape_to_slide` | Add content to a slide |
| `figma_reorder_slides` | Rearrange slides via a 2D grid |
| `figma_focus_slide` | Navigate to a specific slide |

### Design–Code Workflow

| Tool | Description |
|------|-------------|
| `figma_check_design_parity` | Compare Figma specs to your code and produce a scored diff |
| `figma_generate_component_doc` | Generate markdown docs merging design and code data |
| `figma_lint_design` | Accessibility and quality checks (WCAG, hardcoded values, naming) |

### Comments

| Tool | Description |
|------|-------------|
| `figma_get_comments` | Retrieve all comments on a file |
| `figma_post_comment` | Post a comment, optionally pinned to a specific node |
| `figma_delete_comment` | Delete a comment |

---

## Configuration

| Environment Variable | Description | Default |
|---|---|---|
| `FIGMA_ACCESS_TOKEN` | Figma Personal Access Token — required | — |
| `ENABLE_MCP_APPS` | Enable Token Browser and Design System Dashboard | `false` |
| `FIGMA_WS_PORT` | Override the starting WebSocket port | `9243` |
| `FIGMA_WS_HOST` | WebSocket bind address | `localhost` |

### MCP Apps

Set `ENABLE_MCP_APPS=true` to unlock two interactive tools:

- **Token Browser** — explore design tokens with search, filtering, mode switching, and alias resolution
- **Design System Dashboard** — health audit scorecard across six categories: Naming, Tokens, Components, Accessibility, Consistency, and Coverage

---

## How It Works

```
AI Client (Claude, Cursor, Windsurf)
    │
    ▼  MCP stdio transport
MCP Server  (dist/local.js)
    │
    ▼  WebSocket — ports 9243–9252
Figma Canvas Bridge Plugin  (plugin UI)
    │
    ▼  postMessage
Plugin Worker  (plugin sandbox)
    │
    ▼  Figma Plugin API
Figma Desktop
```

**Read operations** (extract variables, components, styles) go directly from the MCP server to `api.figma.com` using your Personal Access Token — no plugin needed.

**Write operations** (create nodes, bind variables, run Plugin API code) are relayed through the WebSocket bridge to the plugin, which executes them inside the Figma Desktop sandbox.

**Multi-file:** the server maintains WebSocket connections to all open Figma files simultaneously. Use `figma_get_status` to see which files are connected, `figma_list_open_files` to enumerate them.

---

## Development

```bash
# Install dependencies
npm install

# Build everything (local server + Cloudflare worker + MCP apps)
npm run build

# Build just the local server
npm run build:local

# Watch mode for MCP apps
npm run dev:apps

# Type check
npm run type-check

# Run tests
npm test

# Format and lint
npm run format
npm run lint:fix
```

The source lives in `src/`. The compiled output in `dist/` is committed — no build step required to use the server.

---

## Key Differences from Upstream

Targeted changes made relative to [figma-console-mcp](https://github.com/southleft/figma-console-mcp):

| File | Change |
|---|---|
| `plugin/manifest.json` | Name → "Figma Canvas Bridge", ID → `figma-canvas-bridge-mcp`, ports 9243–9252 |
| `dist/core/port-discovery.js` | `DEFAULT_WS_PORT=9243`, `PORT_FILE_PREFIX='figma-canvas-mcp-'` |
| `dist/local.js` | Config dir → `.figma-canvas-mcp`, user-facing strings → "Canvas Bridge" |
| `dist/core/websocket-server.js` | Port range 9243–9252, `import.meta.url`-relative path for `ui-full.html` |
| `plugin/ui.html` + `plugin/ui-full.html` | `WS_PORT_RANGE_START=9243`, `WS_PORT_RANGE_END=9252` |

> The `websocket-server.js` fix resolves an ESM `__dirname` issue where `ui-full.html` couldn't be found when the server was launched outside its own directory. If you hit `ERR_MODULE_NOT_FOUND` for `ui-full.html` in the upstream package, this is the fix.

---

## Troubleshooting

**The plugin is not connecting**
- Start the MCP server first, then open Figma. The plugin connects on load.
- Make sure you imported from `~/.figma-canvas-mcp/plugin/manifest.json`, not from the `plugin/` folder in this repo.
- Run `figma_get_status` in your AI client to see the live connection state.

**Port conflict**
- This fork uses ports 9243–9252 exclusively — no overlap with the upstream 9223–9232 range.
- If another process occupies 9243, the server automatically tries 9244 through 9252.

**Claude Desktop can't find `node`**
- Claude Desktop does not inherit your shell `$PATH`. Use the absolute path returned by `which node`.
- Common locations: `/usr/local/bin/node`, `/opt/homebrew/bin/node`.

**`ENABLE_MCP_APPS` has no effect**
- Environment variables are read once at startup. Restart your MCP client after any change.

**`~/.figma-canvas-mcp/` folder doesn't exist**
- The server creates it on first run. Start the MCP server, then check the folder.

---

## Credits

Built on top of [figma-console-mcp](https://github.com/southleft/figma-console-mcp) by [Southleft](https://github.com/southleft). All core functionality and architecture are theirs — this fork adds port and identity isolation for parallel use.

---

## License

MIT — see [LICENSE](LICENSE) for details.
