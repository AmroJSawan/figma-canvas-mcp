/**
 * Port Discovery Module
 *
 * Handles dynamic WebSocket port assignment with range-based fallback.
 * When the preferred port (default 9223) is taken by another MCP server instance
 * (e.g., Claude Desktop Chat tab vs Code tab), the server automatically tries
 * the next port in a fixed range (9223-9232).
 *
 * Port advertisement files are written to /tmp so the Figma plugin can discover
 * which port to connect to. Each instance writes its own file with PID for
 * stale-file detection.
 *
 * Zombie process detection:
 *   Active servers refresh their port file every 30s (heartbeat).
 *   On startup, cleanupStalePortFiles() detects zombies via:
 *     1. Dead PID — process no longer exists (existing behavior)
 *     2. Stale heartbeat — lastSeen older than 5 minutes (process frozen/hung)
 *     3. Age ceiling — startedAt older than 4 hours with no heartbeat (pre-v1.12 compat)
 *   Zombie processes are terminated with SIGTERM to free their ports.
 *
 * Data flow:
 *   Server binds port → writes /tmp/figma-console-mcp-{port}.json
 *   Server heartbeat → refreshes lastSeen every 30s
 *   Plugin scans ports 9223-9232 → connects to first responding server
 *   External tools read port files for discovery
 */
/** Default preferred WebSocket port */
export declare const DEFAULT_WS_PORT = 9223;
/** Number of ports in the fallback range (9223-9232 = 10 ports) */
export declare const PORT_RANGE_SIZE = 10;
/** Maximum age before a port file without heartbeat is considered stale (4 hours) */
export declare const MAX_PORT_FILE_AGE_MS: number;
/** Maximum time since last heartbeat before a process is considered stale (5 minutes) */
export declare const HEARTBEAT_STALE_MS: number;
/** Interval between heartbeat refreshes (30 seconds) */
export declare const HEARTBEAT_INTERVAL_MS: number;
export interface PortFileData {
    port: number;
    pid: number;
    host: string;
    startedAt: string;
    /** Updated by heartbeat every 30s. Missing in port files from pre-v1.12 instances. */
    lastSeen?: string;
}
/**
 * Try to bind a WebSocket server to ports in a range, starting from the preferred port.
 * Returns the first port that binds successfully.
 *
 * @param preferredPort - The port to try first (default 9223)
 * @param host - The host to bind to (default 'localhost')
 * @returns The actual port that was bound
 * @throws If all ports in the range are exhausted
 */
export declare function getPortRange(preferredPort?: number): number[];
/**
 * Get the file path for a port advertisement file.
 */
export declare function getPortFilePath(port: number): string;
/**
 * Write a port advertisement file so clients can discover this server instance.
 * Includes PID for stale-file detection and lastSeen for heartbeat tracking.
 */
export declare function advertisePort(port: number, host?: string): void;
/**
 * Refresh the lastSeen timestamp in a port advertisement file.
 * Called periodically as a heartbeat to prove this server is still active.
 * Non-fatal — heartbeat failures are silently ignored.
 */
export declare function refreshPortAdvertisement(port: number): void;
/**
 * Remove the port advertisement file for this instance.
 * Call on clean shutdown.
 */
export declare function unadvertisePort(port: number): void;
/**
 * Determine if a port file represents a zombie/stale MCP instance.
 *
 * Detection layers:
 *   1. If lastSeen exists (v1.12+): stale if older than HEARTBEAT_STALE_MS (5 min)
 *   2. If lastSeen is missing (pre-v1.12): stale if startedAt older than MAX_PORT_FILE_AGE_MS (4h)
 *
 * Assumes the owning process IS alive (PID check should happen before calling this).
 */
export declare function isStaleInstance(data: PortFileData): boolean;
/**
 * Read and validate a port advertisement file.
 * Returns null if the file doesn't exist, is invalid, or the owning process is dead.
 */
export declare function readPortFile(port: number): PortFileData | null;
/**
 * Discover all active Figma Console MCP server instances by scanning port files.
 * Validates each file's PID to filter out stale entries.
 */
export declare function discoverActiveInstances(preferredPort?: number): PortFileData[];
/**
 * Clean up stale port files and terminate zombie MCP processes.
 *
 * Runs at startup before port binding. Detects stale instances via:
 *   1. Dead PID — process no longer exists → delete file
 *   2. Zombie process — alive but stale (no heartbeat or expired heartbeat)
 *      → send SIGTERM to free the port, then delete file
 *   3. Corrupt file — invalid JSON → delete file
 */
export declare function cleanupStalePortFiles(): number;
/**
 * Deep scan for orphaned MCP server processes that hold ports but have no port files.
 * These are processes left behind by Claude Desktop when tabs close without proper cleanup.
 *
 * Uses lsof (macOS/Linux) to find PIDs listening on each port in the range,
 * then verifies they're figma-console-mcp before terminating.
 *
 * Call AFTER cleanupStalePortFiles() — that handles the port-file-based cleanup first,
 * then this catches any remaining ghosts.
 */
export declare function cleanupOrphanedProcesses(preferredPort?: number): number;
/**
 * Register process exit handlers to clean up port advertisement file.
 * Should be called once after the port is successfully bound.
 */
export declare function registerPortCleanup(port: number): void;
//# sourceMappingURL=port-discovery.d.ts.map