/**
 * Design System Kit Tool
 * MCP tool that orchestrates existing Figma API tools to produce a structured
 * design system specification — tokens, components, styles — in a single call.
 *
 * This enables AI code generation tools (Figma Make, v0, Cursor, Claude, etc.)
 * to generate code with structural fidelity to the real design system.
 */
import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import type { FigmaAPI } from "./figma-api.js";
export declare function registerDesignSystemTools(server: McpServer, getFigmaAPI: () => Promise<FigmaAPI>, getCurrentUrl: () => string | null, variablesCache?: Map<string, {
    data: any;
    timestamp: number;
}>, options?: {
    isRemoteMode?: boolean;
}): void;
//# sourceMappingURL=design-system-tools.d.ts.map