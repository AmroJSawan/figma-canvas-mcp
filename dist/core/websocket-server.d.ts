/**
 * WebSocket Bridge Server (Multi-Client)
 *
 * Creates a WebSocket server that multiple Desktop Bridge plugin instances connect to.
 * Each instance represents a different Figma file and is identified by its fileKey
 * (sent via FILE_INFO on connection). Per-file state (selection, document changes,
 * console logs) is maintained independently.
 *
 * Active file tracking: The "active" file is automatically switched when the user
 * interacts with a file (selection/page changes) or can be set explicitly via
 * setActiveFile(). All backward-compatible getters return data from the active file.
 *
 * Data flow: MCP Server ←WebSocket→ ui.html ←postMessage→ code.js ←figma.*→ Figma
 */
import { WebSocket } from 'ws';
import { EventEmitter } from 'events';
import type { ConsoleLogEntry } from './types/index.js';
export interface WebSocketServerOptions {
    port: number;
    host?: string;
}
export interface ConnectedFileInfo {
    fileName: string;
    fileKey: string | null;
    currentPage?: string;
    currentPageId?: string;
    editorType?: 'figma' | 'figjam' | 'dev';
    connectedAt: number;
}
export interface SelectionInfo {
    nodes: Array<{
        id: string;
        name: string;
        type: string;
        width?: number;
        height?: number;
    }>;
    count: number;
    page: string;
    timestamp: number;
}
export interface DocumentChangeEntry {
    hasStyleChanges: boolean;
    hasNodeChanges: boolean;
    changedNodeIds: string[];
    changeCount: number;
    timestamp: number;
}
/**
 * Per-file client connection state.
 * Each Figma file with the Desktop Bridge plugin open gets its own ClientConnection.
 */
export interface ClientConnection {
    ws: WebSocket;
    fileInfo: ConnectedFileInfo;
    selection: SelectionInfo | null;
    documentChanges: DocumentChangeEntry[];
    consoleLogs: ConsoleLogEntry[];
    lastActivity: number;
    gracePeriodTimer: ReturnType<typeof setTimeout> | null;
}
export declare class FigmaWebSocketServer extends EventEmitter {
    private wss;
    private httpServer;
    /** Named clients indexed by fileKey — each represents a connected Figma file */
    private clients;
    /** Clients awaiting FILE_INFO identification, mapped to their pending timeout */
    private _pendingClients;
    /** The fileKey of the currently active (targeted) file */
    private _activeFileKey;
    private pendingRequests;
    private requestIdCounter;
    private options;
    private _isStarted;
    private _startedAt;
    private consoleBufferSize;
    private documentChangeBufferSize;
    /** Cached plugin UI HTML content — loaded once and served to bootloader requests */
    private _pluginUIContent;
    constructor(options: WebSocketServerOptions);
    /**
     * Handle HTTP requests on the same port as WebSocket.
     * Serves plugin UI content for the bootloader and health checks.
     */
    private handleHttpRequest;
    /**
     * Start the HTTP + WebSocket server.
     * HTTP serves the plugin UI content; WebSocket handles plugin communication.
     */
    start(): Promise<void>;
    /**
     * Find a named client connection by its WebSocket reference
     */
    private findClientByWs;
    /**
     * Handle incoming message from a plugin UI WebSocket connection
     */
    private handleMessage;
    /**
     * Handle FILE_INFO message — promotes pending clients to named clients.
     * This is the critical multi-client identification step: each plugin reports
     * its fileKey on connect, allowing the server to track multiple files.
     */
    private handleFileInfo;
    /**
     * Handle a client WebSocket disconnecting.
     * Starts a grace period before removing the client to allow reconnection.
     */
    private handleClientDisconnect;
    /**
     * Send a command to a plugin UI and wait for the response.
     * By default targets the active file. Pass targetFileKey to target a specific file.
     */
    sendCommand(method: string, params?: Record<string, any>, timeoutMs?: number, targetFileKey?: string): Promise<any>;
    /**
     * Check if any named client is connected (transport availability check)
     */
    isClientConnected(): boolean;
    /**
     * Whether the server has been started
     */
    isStarted(): boolean;
    /**
     * Get the bound address info (port, host, family).
     * Only available after the server has started listening.
     * Returns the actual port — critical when using port 0 for OS-assigned ports.
     */
    address(): import('net').AddressInfo | null;
    /**
     * Get info about the currently active Figma file.
     * Returns null if no file is active or connected.
     */
    getConnectedFileInfo(): ConnectedFileInfo | null;
    /**
     * Get the current user selection in the active Figma file
     */
    getCurrentSelection(): SelectionInfo | null;
    /**
     * Get buffered document change events from the active file
     */
    getDocumentChanges(options?: {
        count?: number;
        since?: number;
    }): DocumentChangeEntry[];
    /**
     * Clear document change buffer for the active file
     */
    clearDocumentChanges(): number;
    /**
     * Get console logs from the active file with optional filtering
     */
    getConsoleLogs(options?: {
        count?: number;
        level?: ConsoleLogEntry['level'] | 'all';
        since?: number;
    }): ConsoleLogEntry[];
    /**
     * Clear console log buffer for the active file
     */
    clearConsoleLogs(): number;
    /**
     * Get console monitoring status for the active file
     */
    getConsoleStatus(): {
        isMonitoring: boolean;
        anyClientConnected: boolean;
        logCount: number;
        bufferSize: number;
        workerCount: number;
        oldestTimestamp: number;
        newestTimestamp: number;
    };
    /**
     * Get info about all connected Figma files.
     * Returns an array of ConnectedFileInfo for each file with an active WebSocket.
     */
    getConnectedFiles(): (ConnectedFileInfo & {
        isActive: boolean;
    })[];
    /**
     * Set the active file by fileKey. Returns true if the file is connected.
     */
    setActiveFile(fileKey: string): boolean;
    /**
     * Get the currently active file's key
     */
    getActiveFileKey(): string | null;
    /**
     * Get the editor type of the currently active file.
     * Returns 'figma' if no file is connected or editorType wasn't reported.
     */
    getEditorType(): 'figma' | 'figjam' | 'dev';
    /**
     * Reject pending requests that were sent to a specific file
     */
    private rejectPendingRequestsForFile;
    /**
     * Reject all pending requests (used during shutdown)
     */
    private rejectPendingRequests;
    /**
     * Stop the server and clean up all connections
     */
    stop(): Promise<void>;
}
//# sourceMappingURL=websocket-server.d.ts.map