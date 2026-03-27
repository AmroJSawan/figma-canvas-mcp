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
import { spawn, execSync } from 'child_process';
import { EventEmitter } from 'events';
import { createChildLogger } from './logger.js';
const logger = createChildLogger({ component: 'cdp-pipe-manager' });
/** CDP response timeout in milliseconds */
const CDP_RESPONSE_TIMEOUT_MS = 10_000;
/** Max console log entries in the circular buffer */
const MAX_CONSOLE_BUFFER = 1000;
/** Startup delay before setting up CDP listeners (ms) */
const STARTUP_DELAY_MS = 5000;
/** Figma internal noise prefixes/substrings to filter out */
const NOISE_FILTERS = ['[Sprigma]', '[Livegraph]', 'Statsig'];
export class CdpPipeManager extends EventEmitter {
    constructor(figmaPath) {
        super();
        this.figmaProcess = null;
        this.cdpWrite = null;
        this.cdpRead = null;
        this.msgIdCounter = 0;
        this.pendingResponses = new Map();
        this.sessionIds = new Set();
        this.buffer = '';
        this.consoleLogs = [];
        this.isConnected = false;
        this.figmaPath = figmaPath || CdpPipeManager.detectFigmaPath();
    }
    /**
     * Launch Figma Desktop with `--remote-debugging-pipe` and set up
     * the CDP pipe communication channel.
     */
    async launch() {
        if (CdpPipeManager.isFigmaRunning()) {
            throw new Error('Figma is already running. The pipe approach requires launching Figma from scratch. ' +
                'Please quit Figma and try again.');
        }
        logger.info({ figmaPath: this.figmaPath }, 'Launching Figma with --remote-debugging-pipe');
        this.figmaProcess = spawn(this.figmaPath, ['--remote-debugging-pipe'], {
            stdio: ['inherit', 'inherit', 'inherit', 'pipe', 'pipe'],
            detached: false,
        });
        // FD 3 = write TO Figma, FD 4 = read FROM Figma
        // stdio array: [stdin(0), stdout(1), stderr(2), fd3(3), fd4(4)]
        this.cdpWrite = this.figmaProcess.stdio[3];
        this.cdpRead = this.figmaProcess.stdio[4];
        if (!this.cdpWrite || !this.cdpRead) {
            this.figmaProcess.kill();
            this.figmaProcess = null;
            throw new Error('Failed to establish CDP pipe — file descriptors 3/4 not available');
        }
        // Set up pipe reading with \0 delimiter parsing
        this.cdpRead.on('data', (chunk) => {
            this.buffer += chunk.toString();
            this.processBuffer();
        });
        this.cdpRead.on('end', () => {
            logger.info('CDP read pipe closed');
            this.isConnected = false;
            this.rejectAllPending('CDP pipe closed');
            this.emit('closed');
        });
        this.cdpRead.on('error', (error) => {
            logger.error({ error }, 'CDP read pipe error');
            this.emit('error', error);
        });
        this.figmaProcess.on('exit', (code, signal) => {
            logger.info({ code, signal }, 'Figma process exited');
            this.isConnected = false;
            this.rejectAllPending('Figma process exited');
            this.figmaProcess = null;
            this.cdpWrite = null;
            this.cdpRead = null;
            this.emit('closed');
        });
        this.figmaProcess.on('error', (error) => {
            logger.error({ error }, 'Figma process error');
            this.emit('error', error);
        });
        this.emit('launched');
        // Wait for Figma to initialize before setting up CDP listeners
        await new Promise((resolve) => setTimeout(resolve, STARTUP_DELAY_MS));
        await this.setupCdpListeners();
    }
    /**
     * Set up CDP target discovery and console event listeners.
     * Enables auto-attach to all targets so we capture plugin sandbox console output.
     */
    async setupCdpListeners() {
        try {
            // Discover all targets (pages, workers, extensions, etc.)
            await this.sendCdp('Target.setDiscoverTargets', { discover: true });
            // Auto-attach to new targets so we get Runtime events from plugin sandboxes
            await this.sendCdp('Target.setAutoAttach', {
                autoAttach: true,
                waitForDebuggerOnStart: false,
                flatten: true,
            });
            // Note: Do NOT send Runtime.enable on the browser-level target — it doesn't
            // support the Runtime domain. Runtime.enable is sent per-session when targets
            // auto-attach (handled in handleCdpMessage → Target.attachedToTarget).
            this.isConnected = true;
            logger.info('CDP listeners set up — target discovery and auto-attach enabled');
            this.emit('connected');
        }
        catch (error) {
            logger.error({ error }, 'Failed to set up CDP listeners');
            this.emit('error', error instanceof Error ? error : new Error(String(error)));
        }
    }
    /**
     * Send a CDP command via the pipe (FD 3).
     * Returns a Promise that resolves with the CDP response.
     */
    sendCdp(method, params, sessionId) {
        return new Promise((resolve, reject) => {
            if (!this.cdpWrite) {
                reject(new Error('CDP pipe not available — Figma not launched'));
                return;
            }
            const id = ++this.msgIdCounter;
            const message = { id, method };
            if (params)
                message.params = params;
            if (sessionId)
                message.sessionId = sessionId;
            const timeout = setTimeout(() => {
                if (this.pendingResponses.has(id)) {
                    this.pendingResponses.delete(id);
                    reject(new Error(`CDP command ${method} timed out after ${CDP_RESPONSE_TIMEOUT_MS}ms`));
                }
            }, CDP_RESPONSE_TIMEOUT_MS);
            this.pendingResponses.set(id, { resolve, reject, timeout });
            const payload = JSON.stringify(message) + '\0';
            try {
                this.cdpWrite.write(payload);
                logger.debug({ id, method, sessionId }, 'Sent CDP command');
            }
            catch (writeError) {
                this.pendingResponses.delete(id);
                clearTimeout(timeout);
                reject(new Error(`Failed to write CDP command ${method}: ${writeError instanceof Error ? writeError.message : String(writeError)}`));
            }
        });
    }
    /**
     * Process the raw pipe buffer, splitting on `\0` delimiters
     * and dispatching complete JSON messages.
     */
    processBuffer() {
        let delimiterIndex;
        while ((delimiterIndex = this.buffer.indexOf('\0')) !== -1) {
            const rawMessage = this.buffer.slice(0, delimiterIndex);
            this.buffer = this.buffer.slice(delimiterIndex + 1);
            if (!rawMessage.trim())
                continue;
            try {
                const data = JSON.parse(rawMessage);
                this.handleCdpMessage(data);
            }
            catch (parseError) {
                logger.warn({ rawMessage: rawMessage.slice(0, 200) }, 'Failed to parse CDP message');
            }
        }
    }
    /**
     * Route an incoming CDP message to the appropriate handler.
     */
    handleCdpMessage(data) {
        // CDP response to a command we sent
        if (data.id !== undefined && this.pendingResponses.has(data.id)) {
            const pending = this.pendingResponses.get(data.id);
            clearTimeout(pending.timeout);
            this.pendingResponses.delete(data.id);
            if (data.error) {
                pending.reject(new Error(`CDP error: ${data.error.message || JSON.stringify(data.error)}`));
            }
            else {
                pending.resolve(data.result);
            }
            return;
        }
        // CDP event
        const sessionId = data.sessionId;
        switch (data.method) {
            case 'Runtime.consoleAPICalled':
                this.processConsoleEvent(data.params, sessionId);
                break;
            case 'Target.attachedToTarget': {
                const targetSessionId = data.params?.sessionId;
                if (targetSessionId) {
                    this.sessionIds.add(targetSessionId);
                    logger.debug({
                        sessionId: targetSessionId,
                        targetType: data.params?.targetInfo?.type,
                        targetUrl: data.params?.targetInfo?.url,
                    }, 'Attached to new target — enabling Runtime');
                    // Enable Runtime on the newly attached session to capture console events
                    this.sendCdp('Runtime.enable', {}, targetSessionId).catch((err) => {
                        logger.warn({ sessionId: targetSessionId, error: err }, 'Failed to enable Runtime on attached target');
                    });
                }
                break;
            }
            case 'Target.targetCreated':
                logger.debug({
                    targetId: data.params?.targetInfo?.targetId,
                    targetType: data.params?.targetInfo?.type,
                    targetUrl: data.params?.targetInfo?.url,
                }, 'New CDP target created');
                break;
            case 'Target.detachedFromTarget': {
                const detachedSessionId = data.params?.sessionId;
                if (detachedSessionId) {
                    this.sessionIds.delete(detachedSessionId);
                    logger.debug({ sessionId: detachedSessionId }, 'Detached from target');
                }
                break;
            }
            default:
                // Ignore other CDP events silently
                break;
        }
    }
    /**
     * Convert a CDP `Runtime.consoleAPICalled` event into a `ConsoleLogEntry`,
     * filter out Figma internal noise, and store in the circular buffer.
     */
    processConsoleEvent(params, _sessionId) {
        if (!params || !params.args)
            return;
        const args = params.args || [];
        // Map CDP console type to our log level
        let level = params.type || 'log';
        if (level === 'warning')
            level = 'warn';
        // Ensure level is one of our known types
        if (!['log', 'info', 'warn', 'error', 'debug'].includes(level)) {
            level = 'log';
        }
        const messageParts = args.map((arg) => arg.value !== undefined ? String(arg.value) : arg.description || JSON.stringify(arg));
        const message = messageParts.join(' ');
        // Filter Figma internal noise
        for (const filter of NOISE_FILTERS) {
            if (filter === 'Statsig') {
                if (message.includes(filter))
                    return;
            }
            else {
                if (message.startsWith(filter))
                    return;
            }
        }
        const entry = {
            timestamp: params.timestamp ? Math.floor(params.timestamp) : Date.now(),
            level,
            message: message.substring(0, 5000), // Reasonable max length
            args: args.map((arg) => arg.value ?? arg.description ?? ''),
            source: 'cdp-pipe',
        };
        // Extract stack trace if available
        if (params.stackTrace && params.stackTrace.callFrames) {
            entry.stackTrace = {
                callFrames: params.stackTrace.callFrames.map((frame) => ({
                    functionName: frame.functionName || '',
                    url: frame.url || '',
                    lineNumber: frame.lineNumber || 0,
                    columnNumber: frame.columnNumber || 0,
                })),
            };
        }
        // Circular buffer: remove oldest when at capacity
        if (this.consoleLogs.length >= MAX_CONSOLE_BUFFER) {
            this.consoleLogs.shift();
        }
        this.consoleLogs.push(entry);
        this.emit('consoleLog', entry);
    }
    /**
     * Get console logs from the buffer with optional filtering.
     */
    getConsoleLogs(options) {
        let filtered = [...this.consoleLogs];
        if (options?.since !== undefined) {
            filtered = filtered.filter((log) => log.timestamp >= options.since);
        }
        if (options?.level) {
            filtered = filtered.filter((log) => log.level === options.level);
        }
        if (options?.count !== undefined && options.count > 0) {
            filtered = filtered.slice(-options.count);
        }
        return filtered;
    }
    /**
     * Clear the console log buffer.
     */
    clearConsoleLogs() {
        const cleared = this.consoleLogs.length;
        this.consoleLogs = [];
        return { cleared };
    }
    /**
     * Whether the CDP pipe connection is active and Figma is running.
     */
    isActive() {
        return this.isConnected && this.figmaProcess !== null && !this.figmaProcess.killed;
    }
    /**
     * Shut down the CDP pipe connection gracefully.
     * Does NOT kill Figma — lets it keep running.
     */
    async shutdown() {
        logger.info('Shutting down CDP pipe manager');
        this.isConnected = false;
        this.rejectAllPending('CDP pipe manager shutting down');
        // Detach from all sessions
        for (const sessionId of this.sessionIds) {
            try {
                await this.sendCdp('Target.detachFromTarget', { sessionId });
            }
            catch {
                // Best-effort — session may already be gone
            }
        }
        this.sessionIds.clear();
        // Close the pipe streams but do NOT kill the Figma process
        if (this.cdpWrite) {
            try {
                this.cdpWrite.end?.();
            }
            catch {
                // Ignore
            }
            this.cdpWrite = null;
        }
        if (this.cdpRead) {
            try {
                this.cdpRead.destroy?.();
            }
            catch {
                // Ignore
            }
            this.cdpRead = null;
        }
        // Detach our reference but don't kill the process
        if (this.figmaProcess) {
            this.figmaProcess.unref();
            this.figmaProcess = null;
        }
        this.buffer = '';
        this.removeAllListeners();
        logger.info('CDP pipe manager shut down');
    }
    /**
     * Reject all pending CDP response promises.
     */
    rejectAllPending(reason) {
        for (const [id, pending] of this.pendingResponses) {
            clearTimeout(pending.timeout);
            pending.reject(new Error(reason));
        }
        this.pendingResponses.clear();
    }
    /**
     * Detect the Figma Desktop executable path based on the current platform.
     */
    static detectFigmaPath() {
        switch (process.platform) {
            case 'darwin':
                return '/Applications/Figma.app/Contents/MacOS/Figma';
            case 'win32': {
                const localAppData = process.env.LOCALAPPDATA || '';
                if (localAppData) {
                    return `${localAppData}\\Figma\\Figma.exe`;
                }
                const appData = process.env.APPDATA || '';
                if (appData) {
                    return `${appData}\\..\\Local\\Figma\\Figma.exe`;
                }
                return 'Figma.exe';
            }
            default:
                // Linux or unknown — assume figma is on PATH
                return 'figma';
        }
    }
    /**
     * Check if Figma is already running.
     * If running, the pipe approach won't work (can't attach pipe to existing process).
     */
    static isFigmaRunning() {
        try {
            if (process.platform === 'win32') {
                const output = execSync('tasklist /FI "IMAGENAME eq Figma.exe" /NH', {
                    encoding: 'utf-8',
                    timeout: 5000,
                });
                return output.toLowerCase().includes('figma.exe');
            }
            else {
                // macOS and Linux
                const output = execSync('pgrep -x Figma || pgrep -x figma || true', {
                    encoding: 'utf-8',
                    timeout: 5000,
                });
                return output.trim().length > 0;
            }
        }
        catch {
            // If the check fails, assume not running (better to try and fail than block)
            return false;
        }
    }
}
export default CdpPipeManager;
//# sourceMappingURL=cdp-pipe-manager.js.map