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
import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
declare const TOKEN_BROWSER_URI = "ui://figma-console/token-browser";
/**
 * Generate the Token Browser HTML UI
 */
declare function generateTokenBrowserHTML(): string;
/**
 * Register the Token Browser MCP App with the server
 * Uses the official ext-apps helpers for proper MCP Apps protocol compatibility
 *
 * @param server - The MCP server instance
 * @param getVariablesHandler - Function to fetch variables data (from FigmaAPI or Desktop Bridge)
 */
export declare function registerTokenBrowserApp(server: McpServer, getVariablesHandler: (fileUrl?: string) => Promise<{
    variables: any[];
    collections: any[];
    [key: string]: any;
}>): void;
export { TOKEN_BROWSER_URI, generateTokenBrowserHTML };
//# sourceMappingURL=token-browser.d.ts.map