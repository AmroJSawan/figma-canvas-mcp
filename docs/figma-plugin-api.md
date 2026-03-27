# Figma Plugin API — Reference & Best Practices

> Research compiled March 2026. Sources: developers.figma.com, figma.com/plugin-docs, Figma community forums.
> Last enriched: March 24 2026 via live fetch of developers.figma.com/docs/plugins/updates/ and figma.variables API reference.

---

## Architecture

### How Plugins Run

Figma plugins run on two separate threads that cannot directly share memory:

| Thread | Access | Cannot access |
|---|---|---|
| **Main thread (sandbox)** | Figma scene (nodes, variables, styles) | Browser APIs, DOM, XHR |
| **iframe (UI)** | Full browser APIs, DOM, fetch | Figma scene directly |

Communication between them is via `postMessage` only. The sandbox is a QuickJS environment — ES6+, Promises, Uint8Array, basic console — but no `AsyncFunction` constructor. Wrap async code in `eval("(async function() { ... })()")` instead.

**Key implication for MCP bridges:** All Figma API calls must happen in the main thread sandbox. The iframe (ui.html) acts as the WebSocket/network relay because the sandbox cannot open sockets.

### Page Loading

Only the current page is loaded at plugin start. Accessing `page.children` on an unloaded page throws. Always:

```javascript
await figma.loadAllPagesAsync(); // before cross-page traversal
```

Figma strongly discourages full-document traversal unless the operation is document-wide — it causes significant delays on large files. Load only the pages you need.

---

## Variables API

### Core Methods

> **Deprecation (confirmed March 2026):** All sync methods (`getVariableById`, `getLocalVariables`,
> `getLocalVariableCollections`, `getVariableCollectionById`) are officially deprecated. Always use
> the `*Async` versions below.

```javascript
// Read (use these — sync equivalents are deprecated)
const collections = await figma.variables.getLocalVariableCollectionsAsync();
const variables   = await figma.variables.getLocalVariablesAsync();          // optionally filter by type
const variable    = await figma.variables.getVariableByIdAsync(id);
const collection  = await figma.variables.getVariableCollectionByIdAsync(id);

// Create
const col = figma.variables.createVariableCollection('My Tokens');
const v   = figma.variables.createVariable('color/primary', col, 'COLOR');

// Aliases (cross-variable references)
const alias    = figma.variables.createVariableAlias(variable);         // creates VARIABLE_ALIAS object
const aliasById = await figma.variables.createVariableAliasByIdAsync(variableId); // NEW — no Variable object needed
const v2       = await figma.variables.importVariableByKeyAsync(key);  // from team library

// Enterprise: extended collections (Update 121, Nov 2025)
const ext = await figma.variables.extendLibraryCollectionByKeyAsync(collectionKey, name);
```

**Complete `figma.variables` method list (confirmed live, March 2026):**
1. `getVariableByIdAsync(id)` — `Promise<Variable | null>`
2. `getVariableById(id)` — **deprecated**
3. `getVariableCollectionByIdAsync(id)` — `Promise<VariableCollection | null>`
4. `getVariableCollectionById(id)` — **deprecated**
5. `getLocalVariablesAsync(type?)` — `Promise<Variable[]>`
6. `getLocalVariables(type?)` — **deprecated**
7. `getLocalVariableCollectionsAsync()` — `Promise<VariableCollection[]>`
8. `getLocalVariableCollections()` — **deprecated**
9. `createVariable(name, collection, resolvedType)` — `Variable`
10. `createVariableCollection(name)` — `VariableCollection`
11. `extendLibraryCollectionByKeyAsync(collectionKey, name)` — `Promise<ExtendedVariableCollection>`
12. `createVariableAlias(variable)` — `VariableAlias`
13. `createVariableAliasByIdAsync(variableId)` — `Promise<VariableAlias>` *(new)*
14. `setBoundVariableForPaint(paint, field, variable)` — `SolidPaint`
15. `setBoundVariableForEffect(effect, field, variable)` — `Effect`
16. `setBoundVariableForLayoutGrid(grid, field, variable)` — `LayoutGrid`
17. `importVariableByKeyAsync(key)` — `Promise<Variable>`

**`resolveVariableValue()` does NOT exist** — confirmed on the live API reference. Manual alias chain traversal is the only path (see Alias Chain Resolution below).

### Variable Structure

```javascript
{
  id: 'VariableID:8:2258',
  name: 'action/primary',
  resolvedType: 'COLOR',          // COLOR | FLOAT | STRING | BOOLEAN
  variableCollectionId: '...',
  valuesByMode: {
    '8:0': { r: 0.427, g: 0.267, b: 0.988, a: 1 },   // concrete value
    '8:1': { type: 'VARIABLE_ALIAS', id: 'VariableID:3:441' }  // alias to another var
  },
  scopes: ['ALL_FILLS'],
  description: '',
  hiddenFromPublishing: false
}
```

### Alias Chain Resolution

Alias chains can be arbitrarily deep. To resolve a variable to its concrete value, traverse until the value is no longer a `VARIABLE_ALIAS`:

```javascript
function resolveVar(variableId, allVarsById, modeId) {
  const v = allVarsById[variableId];
  if (!v) return null;
  const modes = Object.keys(v.valuesByMode);
  const target = modeId && v.valuesByMode[modeId] ? modeId : modes[0];
  const val = v.valuesByMode[target];
  if (val && val.type === 'VARIABLE_ALIAS') {
    return resolveVar(val.id, allVarsById, modeId);
  }
  return val; // concrete RGBA, number, string, or boolean
}
```

**Critical:** Always build a full `id -> variable` map first so resolution is O(1) per step, not O(n).

### Cross-Collection modeId Scoping (Critical Gotcha)

modeId strings are **collection-scoped** — a modeId from collection A is meaningless in collection B.
When an alias crosses a collection boundary (e.g. a semantic token pointing into a primitive token
collection), you cannot match by modeId string. You must match by **mode name**:

```javascript
function resolveAcrossCollections(variableId, allVarsById, allCollectionsById, targetModeName, depth = 0) {
  if (depth > 10) return null; // guard against circular aliases
  const v = allVarsById[variableId];
  if (!v) return null;

  // Find the modeId in THIS variable's collection that matches the target mode name
  const collection = allCollectionsById[v.variableCollectionId];
  const mode = collection?.modes.find(m => m.name === targetModeName) ?? collection?.modes[0];
  if (!mode) return null;

  const val = v.valuesByMode[mode.modeId];
  if (!val) return null;
  if (val.type === 'VARIABLE_ALIAS') {
    return resolveAcrossCollections(val.id, allVarsById, allCollectionsById, targetModeName, depth + 1);
  }
  return val;
}
```

**Example:** A semantic token `action/primary` (collection "Semantic", mode "Light", modeId "8:0") points
to primitive `base/purple-600` (collection "Primitives", mode "Default", modeId "3:0"). When crossing
collections, look up the mode by name ("Light" → find closest match in "Primitives" collection), not
by reusing modeId "8:0" directly.

### Extended Variable Collections (Update 121, Nov 2025, Enterprise)

Enterprise-only inheritance model. An `ExtendedVariableCollection` extends a library collection,
inheriting its modes and values, with per-variable overrides:

```javascript
const ext = await figma.variables.extendLibraryCollectionByKeyAsync(collectionKey, 'Brand Override');
// Read values per mode for extended collections:
const values = await variable.valuesByModeForCollectionAsync(ext);
// Remove a per-mode override:
variable.removeOverrideForMode(modeId);
// Check inheritance:
ext.variableOverrides; // map of variable overrides
// mode.parentModeId — links a mode back to its parent in the source collection
```

When resolving aliases that cross into extended collections, account for `mode.parentModeId` to
trace the inheritance chain.

---

## Binding Variables to Nodes

### Reading Bindings

The `fills` array contains resolved paint objects (raw RGB). Variable binding information lives separately in `boundVariables`:

```javascript
// WRONG — only gets raw RGB, no variable info
const color = node.fills[0].color; // { r:0, g:0, b:0 } — may not reflect bound token

// CORRECT — get the bound variable ID from the paint's boundVariables
const fillBinding = node.fills[0]?.boundVariables?.color;
// => { type: 'VARIABLE_ALIAS', id: 'VariableID:8:2258' }

// For node-level bindings (width, height, opacity, etc.)
const widthBinding = node.boundVariables?.width;
// => { type: 'VARIABLE_ALIAS', id: 'VariableID:...' }
```

**Important:** For fills and strokes, check `paint.boundVariables` (on the paint object). For node-level fields (width, opacity), check `node.boundVariables`.

For text nodes, typography variable bindings are arrays (because you can bind to substrings):
```javascript
const fontSizeBinding = node.boundVariables?.fontSize?.[0]; // first bound range
```

### Writing Bindings — setBoundVariable

For node-level properties (width, height, opacity, strokeWeight, cornerRadius, etc.):

```javascript
node.setBoundVariable('width', widthVariable);
node.setBoundVariable('width', null); // unbind
```

Supported fields include: `width`, `height`, `minWidth`, `maxWidth`, `minHeight`, `maxHeight`, `opacity`, `strokeWeight`, `itemSpacing`, `paddingTop/Right/Bottom/Left`, `cornerRadius`, `topLeftRadius`, `topRightRadius`, `bottomLeftRadius`, `bottomRightRadius`, `fontSize`, `fontFamily`, `fontStyle`, `fontWeight`, `lineHeight`, `letterSpacing`, `paragraphSpacing`, `paragraphIndent`.

### Writing Bindings — setBoundVariableForPaint

For fill/stroke color bindings, fills are immutable — you must clone, modify, and reassign:

```javascript
// CORRECT pattern
const fills = [...node.fills]; // clone
fills[0] = figma.variables.setBoundVariableForPaint(fills[0], 'color', colorVariable);
node.fills = fills;

// For a new fill, always use the resolved color as the base (not black)
const resolved = resolveVar(colorVariable.id, allVarsById);
const basePaint = { type: 'SOLID', color: { r: resolved.r, g: resolved.g, b: resolved.b }, opacity: 1 };
const boundPaint = figma.variables.setBoundVariableForPaint(basePaint, 'color', colorVariable);
node.fills = [boundPaint];
```

**Known gotcha — black fallback:** If you pass `{ r:0, g:0, b:0 }` as the base paint and the variable binding doesn't resolve immediately in Figma's runtime, the node renders black. Always use the actual resolved color as the base.

**Known gotcha — paint object reuse:** Never reuse the same bound paint object across multiple nodes. Create a fresh one for each:

```javascript
// WRONG — only first node reliably gets the binding
const p = figma.variables.setBoundVariableForPaint(base, 'color', v);
for (const node of nodes) node.fills = [p];

// CORRECT — fresh paint per node
for (const node of nodes) {
  node.fills = [figma.variables.setBoundVariableForPaint({...base}, 'color', v)];
}
```

**Known limitation:** `setBoundVariableForPaint` cannot update existing paint styles (only node fills). And it does not work for gradient stops — each stop requires its own binding mechanism.

**Known limitation (confirmed from forum):** `setBoundVariableForPaint` does NOT work on paints
belonging to stored paint styles (`figma.getLocalPaintStyles()[n].paints`). It only works on
transient paint objects being assigned directly to `node.fills`. This is a common source of
developer confusion — the API silently does nothing when applied to style paints.

`null` is supported to detach:
```javascript
fills[0] = figma.variables.setBoundVariableForPaint(fills[0], 'color', null);
```

### Similarly: Effects and Layout Grids

```javascript
figma.variables.setBoundVariableForEffect(effect, field, variable);
figma.variables.setBoundVariableForLayoutGrid(grid, field, variable);
```

---

## Component Sets and Variants

Component sets use `layoutMode: 'NONE'` — variants are manually positioned at absolute x/y coordinates. Figma does not auto-arrange them. When adding variants programmatically, always set `x` and `y` explicitly.

Variant names follow the pattern `"Prop1=Value1, Prop2=Value2"`. Parse/build with:
```javascript
const props = variant.name.split(',').map(p => {
  const [k, v] = p.trim().split('=');
  return { key: k.trim(), value: v.trim() };
});
```

---

## Node Types Relevant to Design Systems

| Type | Key properties |
|---|---|
| `FRAME` | fills, strokes, layoutMode, padding, itemSpacing, cornerRadius, boundVariables |
| `COMPONENT` | all Frame props + componentPropertyDefinitions |
| `COMPONENT_SET` | children (variants), layoutMode = 'NONE', variantGroupProperties |
| `INSTANCE` | componentProperties, mainComponent |
| `TEXT` | characters, fontSize, fontName, fills, boundVariables (per-range) |
| `SECTION` | resizeWithoutConstraints(w, h) — use instead of resize() |

---

## Performance Patterns

```javascript
// Batch: build maps before loops, not inside
const varMap = {};
for (const v of await figma.variables.getLocalVariablesAsync()) varMap[v.name] = v;

// Yield to event loop in long operations to prevent UI freeze
for (let i = 0; i < items.length; i++) {
  processItem(items[i]);
  if (i % 50 === 0) await new Promise(r => setTimeout(r, 0));
}

// Load fonts before any text manipulation
await figma.loadFontAsync({ family: 'Inter', style: 'Regular' });
```

---

## Recent API Updates (2025-2026)

> Dates and details confirmed via live fetch of developers.figma.com/docs/plugins/updates/ on March 24 2026.

| Update | Date | Change |
|---|---|---|
| **123** | Jan 26 2026 | `figma.createTextPath()`, `figma.transformGroup()`, `figma.loadBrushesAsync()`, variable width strokes; **pattern fill support via `setFillsAsync()` / `setStrokesAsync()`** (new async fill methods) |
| **122** | Jan 14 2026 | `rootVariableCollectionId` on extended collections; `slides` + `buzz` as valid `editorType` |
| **121** | Nov 20 2025 | `ExtendedVariableCollection` (enterprise): `extendLibraryCollectionByKeyAsync()`, `valuesByModeForCollectionAsync()`, `removeOverrideForMode()`, `mode.parentModeId`, `variable.setValueForMode()` updated for extended collections |
| **120** | Nov 6 2025 | Grid HUG sizing, `fr` track values; `resetOverrides` deprecated → `removeOverrides` |
| **119** | Oct 23 2025 | Buzz editor type (`figma.editorType === 'buzz'`), `figma.buzz` API, canvas grid API |
| **118** | Oct 9 2025 | `fontStyle` in `getStyledTextSegments()` |
| **117** | Aug 13 2025 | Grid gap types added to `VariableBindableNodeField` and `AnnotationProperty` |
| **116** | Jul 17 2025 | `boundVariables` added to Noise/Texture effects; new Glass effect (beta, Frame-only) |
| **114** | Jun 2025 | New stroke cap types: `DIAMOND_FILLED`, `TRIANGLE_FILLED`, `CIRCLE_FILLED`; `color` on Noise effects |

**New node types (beta, 2025):** `TEXT_PATH`, `TRANSFORM_GROUP`, `TEXTURE`, `NOISE`, `PATTERN`, `PROGRESSIVE` effect types.

**New in 2026:** `complexStrokeProperties`, `variableWidthStrokeProperties`, pattern fills.

### Critical Bug — Pattern Fill Validation (Update 123 era)

**`node.fills = fillsClone` throws a validation error** when ANY fill in the file is of type `PATTERN`.
The discriminator does not recognize the `PATTERN` type, causing a runtime exception even when only
trying to modify a different (non-pattern) fill on the same or another node.

**Impact:** Any plugin manipulating fills on files that contain pattern fills will crash.

**Workaround:** Use the new async `setFillsAsync()` method (introduced Update 123), or defensively
filter out PATTERN fills before reassigning:

```javascript
// Guard pattern — filter PATTERN fills before assignment
const safeFills = node.fills.filter(f => f.type !== 'PATTERN');
// ... modify safeFills ...
node.fills = safeFills; // still may throw if other nodes in file have PATTERN fills

// Preferred: use the new async setter (Update 123+)
await node.setFillsAsync(processedFills);
```

This bug **directly affects `figma_set_fills` and any fill variable binding enhancement** — the plugin
handler must guard against it.

---

## Manifest Configuration

```json
{
  "name": "Your Plugin",
  "id": "unique-plugin-id",
  "api": "1.0.0",
  "main": "code.js",
  "ui": "ui.html",
  "editorType": ["figma", "figjam", "slides", "dev"],
  "capabilities": ["inspect"],
  "enablePrivatePluginApi": true,
  "permissions": ["teamlibrary"],
  "documentAccess": "dynamic-page",
  "networkAccess": {
    "allowedDomains": ["http://localhost", "ws://localhost:9223"]
  }
}
```

`documentAccess: "dynamic-page"` means only the current page is loaded at startup. Use `figma.loadAllPagesAsync()` when needed.

---

## Sources

- [Plugin API Introduction](https://developers.figma.com/docs/plugins/)
- [Working with Variables](https://developers.figma.com/docs/plugins/working-with-variables/)
- [How Plugins Run](https://developers.figma.com/docs/plugins/how-plugins-run/)
- [Accessing the Document](https://developers.figma.com/docs/plugins/accessing-document/)
- [Shared Node Properties](https://developers.figma.com/docs/plugins/api/node-properties/)
- [setBoundVariable](https://developers.figma.com/docs/plugins/api/properties/nodes-setboundvariable/)
- [Plugin API Updates](https://developers.figma.com/docs/plugins/updates/)
- [Forum: How to use setBoundVariableForPaint](https://forum.figma.com/t/how-to-use-setboundvariableforpaint/46273)
- [Forum: How to get applied color variable](https://forum.figma.com/ask-the-community-7/how-to-get-the-applied-color-variable-in-a-figma-plugin-37783)
