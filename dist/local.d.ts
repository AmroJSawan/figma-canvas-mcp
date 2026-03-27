#!/usr/bin/env node
/**
 * Figma Console MCP Server - Local Mode
 *
 * Entry point for local MCP server that connects to Figma Desktop
 * via the WebSocket Desktop Bridge plugin.
 *
 * This implementation uses stdio transport for MCP communication,
 * suitable for local IDE integrations and development workflows.
 *
 * Requirements:
 * - Desktop Bridge plugin open in Figma (Plugins → Development → Figma Desktop Bridge)
 * - FIGMA_ACCESS_TOKEN environment variable for API access
 */
/**
 * Local MCP Server
 * Connects to Figma Desktop and provides identical tools to Cloudflare mode
 */
declare class LocalFigmaConsoleMCP {
    private server;
    private browserManager;
    private consoleMonitor;
    private figmaAPI;
    private desktopConnector;
    private wsServer;
    private wsStartupError;
    /** The port the WebSocket server actually bound to (may differ from preferred if fallback occurred) */
    private wsActualPort;
    /** The preferred port requested (from env var or default) */
    private wsPreferredPort;
    /** Heartbeat timer that refreshes port file to prove this server is active */
    private wsHeartbeatTimer;
    private config;
    private variablesCache;
    constructor();
    /**
     * Get or create Figma API client
     */
    private getFigmaAPI;
    /**
     * Get or create Desktop Connector for write operations.
     * Returns the active WebSocket Desktop Bridge connector.
     */
    private getDesktopConnector;
    /**
     * Get the current Figma file URL from the best available source.
     * Priority: Browser URL (full URL with branch/node info) → WebSocket file identity (synthesized URL).
     * The synthesized URL is compatible with extractFileKey() and extractFigmaUrlInfo().
     */
    private getCurrentFileUrl;
    /**
     * Check if Figma Desktop is accessible via WebSocket
     */
    private checkFigmaDesktop;
    /** Stable plugin directory path (set during startup) */
    private stablePluginPath;
    /**
     * Resolve the path to the Desktop Bridge plugin manifest.
     * Prefers the stable directory (~/.figma-console-mcp/plugin/) over the npx cache path.
     */
    private getPluginPath;
    /**
     * Auto-connect to Figma Desktop at startup
     * Runs in background - never blocks or throws
     * Enables "get latest logs" workflow without manual setup
     */
    private autoConnectToFigma;
    /**
     * Initialize browser and console monitoring
     */
    private ensureInitialized;
    /**
     * Register all MCP tools
     */
    private registerTools;
    /**
     * Start the MCP server
     */
    start(): Promise<void>;
    /**
     * Cleanup and shutdown
     */
    shutdown(): Promise<void>;
}
export { LocalFigmaConsoleMCP };
//# sourceMappingURL=local.d.ts.map