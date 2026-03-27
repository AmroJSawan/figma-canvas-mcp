/**
 * Local Browser Manager (Legacy)
 * Note: This module is maintained for backwards compatibility but is no longer
 * the primary connection method. Use the WebSocket Desktop Bridge plugin instead.
 */
import { type Page } from 'puppeteer-core';
import type { IBrowserManager, NavigationResult } from './base.js';
/**
 * Local browser configuration
 */
export interface LocalBrowserConfig {
    debugPort: number;
    debugHost: string;
}
/**
 * Local Browser Manager
 * Connects to existing Figma Desktop instance via remote debugging port
 */
export declare class LocalBrowserManager implements IBrowserManager {
    private browser;
    private page;
    private config;
    constructor(config: LocalBrowserConfig);
    /**
     * Connect to Figma Desktop via remote debugging port
     */
    launch(): Promise<void>;
    /**
     * Find the best page for plugin debugging
     * Actively searches for pages with workers across ALL tabs
     */
    private findBestPage;
    /**
     * Find an existing browser tab whose URL matches the given Figma file key
     */
    private findPageByFileKey;
    /**
     * Get active Figma page or create new one
     * Prefers pages with active plugin workers for plugin debugging
     */
    getPage(): Promise<Page>;
    /**
     * Navigate to Figma URL
     * If the target file is already open in a tab, switches to it instead of navigating.
     */
    navigateToFigma(figmaUrl?: string): Promise<NavigationResult>;
    /**
     * Reload current page
     */
    reload(hardReload?: boolean): Promise<void>;
    /**
     * Execute JavaScript in page context
     */
    evaluate<T>(fn: () => T): Promise<T>;
    /**
     * Check if browser is connected
     */
    isRunning(): boolean;
    /**
     * Disconnect from browser (doesn't close Figma Desktop)
     */
    close(): Promise<void>;
    /**
     * Get current page URL
     */
    getCurrentUrl(): string | null;
    /**
     * Check if the browser connection is still alive
     * Returns false if connection is stale (e.g., after computer sleep)
     */
    isConnectionAlive(): Promise<boolean>;
    /**
     * Reconnect to Figma Desktop if connection was lost
     * Call this before any operation that requires a live connection
     */
    ensureConnection(): Promise<void>;
    /**
     * Force a complete reconnection to Figma Desktop
     * Use this when frames become detached or stale even though the browser appears connected
     */
    forceReconnect(): Promise<void>;
    /**
     * Wait for navigation
     */
    waitForNavigation(timeout?: number): Promise<void>;
}
//# sourceMappingURL=local.d.ts.map