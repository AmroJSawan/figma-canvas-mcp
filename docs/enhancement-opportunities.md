# Enhancement Opportunities

> Analysis based on: code audit of figma-console-mcp v1.17.3 + plugin code.js, hands-on usage
> in design system sessions, and cross-referenced against official Figma Plugin API docs (March 2026).
> Last enriched: March 24 2026 via live research (API changelog, GitHub issues, forum threads).

---

## Priority 0 (New) — Pattern Fill Validation Bug

### What's Missing

`node.fills = fillsClone` throws a discriminator validation error when ANY fill in the file is of
type `PATTERN` (introduced in Update 123, Jan 2026). This crashes any plugin doing fill manipulation
on files that contain pattern fills — including the existing `figma_set_fills` and the planned
variable binding extension.

### Impact

Critical. Breaks silently on modern Figma files. Any file that uses the new pattern fill feature
(decorative backgrounds, brand textures) will cause `figma_set_fills` to throw.

### Fix

Use the new async `setFillsAsync()` method (Update 123+) instead of direct assignment:

```javascript
// BROKEN on files with PATTERN fills:
node.fills = processedFills;

// CORRECT:
await node.setFillsAsync(processedFills);
```

Apply this change to all `SET_NODE_FILLS` handler code. This is a low-risk, backward-compatible fix
since `setFillsAsync` behaves identically to direct assignment on non-PATTERN fills.

---

## Priority 0 (New) — $TMPDIR vs /tmp Port Discovery Bug

### What's Missing

The port discovery system writes advertisement files to `$TMPDIR` on some macOS configurations.
`$TMPDIR` resolves to a per-session path like `/var/folders/xx/yyy/T/` — not `/tmp`. The plugin
UI scans a hardcoded `/tmp` directory. Files written to `$TMPDIR` are never found by the plugin,
causing "MCP Ready" status in the plugin with no actual connection.

### Impact

High. Causes silent connection failures on macOS. Reported as an open issue on the upstream repo
(southleft/figma-console-mcp). Users see the plugin say "connected" or "MCP Ready" but tools fail.

### Fix

Normalize the temp directory path in `port-discovery.js`:

```javascript
// Instead of:
const tmpDir = process.env.TMPDIR || '/tmp';

// Use:
const tmpDir = '/tmp'; // always use /tmp — shared, predictable, matches plugin scan path
// Or: make both sides agree on the path (env var or config)
```

The plugin UI and the MCP server must use the same base directory for port files.

---

## Gap 1 — No Read Path for Node Visual State

### What's Missing

There is no tool to read fills, strokes, or effects from an arbitrary node — including whether those
properties are bound to variables. `figma_get_component` returns structural data (children, property
definitions). `figma_get_file_data` returns a document snapshot. Neither returns live paint state or
variable bindings.

Every audit of "what tokens are applied to this node" currently requires `figma_execute` with custom
JavaScript.

### Impact

High. This is the most common diagnostic operation when working on design systems. Without it, every
audit session is a one-off script.

### Proposed Tool: `figma_get_node_state`

**Plugin handler (`GET_NODE_STATE`):**

```javascript
else if (msg.type === 'GET_NODE_STATE') {
  const node = await figma.getNodeByIdAsync(msg.nodeId);
  if (!node) throw new Error('Node not found: ' + msg.nodeId);

  // Helper: serialize a paint including its bound variable
  function serializePaint(paint, boundVarEntry) {
    return {
      type: paint.type,
      color: paint.color,
      opacity: paint.opacity ?? 1,
      visible: paint.visible !== false,
      boundVariableId: boundVarEntry ? boundVarEntry.id : null
    };
  }

  const fills = (node.fills || []).map((p, i) =>
    serializePaint(p, node.boundVariables?.fills?.[i])
  );
  const strokes = (node.strokes || []).map((p, i) =>
    serializePaint(p, node.boundVariables?.strokes?.[i])
  );

  // Node-level variable bindings (width, height, opacity, cornerRadius, etc.)
  const nodeBoundVars = {};
  if (node.boundVariables) {
    for (const [field, binding] of Object.entries(node.boundVariables)) {
      if (field === 'fills' || field === 'strokes') continue; // handled above
      nodeBoundVars[field] = Array.isArray(binding)
        ? binding.map(b => ({ id: b.id }))
        : { id: binding.id };
    }
  }

  figma.ui.postMessage({
    type: 'GET_NODE_STATE_RESULT',
    requestId: msg.requestId,
    success: true,
    result: {
      id: node.id,
      name: node.name,
      type: node.type,
      width: node.width,
      height: node.height,
      fills,
      strokes,
      boundVariables: nodeBoundVars,
      opacity: node.opacity ?? 1,
      visible: node.visible !== false,
      layoutMode: node.layoutMode ?? null,
      paddingTop: node.paddingTop ?? null,
      paddingRight: node.paddingRight ?? null,
      paddingBottom: node.paddingBottom ?? null,
      paddingLeft: node.paddingLeft ?? null,
      itemSpacing: node.itemSpacing ?? null,
      cornerRadius: node.cornerRadius ?? null,
      // Text-specific
      fontSize: node.type === 'TEXT' ? node.fontSize : undefined,
      fontName: node.type === 'TEXT' ? node.fontName : undefined,
    }
  });
}
```

**MCP tool registration:**

```javascript
server.tool(
  "figma_get_node_state",
  "Read fills, strokes, effects and their bound variable IDs from a node. " +
  "Use when auditing what design tokens are applied to a specific node. " +
  "Returns paint objects with boundVariableId for each fill/stroke. " +
  "NOT for component property definitions (use figma_get_component). " +
  "Requires Desktop Bridge connection.",
  {
    nodeId: z.string().describe("Node ID (e.g. '15:203')"),
    includeLayout: z.boolean().optional().describe("Include layout/spacing properties. Default: false")
  },
  handler,
  { annotations: { readOnlyHint: true } }
);
```

---

## Gap 2 — No Variable Resolution Tool

### What's Missing

`StyleValueResolver.resolveVariableValue` in `core/enrichment/style-resolver.js` already does full
recursive alias chain traversal with caching. It is used internally when calling `figma_get_variables`
or `figma_get_styles` with `enrich: true`. But it is not exposed as a standalone tool.

When you have a `VariableID:8:2258` and need to know what concrete color it resolves to in Light
mode vs Dark mode, you must call `figma_get_variables` and scan the full response, or write custom
`figma_execute` traversal.

### Impact

High. Needed every time a variable binding produces unexpected visual output (e.g. black instead of
purple), and every time `figma_set_fills` with variable binding is planned.

### Known Bug in Existing Enrichment

`enrichment-service.js` `enrichVariables` iterates `modeId` but resolves the same default mode each
time — the per-mode resolved values are all identical. Fix: pass `modeId` into `resolveVariableValue`.

```javascript
// BUG (current code):
for (const [modeId, value] of Object.entries(variable.valuesByMode || {})) {
  const resolvedValue = await this.styleResolver.resolveVariableValue(variable, variablesMap, options.max_depth);
  resolved_values[modeId] = resolvedValue; // same value for every mode
}

// FIX:
for (const [modeId] of Object.entries(variable.valuesByMode || {})) {
  const resolvedValue = await this.styleResolver.resolveVariableValueForMode(
    variable, variablesMap, modeId, options.max_depth
  );
  resolved_values[modeId] = resolvedValue;
}
```

### Proposed Tool: `figma_resolve_variable`

Wires existing `StyleValueResolver` to a new MCP tool endpoint. Minimal new code.

```javascript
server.tool(
  "figma_resolve_variable",
  "Resolve a variable's alias chain to its concrete value (color, number, string, boolean). " +
  "Traverses VARIABLE_ALIAS chains to the final value. " +
  "Returns resolved value per mode. " +
  "Use before figma_set_fills to verify the color a token resolves to.",
  {
    variableId: z.string().describe("Variable ID (e.g. 'VariableID:8:2258')"),
    modeId: z.string().optional().describe("Specific mode ID. Omit for all modes.")
  },
  async ({ variableId, modeId }) => {
    // 1. Get all variables (use cache if available)
    // 2. Build id -> variable map
    // 3. Call styleResolver.resolveVariableValue with modeId
    // 4. Return chain + resolved value
  },
  { annotations: { readOnlyHint: true } }
);
```

**Expected response:**
```json
{
  "variableId": "VariableID:8:2258",
  "name": "action/primary",
  "chain": [
    { "id": "VariableID:8:2258", "name": "action/primary" },
    { "id": "VariableID:3:441",  "name": "base/purple-600" }
  ],
  "resolvedValues": {
    "8:0": { "r": 0.427, "g": 0.267, "b": 0.988, "hex": "#6D44FC" },
    "8:1": { "r": 0.302, "g": 0.188, "b": 0.749, "hex": "#4D30BF" }
  }
}
```

---

## Gap 3 — figma_set_fills Has No Variable Binding Path

### What's Missing

`figma_set_fills` accepts only hex color strings. The plugin handler does:
```javascript
node.fills = processedFills; // literal paint objects, no setBoundVariableForPaint
```

To bind a variable to a fill, you must use `figma_execute` every session. This is the single most
common design token operation.

### Impact

High. Every design token binding in automated workflows falls back to `figma_execute`.

### Additional Context (March 2026)

**Must use `setFillsAsync()`** instead of `node.fills = ...` to avoid the PATTERN fill validation
bug (see Priority 0). The variable binding extension should adopt `setFillsAsync` as the assignment
mechanism.

**`setBoundVariableForPaint` does NOT work on paint styles** — only on transient paint objects being
assigned to `node.fills`. This is confirmed from the official forum. The implementation below is
correct (assigning to node.fills, not to a style).

**Use async variable methods** — `getVariableByIdAsync` and `getLocalVariablesAsync` (sync variants
are deprecated).

### Proposed Extension to `figma_set_fills`

Extend the fill schema to accept an optional `variableId` field. When present, resolve the variable
and call `setBoundVariableForPaint` instead of assigning a raw color:

```javascript
// Extended schema (server-side):
fills: z.array(z.union([
  z.object({
    type: z.literal('SOLID'),
    color: z.string().describe("Hex color (e.g. '#FF0000')")
  }),
  z.object({
    type: z.literal('SOLID'),
    variableId: z.string().describe("Variable ID to bind (e.g. 'VariableID:8:2258'). " +
      "The resolved color is used as the base paint so the node renders correctly " +
      "even before Figma resolves the binding.")
  })
]))
```

**Plugin handler addition:**
```javascript
// In SET_NODE_FILLS, for each fill:
if (fill.variableId) {
  const variable = await figma.variables.getVariableByIdAsync(fill.variableId); // async — not deprecated
  if (!variable) throw new Error('Variable not found: ' + fill.variableId);

  // Resolve to concrete color for base paint (avoids black fallback bug)
  const allVars = await figma.variables.getLocalVariablesAsync(); // async — not deprecated
  const byId = {};
  for (const v of allVars) byId[v.id] = v;
  const resolved = resolveAliasChain(fill.variableId, byId);

  const basePaint = { type: 'SOLID', color: resolved, opacity: 1 };
  processedFills.push(figma.variables.setBoundVariableForPaint(basePaint, 'color', variable));
} else {
  // existing hex path
}

// Use setFillsAsync (not direct assignment) to avoid PATTERN fill validation bug:
await node.setFillsAsync(processedFills);
```

---

## Gap 4 — LINT_DESIGN Does Not Resolve Variable Bindings

### What's Missing

`LINT_DESIGN` reads `fills[i].color` directly — the raw base paint RGB — for contrast calculations.
If a fill is bound to a variable, and the base paint is `{r:0,g:0,b:0}` (black), the linter reports
black as the foreground color even if the actual rendered color is purple.

Also missing: SC 1.4.11 (non-text contrast — UI component boundaries against adjacent backgrounds).
This is critical for validating input borders, focus rings, and dividers.

### Proposed Upgrades

1. **Variable-aware contrast:** Before computing contrast, check `fills[i].boundVariables?.color`.
   If present, resolve the alias chain to get the true RGBA.

2. **Mode-specific linting:** Accept a `modeId` parameter so the linter can check contrast in
   Dark mode specifically.

3. **SC 1.4.11 rule:** Add a `wcag-non-text-contrast` rule that checks border/stroke colors
   against their adjacent background (3:1 minimum).

```javascript
// In walkNode, for wcag-contrast:
let fgColor = fills[fci].color;

// Override with resolved variable if bound
const boundFillVar = fills[fci].boundVariables?.color;
if (boundFillVar) {
  const resolved = await resolveVariableInContext(boundFillVar.id, msg.modeId);
  if (resolved) fgColor = resolved;
}

const ratio = lintContrastRatio(fgColor.r, fgColor.g, fgColor.b, bg.r, bg.g, bg.b);
```

---

## Gap 5 — Batch Node State Read

### What's Missing

`figma_get_node_state` (Gap 1) reads one node at a time. When auditing a component set with 15+
variants, you need all their fills in one call.

### Proposed Tool: `figma_batch_get_node_states`

```javascript
server.tool(
  "figma_batch_get_node_states",
  "Read fills, strokes, and bound variable IDs from multiple nodes in one call. " +
  "Use instead of calling figma_get_node_state in a loop — 10-50x faster for bulk audits.",
  {
    nodeIds: z.array(z.string()).describe("Array of node IDs"),
  },
  handler,
  { annotations: { readOnlyHint: true } }
);
```

---

## Minor: enrichment-service.js Bug

In `enrichVariables`, `resolveVariableValue` is called without a `modeId`, so all modes in
`resolved_values` receive the same default-mode value. The `StyleValueResolver` needs a
mode-aware variant of `resolveVariableValue(variable, allVars, maxDepth, modeId)`.

Fix is ~5 lines in `style-resolver.js`.

**Status (March 2026):** v1.17.1 (released March 22 2026) includes a fix described as "Variable
alias resolution at all verbosity levels now correctly returns resolved hex values instead of empty
objects." Verify whether the per-mode modeId passing is fully corrected or only the empty-object
surface symptom was fixed. If only the surface symptom was fixed, the underlying per-mode bug
(all modes returning the same default-mode value) may still be present.

---

## Priority Summary

> Updated March 24 2026 after live research. Two Priority 0 items added based on active upstream bugs.

| Priority | Gap | Both sides needed? | Complexity | Notes |
|---|---|---|---|---|
| **0** | Pattern fill `setFillsAsync` fix | Plugin only | Trivial | Blocks all fill ops on modern files |
| **0** | `$TMPDIR` vs `/tmp` port bug | Server only | Trivial | Active macOS connection failures |
| 1 | `figma_get_node_state` | Yes (plugin + server) | Medium | Most impactful diagnostic tool |
| 2 | Variable binding in `figma_set_fills` | Yes (plugin + server) | Medium | Must use `setFillsAsync` + async methods |
| 3 | `figma_resolve_variable` | Server only (logic exists) | Low | Add cross-collection mode name matching |
| 4 | Variable-aware LINT_DESIGN contrast | Plugin only | Medium | Use `getVariableByIdAsync` (deprecated sync) |
| 5 | `figma_batch_get_node_states` | Yes (plugin + server) | Low (extends Gap 1) | |
| 6 | enrichment-service modeId bug | Server only | Trivial | Verify if v1.17.1 fully fixed this |
