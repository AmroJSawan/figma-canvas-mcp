/**
 * Cloud WebSocket Relay — Durable Object
 *
 * Bridges the Figma Desktop Bridge plugin to the cloud MCP server.
 * The plugin connects via WebSocket (hibernation-aware); the MCP DO
 * sends commands via fetch() RPC and receives responses.
 *
 * Routes:
 *   /ws/connect   — WebSocket upgrade from plugin (paired via code)
 *   /relay/command — RPC from MCP DO → plugin (holds response open)
 *   /relay/status  — Connection & file info query
 */
import { DurableObject } from 'cloudflare:workers';
export interface RelayFileInfo {
    fileName: string;
    fileKey: string | null;
    currentPage?: string;
    currentPageId?: string;
    connectedAt: number;
}
/**
 * Generate a 6-character alphanumeric pairing code (uppercase).
 */
export declare function generatePairingCode(): string;
export declare class PluginRelayDO extends DurableObject {
    private pluginWs;
    private fileInfo;
    private pendingRequests;
    private requestIdCounter;
    /**
     * Incoming fetch handler — dispatches to routes.
     */
    fetch(request: Request): Promise<Response>;
    private handlePluginConnect;
    /**
     * Hibernation callback — incoming message from plugin WebSocket.
     */
    webSocketMessage(ws: WebSocket, message: string | ArrayBuffer): void;
    /**
     * Hibernation callback — WebSocket closed.
     */
    webSocketClose(ws: WebSocket, code: number, reason: string, wasClean: boolean): void;
    /**
     * Hibernation callback — WebSocket error.
     */
    webSocketError(ws: WebSocket, error: unknown): void;
    private handleDisconnect;
    private handleRelayCommand;
    private handleRelayStatus;
}
//# sourceMappingURL=cloud-websocket-relay.d.ts.map