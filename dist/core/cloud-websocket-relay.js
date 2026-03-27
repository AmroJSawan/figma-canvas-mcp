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
/**
 * Generate a 6-character alphanumeric pairing code (uppercase).
 */
export function generatePairingCode() {
    const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'; // No 0/O/1/I confusion
    let code = '';
    const arr = new Uint8Array(6);
    crypto.getRandomValues(arr);
    for (let i = 0; i < 6; i++) {
        code += chars[arr[i] % chars.length];
    }
    return code;
}
export class PluginRelayDO extends DurableObject {
    constructor() {
        super(...arguments);
        this.pluginWs = null;
        this.fileInfo = null;
        this.pendingRequests = new Map();
        this.requestIdCounter = 0;
    }
    /**
     * Incoming fetch handler — dispatches to routes.
     */
    async fetch(request) {
        const url = new URL(request.url);
        if (url.pathname === '/ws/connect') {
            return this.handlePluginConnect(request);
        }
        if (url.pathname === '/relay/command') {
            return this.handleRelayCommand(request);
        }
        if (url.pathname === '/relay/status') {
            return this.handleRelayStatus();
        }
        return new Response('Not found', { status: 404 });
    }
    // ==========================================================================
    // WebSocket — plugin connects here
    // ==========================================================================
    handlePluginConnect(request) {
        const upgradeHeader = request.headers.get('Upgrade');
        if (!upgradeHeader || upgradeHeader.toLowerCase() !== 'websocket') {
            return new Response('Expected WebSocket upgrade', { status: 426 });
        }
        const pair = new WebSocketPair();
        const [client, server] = Object.values(pair);
        // Accept using hibernation API so the DO can sleep between messages
        this.ctx.acceptWebSocket(server);
        this.pluginWs = server;
        return new Response(null, { status: 101, webSocket: client });
    }
    /**
     * Hibernation callback — incoming message from plugin WebSocket.
     */
    webSocketMessage(ws, message) {
        if (typeof message !== 'string')
            return;
        try {
            const data = JSON.parse(message);
            // FILE_INFO identification from plugin
            if (data.type === 'FILE_INFO' && data.data) {
                this.fileInfo = {
                    fileName: data.data.fileName,
                    fileKey: data.data.fileKey || null,
                    currentPage: data.data.currentPage,
                    currentPageId: data.data.currentPageId || null,
                    connectedAt: Date.now(),
                };
                return;
            }
            // Event broadcasts from plugin (SELECTION_CHANGE, PAGE_CHANGE, etc.)
            if (data.type === 'PAGE_CHANGE' && data.data) {
                if (this.fileInfo) {
                    this.fileInfo.currentPage = data.data.pageName;
                    this.fileInfo.currentPageId = data.data.pageId || null;
                }
                return;
            }
            // Response to a relayed command
            if (data.id && this.pendingRequests.has(data.id)) {
                const pending = this.pendingRequests.get(data.id);
                clearTimeout(pending.timeoutId);
                this.pendingRequests.delete(data.id);
                const body = JSON.stringify(data.error
                    ? { error: data.error }
                    : { result: data.result });
                pending.resolve(new Response(body, {
                    headers: { 'Content-Type': 'application/json' },
                }));
            }
        }
        catch {
            // Malformed message — ignore
        }
    }
    /**
     * Hibernation callback — WebSocket closed.
     */
    webSocketClose(ws, code, reason, wasClean) {
        this.handleDisconnect();
    }
    /**
     * Hibernation callback — WebSocket error.
     */
    webSocketError(ws, error) {
        this.handleDisconnect();
    }
    handleDisconnect() {
        this.pluginWs = null;
        this.fileInfo = null;
        // Reject all in-flight commands
        for (const [id, pending] of this.pendingRequests) {
            clearTimeout(pending.timeoutId);
            pending.resolve(new Response(JSON.stringify({ error: 'Plugin disconnected' }), { status: 502, headers: { 'Content-Type': 'application/json' } }));
        }
        this.pendingRequests.clear();
    }
    // ==========================================================================
    // Relay — MCP DO sends commands here
    // ==========================================================================
    async handleRelayCommand(request) {
        if (!this.pluginWs) {
            return new Response(JSON.stringify({ error: 'No plugin connected. User must pair the Desktop Bridge plugin first.' }), { status: 502, headers: { 'Content-Type': 'application/json' } });
        }
        const body = await request.json();
        const { method, params = {}, timeoutMs = 15000 } = body;
        const id = `relay_${++this.requestIdCounter}_${Date.now()}`;
        // Send command to plugin
        try {
            this.pluginWs.send(JSON.stringify({ id, method, params }));
        }
        catch {
            return new Response(JSON.stringify({ error: 'Failed to send command to plugin' }), { status: 502, headers: { 'Content-Type': 'application/json' } });
        }
        // Wait for plugin response (the DO stays alive because fetch is active)
        return new Promise((resolve) => {
            const timeoutId = setTimeout(() => {
                if (this.pendingRequests.has(id)) {
                    this.pendingRequests.delete(id);
                    resolve(new Response(JSON.stringify({ error: `Command ${method} timed out after ${timeoutMs}ms` }), { status: 504, headers: { 'Content-Type': 'application/json' } }));
                }
            }, timeoutMs);
            this.pendingRequests.set(id, { resolve, reject: () => { }, timeoutId });
        });
    }
    // ==========================================================================
    // Status
    // ==========================================================================
    handleRelayStatus() {
        return new Response(JSON.stringify({
            connected: this.pluginWs !== null,
            fileInfo: this.fileInfo,
            pendingCommands: this.pendingRequests.size,
        }), { headers: { 'Content-Type': 'application/json' } });
    }
}
//# sourceMappingURL=cloud-websocket-relay.js.map