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
import { logger } from './logger.js';
export class FigmaMCPClient {
    constructor() {
        this.baseUrl = 'http://127.0.0.1:3845';
        this.isConnected = false;
        this.tools = [];
        this.connectionError = null;
        this.requestId = 0;
    }
    /**
     * Initialize connection to Figma Desktop MCP server
     * Tests connectivity by calling tools/list
     */
    async connect() {
        try {
            logger.info('Attempting to connect to Figma Desktop MCP server...');
            // Test connection by listing tools
            await this.discoverTools();
            this.isConnected = true;
            this.connectionError = null;
            logger.info('Successfully connected to Figma Desktop MCP server');
        }
        catch (error) {
            this.isConnected = false;
            this.connectionError = error instanceof Error ? error : new Error(String(error));
            logger.warn({ error: this.connectionError }, 'Failed to connect to Figma Desktop MCP server. Annotations and some features will not be available. Make sure Figma Desktop is running with MCP enabled.');
            // Don't throw - we want to gracefully degrade
        }
    }
    /**
     * Make a JSON-RPC request to Figma MCP server
     */
    async makeRequest(method, params) {
        const request = {
            jsonrpc: '2.0',
            id: ++this.requestId,
            method,
            params
        };
        const response = await fetch(`${this.baseUrl}/mcp`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(request),
        });
        if (!response.ok) {
            throw new Error(`HTTP ${response.status}: ${response.statusText}`);
        }
        const data = await response.json();
        if (data.error) {
            throw new Error(`MCP Error ${data.error.code}: ${data.error.message}`);
        }
        return data.result;
    }
    /**
     * Discover tools available from Figma MCP
     */
    async discoverTools() {
        try {
            const result = await this.makeRequest('tools/list');
            this.tools = result.tools || [];
            logger.info({ toolCount: this.tools.length, tools: this.tools.map(t => t.name) }, 'Discovered tools from Figma Desktop MCP');
        }
        catch (error) {
            logger.error({ error }, 'Failed to discover tools from Figma Desktop MCP');
            this.tools = [];
            throw error; // Re-throw so connect() can handle it
        }
    }
    /**
     * Get list of available tools from Figma MCP
     */
    getTools() {
        return this.tools;
    }
    /**
     * Check if connected to Figma MCP
     */
    isAvailable() {
        return this.isConnected;
    }
    /**
     * Get connection error if any
     */
    getConnectionError() {
        return this.connectionError;
    }
    /**
     * Call a tool on Figma MCP
     */
    async callTool(name, args) {
        if (!this.isConnected) {
            throw new Error('Not connected to Figma Desktop MCP. Make sure Figma Desktop is running with MCP enabled.');
        }
        try {
            logger.info({ toolName: name, args }, 'Calling Figma Desktop MCP tool');
            const result = await this.makeRequest('tools/call', {
                name,
                arguments: args,
            });
            logger.info({ toolName: name, success: true }, 'Figma Desktop MCP tool call successful');
            return result;
        }
        catch (error) {
            logger.error({ error, toolName: name }, 'Figma Desktop MCP tool call failed');
            throw error;
        }
    }
    /**
     * Disconnect from Figma MCP
     * (No-op for HTTP-based client, but kept for API compatibility)
     */
    async disconnect() {
        this.isConnected = false;
        this.tools = [];
        logger.info('Disconnected from Figma Desktop MCP server');
    }
}
// Singleton instance
let figmaMCPClient = null;
/**
 * Get or create the Figma MCP client instance
 */
export async function getFigmaMCPClient() {
    if (!figmaMCPClient) {
        figmaMCPClient = new FigmaMCPClient();
        await figmaMCPClient.connect();
    }
    return figmaMCPClient;
}
/**
 * Disconnect and cleanup the Figma MCP client
 */
export async function disconnectFigmaMCPClient() {
    if (figmaMCPClient) {
        await figmaMCPClient.disconnect();
        figmaMCPClient = null;
    }
}
//# sourceMappingURL=figma-mcp-client.js.map