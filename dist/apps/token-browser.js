/**
 * Token Browser MCP App
 *
 * An interactive UI for browsing and exploring Figma design tokens (variables).
 * Displays tokens organized by collection with color previews, filtering,
 * and mode switching capabilities.
 *
 * Uses the official @modelcontextprotocol/ext-apps helpers for proper
 * MCP Apps protocol compatibility with Claude Desktop.
 */
import { registerAppTool, registerAppResource, RESOURCE_MIME_TYPE, } from "@modelcontextprotocol/ext-apps/server";
import { z } from "zod";
const TOKEN_BROWSER_URI = "ui://figma-console/token-browser";
/**
 * Generate the Token Browser HTML UI
 */
function generateTokenBrowserHTML() {
    return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Token Browser</title>
  <style>
    * {
      box-sizing: border-box;
      margin: 0;
      padding: 0;
    }

    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, sans-serif;
      background: #1a1a1a;
      color: #e0e0e0;
      line-height: 1.5;
      padding: 16px;
      min-height: 100vh;
    }

    .header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 16px;
      flex-wrap: wrap;
      gap: 12px;
    }

    .header h1 {
      font-size: 18px;
      font-weight: 600;
      color: #fff;
    }

    .controls {
      display: flex;
      gap: 8px;
      align-items: center;
    }

    .search-input {
      padding: 8px 12px;
      border-radius: 6px;
      border: 1px solid #333;
      background: #2a2a2a;
      color: #e0e0e0;
      font-size: 14px;
      width: 200px;
    }

    .search-input:focus {
      outline: none;
      border-color: #0d9488;
    }

    .mode-select {
      padding: 8px 12px;
      border-radius: 6px;
      border: 1px solid #333;
      background: #2a2a2a;
      color: #e0e0e0;
      font-size: 14px;
      cursor: pointer;
    }

    .stats {
      font-size: 12px;
      color: #888;
      padding: 8px 0;
      border-bottom: 1px solid #333;
      margin-bottom: 16px;
    }

    .collection {
      margin-bottom: 24px;
      background: #242424;
      border-radius: 8px;
      overflow: hidden;
    }

    .collection-header {
      padding: 12px 16px;
      background: #2a2a2a;
      cursor: pointer;
      display: flex;
      justify-content: space-between;
      align-items: center;
      border-bottom: 1px solid #333;
    }

    .collection-header:hover {
      background: #333;
    }

    .collection-name {
      font-weight: 600;
      font-size: 14px;
      color: #fff;
    }

    .collection-meta {
      font-size: 12px;
      color: #888;
    }

    .collection-content {
      max-height: 0;
      overflow: hidden;
      transition: max-height 0.3s ease;
    }

    .collection.expanded .collection-content {
      max-height: none;
    }

    .collection-toggle {
      width: 20px;
      height: 20px;
      display: flex;
      align-items: center;
      justify-content: center;
      color: #888;
      transition: transform 0.2s;
    }

    .collection.expanded .collection-toggle {
      transform: rotate(90deg);
    }

    .variable-group {
      padding: 8px 16px;
      border-bottom: 1px solid #333;
    }

    .variable-group:last-child {
      border-bottom: none;
    }

    .group-name {
      font-size: 11px;
      font-weight: 600;
      color: #666;
      text-transform: uppercase;
      letter-spacing: 0.5px;
      margin-bottom: 8px;
    }

    .variable {
      display: flex;
      align-items: center;
      padding: 8px;
      margin: 4px 0;
      background: #1a1a1a;
      border-radius: 6px;
      gap: 12px;
    }

    .variable:hover {
      background: #222;
    }

    .color-preview {
      width: 32px;
      height: 32px;
      border-radius: 4px;
      border: 1px solid #444;
      flex-shrink: 0;
      background-image:
        linear-gradient(45deg, #333 25%, transparent 25%),
        linear-gradient(-45deg, #333 25%, transparent 25%),
        linear-gradient(45deg, transparent 75%, #333 75%),
        linear-gradient(-45deg, transparent 75%, #333 75%);
      background-size: 8px 8px;
      background-position: 0 0, 0 4px, 4px -4px, -4px 0px;
    }

    .color-preview-inner {
      width: 100%;
      height: 100%;
      border-radius: 3px;
    }

    .type-badge {
      font-size: 10px;
      padding: 2px 6px;
      border-radius: 4px;
      background: #333;
      color: #888;
      text-transform: uppercase;
      flex-shrink: 0;
    }

    .type-badge.color { background: #1e3a3a; color: #5eead4; }
    .type-badge.float { background: #1e2d3a; color: #7dd3fc; }
    .type-badge.string { background: #2d1e3a; color: #d8b4fe; }
    .type-badge.boolean { background: #3a2d1e; color: #fcd34d; }

    .variable-info {
      flex: 1;
      min-width: 0;
    }

    .variable-name {
      font-size: 13px;
      font-weight: 500;
      color: #e0e0e0;
      word-break: break-all;
    }

    .variable-value {
      font-size: 12px;
      color: #888;
      font-family: 'SF Mono', Monaco, 'Cascadia Code', monospace;
      margin-top: 2px;
    }

    .variable-description {
      font-size: 11px;
      color: #666;
      margin-top: 4px;
      font-style: italic;
    }

    .loading {
      text-align: center;
      padding: 48px;
      color: #666;
    }

    .empty {
      text-align: center;
      padding: 48px;
      color: #666;
    }

    .error {
      background: #3a1e1e;
      color: #f87171;
      padding: 16px;
      border-radius: 8px;
      margin-bottom: 16px;
    }

    .tabs {
      display: flex;
      gap: 4px;
      margin-bottom: 16px;
      background: #242424;
      padding: 4px;
      border-radius: 8px;
    }

    .tab {
      padding: 8px 16px;
      border-radius: 6px;
      border: none;
      background: transparent;
      color: #888;
      font-size: 13px;
      cursor: pointer;
      transition: all 0.2s;
    }

    .tab:hover {
      color: #e0e0e0;
    }

    .tab.active {
      background: #0d9488;
      color: #fff;
    }

    .copy-btn {
      padding: 4px 8px;
      border-radius: 4px;
      border: 1px solid #444;
      background: #2a2a2a;
      color: #888;
      font-size: 11px;
      cursor: pointer;
      opacity: 0;
      transition: opacity 0.2s;
    }

    .variable:hover .copy-btn {
      opacity: 1;
    }

    .copy-btn:hover {
      background: #333;
      color: #e0e0e0;
    }

    .copy-btn.copied {
      background: #0d9488;
      border-color: #0d9488;
      color: #fff;
    }
  </style>
</head>
<body>
  <div id="app">
    <div class="loading">Loading design tokens...</div>
  </div>

  <script type="module">
    // Token Browser App Logic
    let appData = null;
    let currentMode = null;
    let searchTerm = '';
    let expandedCollections = new Set();
    let viewMode = 'all'; // 'all', 'colors', 'numbers', 'strings'

    // Listen for data from MCP tool results
    window.addEventListener('message', (event) => {
      if (event.data?.type === 'mcp:tool-result') {
        try {
          const data = JSON.parse(event.data.content);
          if (data.variables || data.collections) {
            appData = data;
            // Auto-expand first collection
            if (data.collections?.length > 0) {
              expandedCollections.add(data.collections[0].id);
            }
            render();
          }
        } catch (e) {
          console.error('Failed to parse tool result:', e);
        }
      }
    });

    // Request initial data
    window.parent?.postMessage({ type: 'mcp:request-data' }, '*');

    function render() {
      const app = document.getElementById('app');

      if (!appData) {
        app.innerHTML = '<div class="loading">Loading design tokens...</div>';
        return;
      }

      const { variables = [], collections = [] } = appData;

      if (variables.length === 0) {
        app.innerHTML = '<div class="empty">No design tokens found in this file.</div>';
        return;
      }

      // Get unique modes from all collections
      const allModes = [];
      const seenModes = new Set();
      collections.forEach(col => {
        (col.modes || []).forEach(mode => {
          if (!seenModes.has(mode.modeId)) {
            seenModes.add(mode.modeId);
            allModes.push(mode);
          }
        });
      });

      // Set default mode if not set
      if (!currentMode && allModes.length > 0) {
        currentMode = allModes[0].modeId;
      }

      // Filter variables
      let filteredVariables = variables;

      if (searchTerm) {
        const term = searchTerm.toLowerCase();
        filteredVariables = variables.filter(v =>
          v.name.toLowerCase().includes(term) ||
          v.description?.toLowerCase().includes(term)
        );
      }

      if (viewMode !== 'all') {
        const typeMap = {
          'colors': 'COLOR',
          'numbers': 'FLOAT',
          'strings': 'STRING',
          'booleans': 'BOOLEAN'
        };
        filteredVariables = filteredVariables.filter(v =>
          v.resolvedType === typeMap[viewMode]
        );
      }

      // Group by collection
      const byCollection = {};
      filteredVariables.forEach(v => {
        const colId = v.variableCollectionId;
        if (!byCollection[colId]) {
          byCollection[colId] = [];
        }
        byCollection[colId].push(v);
      });

      // Count by type
      const counts = {
        total: variables.length,
        colors: variables.filter(v => v.resolvedType === 'COLOR').length,
        numbers: variables.filter(v => v.resolvedType === 'FLOAT').length,
        strings: variables.filter(v => v.resolvedType === 'STRING').length,
        booleans: variables.filter(v => v.resolvedType === 'BOOLEAN').length
      };

      app.innerHTML = \`
        <div class="header">
          <h1>Design Tokens</h1>
          <div class="controls">
            <input
              type="text"
              class="search-input"
              placeholder="Search tokens..."
              value="\${searchTerm}"
              oninput="handleSearch(this.value)"
            />
            \${allModes.length > 1 ? \`
              <select class="mode-select" onchange="handleModeChange(this.value)">
                \${allModes.map(m => \`
                  <option value="\${m.modeId}" \${m.modeId === currentMode ? 'selected' : ''}>
                    \${m.name}
                  </option>
                \`).join('')}
              </select>
            \` : ''}
          </div>
        </div>

        <div class="stats">
          \${counts.total} tokens:
          \${counts.colors} colors,
          \${counts.numbers} numbers,
          \${counts.strings} strings,
          \${counts.booleans} booleans
        </div>

        <div class="tabs">
          <button class="tab \${viewMode === 'all' ? 'active' : ''}" onclick="setViewMode('all')">All</button>
          <button class="tab \${viewMode === 'colors' ? 'active' : ''}" onclick="setViewMode('colors')">Colors</button>
          <button class="tab \${viewMode === 'numbers' ? 'active' : ''}" onclick="setViewMode('numbers')">Numbers</button>
          <button class="tab \${viewMode === 'strings' ? 'active' : ''}" onclick="setViewMode('strings')">Strings</button>
        </div>

        \${collections.map(col => {
          const colVars = byCollection[col.id] || [];
          if (colVars.length === 0) return '';

          const isExpanded = expandedCollections.has(col.id);
          const grouped = groupVariables(colVars);

          return \`
            <div class="collection \${isExpanded ? 'expanded' : ''}" data-id="\${col.id}">
              <div class="collection-header" onclick="toggleCollection('\${col.id}')">
                <div>
                  <span class="collection-name">\${col.name}</span>
                  <span class="collection-meta">\${colVars.length} tokens</span>
                </div>
                <div class="collection-toggle">▶</div>
              </div>
              <div class="collection-content">
                \${Object.entries(grouped).map(([group, vars]) => \`
                  <div class="variable-group">
                    \${group !== '_root' ? \`<div class="group-name">\${group}</div>\` : ''}
                    \${vars.map(v => renderVariable(v)).join('')}
                  </div>
                \`).join('')}
              </div>
            </div>
          \`;
        }).join('')}

        \${filteredVariables.length === 0 ? '<div class="empty">No tokens match your search.</div>' : ''}
      \`;
    }

    function groupVariables(vars) {
      const groups = {};
      vars.forEach(v => {
        const parts = v.name.split('/');
        const group = parts.length > 1 ? parts.slice(0, -1).join('/') : '_root';
        if (!groups[group]) groups[group] = [];
        groups[group].push(v);
      });
      return groups;
    }

    function renderVariable(v) {
      const value = getVariableValue(v, currentMode);
      const displayName = v.name.split('/').pop();

      return \`
        <div class="variable">
          \${v.resolvedType === 'COLOR' ? \`
            <div class="color-preview">
              <div class="color-preview-inner" style="background: \${formatColorValue(value)};"></div>
            </div>
          \` : ''}
          <span class="type-badge \${v.resolvedType.toLowerCase()}">\${v.resolvedType}</span>
          <div class="variable-info">
            <div class="variable-name">\${displayName}</div>
            <div class="variable-value">\${formatValue(v.resolvedType, value)}</div>
            \${v.description ? \`<div class="variable-description">\${v.description}</div>\` : ''}
          </div>
          <button class="copy-btn" onclick="copyValue('\${v.name}', '\${formatValue(v.resolvedType, value).replace(/'/g, "\\\\'")}', this)">
            Copy
          </button>
        </div>
      \`;
    }

    function getVariableValue(variable, modeId) {
      if (!variable.valuesByMode) return variable.resolvedValue || '';
      return variable.valuesByMode[modeId] || Object.values(variable.valuesByMode)[0] || '';
    }

    function formatValue(type, value) {
      if (type === 'COLOR' && typeof value === 'object') {
        const r = Math.round((value.r || 0) * 255);
        const g = Math.round((value.g || 0) * 255);
        const b = Math.round((value.b || 0) * 255);
        const a = value.a ?? 1;
        if (a < 1) {
          return \`rgba(\${r}, \${g}, \${b}, \${a.toFixed(2)})\`;
        }
        return \`#\${r.toString(16).padStart(2, '0')}\${g.toString(16).padStart(2, '0')}\${b.toString(16).padStart(2, '0')}\`.toUpperCase();
      }
      if (type === 'FLOAT' && typeof value === 'number') {
        return Number.isInteger(value) ? value.toString() : value.toFixed(2);
      }
      if (type === 'BOOLEAN') {
        return value ? 'true' : 'false';
      }
      return String(value || '');
    }

    function formatColorValue(value) {
      if (typeof value === 'object') {
        const r = Math.round((value.r || 0) * 255);
        const g = Math.round((value.g || 0) * 255);
        const b = Math.round((value.b || 0) * 255);
        const a = value.a ?? 1;
        return \`rgba(\${r}, \${g}, \${b}, \${a})\`;
      }
      return value || 'transparent';
    }

    // Global functions for event handlers
    window.handleSearch = (value) => {
      searchTerm = value;
      render();
    };

    window.handleModeChange = (modeId) => {
      currentMode = modeId;
      render();
    };

    window.toggleCollection = (id) => {
      if (expandedCollections.has(id)) {
        expandedCollections.delete(id);
      } else {
        expandedCollections.add(id);
      }
      render();
    };

    window.setViewMode = (mode) => {
      viewMode = mode;
      render();
    };

    window.copyValue = (name, value, btn) => {
      navigator.clipboard.writeText(value).then(() => {
        btn.textContent = 'Copied!';
        btn.classList.add('copied');
        setTimeout(() => {
          btn.textContent = 'Copy';
          btn.classList.remove('copied');
        }, 1500);
      });
    };

    // Initial render
    render();
  </script>
</body>
</html>`;
}
/**
 * Register the Token Browser MCP App with the server
 * Uses the official ext-apps helpers for proper MCP Apps protocol compatibility
 *
 * @param server - The MCP server instance
 * @param getVariablesHandler - Function to fetch variables data (from FigmaAPI or Desktop Bridge)
 */
export function registerTokenBrowserApp(server, getVariablesHandler) {
    // Register the UI resource using ext-apps helper
    registerAppResource(server, "Token Browser", TOKEN_BROWSER_URI, {
        description: "Interactive browser for exploring Figma design tokens and variables",
    }, async () => ({
        contents: [
            {
                uri: TOKEN_BROWSER_URI,
                mimeType: RESOURCE_MIME_TYPE,
                text: generateTokenBrowserHTML(),
            },
        ],
    }));
    // Register the tool using ext-apps helper with UI metadata
    registerAppTool(server, "figma_browse_tokens", {
        title: "Browse Design Tokens",
        description: "Open an interactive browser to explore design tokens (variables) from a Figma file. Shows tokens organized by collection with color previews, search, filtering, and mode switching. Best for visually exploring and understanding a design system's token structure.",
        inputSchema: {
            fileUrl: z
                .string()
                .url()
                .optional()
                .describe("Figma file URL. If not provided, uses the currently active file (requires Desktop Bridge)."),
        },
        _meta: {
            ui: {
                resourceUri: TOKEN_BROWSER_URI,
            },
        },
    }, async ({ fileUrl }) => {
        try {
            const result = await getVariablesHandler(fileUrl);
            return {
                content: [
                    {
                        type: "text",
                        text: JSON.stringify(result),
                    },
                ],
            };
        }
        catch (error) {
            const errorMessage = error instanceof Error ? error.message : String(error);
            return {
                content: [
                    {
                        type: "text",
                        text: JSON.stringify({
                            error: errorMessage,
                            variables: [],
                            collections: [],
                        }),
                    },
                ],
                isError: true,
            };
        }
    });
}
export { TOKEN_BROWSER_URI, generateTokenBrowserHTML };
//# sourceMappingURL=token-browser.js.map