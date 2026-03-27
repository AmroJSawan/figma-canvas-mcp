# figma-canvas-mcp — Research & Documentation

This directory contains research compiled March 2026 covering the Figma Plugin API,
the MCP ecosystem, and enhancement opportunities for this project.

## Documents

### [figma-plugin-api.md](./figma-plugin-api.md)
Complete reference for the Figma Plugin API as it stands in 2025-2026:
- Plugin execution architecture (sandbox vs iframe, message passing)
- Variables API: reading, creating, alias chain resolution
- Variable bindings: `boundVariables`, `setBoundVariable`, `setBoundVariableForPaint`
- Known gotchas: black fallback bug, paint object reuse, immutability
- Component sets, variants, node types
- Performance patterns
- Full API changelog 2025-2026

### [figma-mcp-landscape.md](./figma-mcp-landscape.md)
Overview of all Figma MCP approaches as of March 2026:
- Official Figma MCP server: tools, rate limits, capabilities, limitations
- Community WebSocket bridge (figma-console-mcp architecture)
- claude-talk-to-figma-mcp (alternative community tool)
- Browser CDP approach (no plugin needed)
- Figma REST API relevant endpoints and breaking changes 2024-2026
- Decision guide: which approach to use when

### [mcp-tool-design.md](./mcp-tool-design.md)
MCP protocol specification and tool design best practices:
- Tool definition structure and required fields
- Naming rules and conventions
- Writing descriptions that work for agent tool selection
- Error handling: protocol errors vs tool execution errors
- Tool annotations (readOnly, destructive, idempotent)
- Output schema design
- When to add a tool vs use figma_execute
- Performance: batch over loops, verbosity levels
- Security considerations

### [enhancement-opportunities.md](./enhancement-opportunities.md)
Concrete gaps found in figma-console-mcp v1.17.3 with implementation specs:
1. `figma_get_node_state` — read fills + bound variable IDs from any node
2. `figma_resolve_variable` — traverse alias chains to concrete values
3. Variable binding in `figma_set_fills` — extend to accept `variableId`
4. Variable-aware LINT_DESIGN contrast checking
5. `figma_batch_get_node_states` — bulk version of #1
6. `enrichment-service.js` modeId bug fix

Each gap includes: root cause, impact assessment, proposed plugin handler code,
proposed MCP tool registration code, and expected response shape.
