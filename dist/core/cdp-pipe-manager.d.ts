/**
 * CDP Pipe Manager
 *
 * Manages a Chrome DevTools Protocol connection to Figma Desktop via
 * `--remote-debugging-pipe`. The pipe approach uses file descriptors
 * 3 (write to Figma) and 4 (read from Figma) with `\0`-delimited
 * JSON messages for CDP communication.
 *
 * This gives full access to `Runtime.consoleAPICalled` events from ALL
 * renderer processes, including plugin sandboxes — without needing a
 * network port (which Figma Desktop blocks).
 *
 * Data flow: MCP Server ←pipe FD 3/4→ Figma Desktop (Electron/Chromium)
 */
import { EventEmitter } from 'events';
import type { ConsoleLogEntry } from './types/index.js';
export declare class CdpPipeManager extends EventEmitter {
    private figmaProcess;
    private cdpWrite;
    private cdpRead;
    private msgIdCounter;
    private pendingResponses;
    private sessionIds;
    private buffer;
    private consoleLogs;
    private isConnected;
    private figmaPath;
    constructor(figmaPath?: string);
    /**
     * Launch Figma Desktop with `--remote-debugging-pipe` and set up
     * the CDP pipe communication channel.
     */
    launch(): Promise<void>;
    /**
     * Set up CDP target discovery and console event listeners.
     * Enables auto-attach to all targets so we capture plugin sandbox console output.
     */
    private setupCdpListeners;
    /**
     * Send a CDP command via the pipe (FD 3).
     * Returns a Promise that resolves with the CDP response.
     */
    private sendCdp;
    /**
     * Process the raw pipe buffer, splitting on `\0` delimiters
     * and dispatching complete JSON messages.
     */
    private processBuffer;
    /**
     * Route an incoming CDP message to the appropriate handler.
     */
    private handleCdpMessage;
    /**
     * Convert a CDP `Runtime.consoleAPICalled` event into a `ConsoleLogEntry`,
     * filter out Figma internal noise, and store in the circular buffer.
     */
    private processConsoleEvent;
    /**
     * Get console logs from the buffer with optional filtering.
     */
    getConsoleLogs(options?: {
        count?: number;
        level?: string;
        since?: number;
    }): ConsoleLogEntry[];
    /**
     * Clear the console log buffer.
     */
    clearConsoleLogs(): {
        cleared: number;
    };
    /**
     * Whether the CDP pipe connection is active and Figma is running.
     */
    isActive(): boolean;
    /**
     * Shut down the CDP pipe connection gracefully.
     * Does NOT kill Figma — lets it keep running.
     */
    shutdown(): Promise<void>;
    /**
     * Reject all pending CDP response promises.
     */
    private rejectAllPending;
    /**
     * Detect the Figma Desktop executable path based on the current platform.
     */
    static detectFigmaPath(): string;
    /**
     * Check if Figma is already running.
     * If running, the pipe approach won't work (can't attach pipe to existing process).
     */
    static isFigmaRunning(): boolean;
}
export default CdpPipeManager;
//# sourceMappingURL=cdp-pipe-manager.d.ts.map