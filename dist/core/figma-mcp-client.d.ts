/**
 * Figma MCP Client
 *
 * Connects to the official Figma Desktop MCP server and proxies requests.
 * This allows us to access Figma's official tools (like get_design_context with annotations)
 * while adding our own enhanced features.
 *
 * Note: This implementation uses fetch API for Cloudflare Workers compatibility
 * instead of the Node.js-based MCP SDK client.
 */
import type { Tool } from '@modelcontextprotocol/sdk/types.js';
export declare class FigmaMCPClient {
    private baseUrl;
    private isConnected;
    private tools;
    private connectionError;
    private requestId;
    /**
     * Initialize connection to Figma Desktop MCP server
     * Tests connectivity by calling tools/list
     */
    connect(): Promise<void>;
    /**
     * Make a JSON-RPC request to Figma MCP server
     */
    private makeRequest;
    /**
     * Discover tools available from Figma MCP
     */
    private discoverTools;
    /**
     * Get list of available tools from Figma MCP
     */
    getTools(): Tool[];
    /**
     * Check if connected to Figma MCP
     */
    isAvailable(): boolean;
    /**
     * Get connection error if any
     */
    getConnectionError(): Error | null;
    /**
     * Call a tool on Figma MCP
     */
    callTool(name: string, args: Record<string, unknown>): Promise<any>;
    /**
     * Disconnect from Figma MCP
     * (No-op for HTTP-based client, but kept for API compatibility)
     */
    disconnect(): Promise<void>;
}
/**
 * Get or create the Figma MCP client instance
 */
export declare function getFigmaMCPClient(): Promise<FigmaMCPClient>;
/**
 * Disconnect and cleanup the Figma MCP client
 */
export declare function disconnectFigmaMCPClient(): Promise<void>;
//# sourceMappingURL=figma-mcp-client.d.ts.map