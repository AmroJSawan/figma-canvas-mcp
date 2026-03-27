/**
 * Figma Desktop Connector
 *
 * This service connects directly to Figma Desktop's plugin context
 * to execute code with access to the full Figma Plugin API,
 * including variables without Enterprise access.
 *
 * Uses Puppeteer's Worker API to directly access plugin workers.
 * Note: This is a legacy connector maintained for backwards compatibility.
 * The WebSocket Desktop Bridge plugin is the primary connection method.
 */
import { Page } from 'puppeteer-core';
import type { IFigmaConnector } from './figma-connector.js';
export declare class FigmaDesktopConnector implements IFigmaConnector {
    private page;
    private cachedPluginFrame;
    private static readonly DEBUG;
    constructor(page: Page);
    /**
     * Clear the cached plugin UI frame reference.
     * Called automatically when a detached frame is detected.
     */
    clearFrameCache(): void;
    /**
     * Conditionally log to Figma's browser console (only when DEBUG is enabled).
     * Skips the CDP roundtrip entirely in production, eliminating ~5-15ms per call.
     */
    private logToFigmaConsole;
    /**
     * Initialize connection to Figma Desktop's plugin context
     * No setup needed - Puppeteer handles worker access automatically
     */
    initialize(): Promise<void>;
    getTransportType(): 'cdp' | 'websocket';
    /**
     * Execute code in Figma's plugin context where the figma API is available
     * Uses Puppeteer's direct worker access instead of CDP context enumeration
     */
    executeInPluginContext<T = any>(code: string): Promise<T>;
    /**
     * Get Figma variables from plugin UI window object
     * This bypasses Figma's plugin sandbox security restrictions
     * by accessing data that the plugin posted to its UI iframe
     */
    getVariablesFromPluginUI(fileKey?: string): Promise<any>;
    /**
     * Get component data by node ID from plugin UI window object
     * This bypasses the REST API bug where descriptions are missing
     * by accessing data from the Desktop Bridge plugin via its UI iframe
     */
    getComponentFromPluginUI(nodeId: string): Promise<any>;
    /**
     * Get Figma variables using the desktop connection
     * This bypasses the Enterprise requirement!
     */
    getVariables(fileKey?: string): Promise<any>;
    /**
     * Clean up resources (no-op since we use Puppeteer's built-in worker management)
     */
    /**
     * Get component data by node ID using Plugin API
     * This bypasses the REST API bug where descriptions are missing
     */
    getComponentByNodeId(nodeId: string): Promise<any>;
    dispose(): Promise<void>;
    /**
     * Find the Desktop Bridge plugin UI iframe
     * Returns the frame that has the write operation functions
     * Handles detached frame errors gracefully
     */
    private findPluginUIFrame;
    /**
     * Execute arbitrary code in Figma's plugin context
     * This is the power tool that can run any Figma Plugin API code
     * Includes retry logic for detached frame errors
     */
    executeCodeViaUI(code: string, timeout?: number): Promise<any>;
    /**
     * Update a variable's value in a specific mode
     */
    updateVariable(variableId: string, modeId: string, value: any): Promise<any>;
    /**
     * Create a new variable in a collection
     */
    createVariable(name: string, collectionId: string, resolvedType: 'COLOR' | 'FLOAT' | 'STRING' | 'BOOLEAN', options?: {
        valuesByMode?: Record<string, any>;
        description?: string;
        scopes?: string[];
    }): Promise<any>;
    /**
     * Create a new variable collection
     */
    createVariableCollection(name: string, options?: {
        initialModeName?: string;
        additionalModes?: string[];
    }): Promise<any>;
    /**
     * Delete a variable
     */
    deleteVariable(variableId: string): Promise<any>;
    /**
     * Delete a variable collection
     */
    deleteVariableCollection(collectionId: string): Promise<any>;
    /**
     * Refresh variables data from Figma
     */
    refreshVariables(): Promise<any>;
    /**
     * Rename a variable
     */
    renameVariable(variableId: string, newName: string): Promise<any>;
    /**
     * Set the description on a variable (not a node — variables use a separate API)
     */
    setVariableDescription(variableId: string, description: string): Promise<any>;
    /**
     * Add a mode to a variable collection
     */
    addMode(collectionId: string, modeName: string): Promise<any>;
    /**
     * Rename a mode in a variable collection
     */
    renameMode(collectionId: string, modeId: string, newName: string): Promise<any>;
    /**
     * Get all local components for design system manifest generation
     */
    getLocalComponents(): Promise<{
        success: boolean;
        data?: {
            components: any[];
            componentSets: any[];
            totalComponents: number;
            totalComponentSets: number;
            fileKey: string;
            timestamp: number;
        };
        error?: string;
    }>;
    /**
     * Instantiate a component with overrides
     * Supports both published library components (by key) and local components (by nodeId)
     */
    instantiateComponent(componentKey: string, options?: {
        nodeId?: string;
        position?: {
            x: number;
            y: number;
        };
        size?: {
            width: number;
            height: number;
        };
        overrides?: Record<string, any>;
        variant?: Record<string, string>;
        parentId?: string;
    }): Promise<{
        success: boolean;
        instance?: {
            id: string;
            name: string;
            x: number;
            y: number;
            width: number;
            height: number;
        };
        error?: string;
    }>;
    /**
     * Set description on a component or style
     */
    setNodeDescription(nodeId: string, description: string, descriptionMarkdown?: string): Promise<any>;
    /**
     * Add a component property
     */
    addComponentProperty(nodeId: string, propertyName: string, type: 'BOOLEAN' | 'TEXT' | 'INSTANCE_SWAP' | 'VARIANT', defaultValue: any, options?: {
        preferredValues?: any[];
    }): Promise<any>;
    /**
     * Edit an existing component property
     */
    editComponentProperty(nodeId: string, propertyName: string, newValue: {
        name?: string;
        defaultValue?: any;
        preferredValues?: any[];
    }): Promise<any>;
    /**
     * Delete a component property
     */
    deleteComponentProperty(nodeId: string, propertyName: string): Promise<any>;
    /**
     * Resize a node
     */
    resizeNode(nodeId: string, width: number, height: number, withConstraints?: boolean): Promise<any>;
    /**
     * Move/position a node
     */
    moveNode(nodeId: string, x: number, y: number): Promise<any>;
    /**
     * Set fills (colors) on a node
     */
    setNodeFills(nodeId: string, fills: any[]): Promise<any>;
    /**
     * Set strokes on a node
     */
    setNodeStrokes(nodeId: string, strokes: any[], strokeWeight?: number): Promise<any>;
    /**
     * Set opacity on a node
     */
    setNodeOpacity(nodeId: string, opacity: number): Promise<any>;
    /**
     * Set corner radius on a node
     */
    setNodeCornerRadius(nodeId: string, radius: number): Promise<any>;
    /**
     * Clone/duplicate a node
     */
    cloneNode(nodeId: string): Promise<any>;
    /**
     * Delete a node
     */
    deleteNode(nodeId: string): Promise<any>;
    /**
     * Rename a node
     */
    renameNode(nodeId: string, newName: string): Promise<any>;
    /**
     * Set text content on a text node
     */
    setTextContent(nodeId: string, text: string, options?: {
        fontSize?: number;
    }): Promise<any>;
    /**
     * Create a child node
     */
    createChildNode(parentId: string, nodeType: 'RECTANGLE' | 'ELLIPSE' | 'FRAME' | 'TEXT' | 'LINE' | 'POLYGON' | 'STAR' | 'VECTOR', properties?: {
        name?: string;
        x?: number;
        y?: number;
        width?: number;
        height?: number;
        fills?: any[];
        text?: string;
    }): Promise<any>;
    /**
     * Capture screenshot via plugin's exportAsync
     */
    captureScreenshot(nodeId: string, options?: {
        format?: string;
        scale?: number;
    }): Promise<any>;
    /**
     * Set component instance properties
     */
    setInstanceProperties(nodeId: string, properties: any): Promise<any>;
    /**
     * Set image fill on one or more nodes (decodes base64 in browser bridge, sends bytes to plugin)
     */
    setImageFill(nodeIds: string[], imageData: string, scaleMode?: string): Promise<any>;
    /**
     * Lint design for accessibility and quality issues via plugin UI
     */
    lintDesign(nodeId?: string, rules?: string[], maxDepth?: number, maxFindings?: number): Promise<any>;
    createSticky(): Promise<any>;
    createStickies(): Promise<any>;
    createConnector(): Promise<any>;
    createShapeWithText(): Promise<any>;
    createTable(): Promise<any>;
    createCodeBlock(): Promise<any>;
    getBoardContents(): Promise<any>;
    getConnections(): Promise<any>;
    listSlides(): Promise<any>;
    getSlideContent(): Promise<any>;
    createSlide(): Promise<any>;
    deleteSlide(): Promise<any>;
    duplicateSlide(): Promise<any>;
    getSlideGrid(): Promise<any>;
    reorderSlides(): Promise<any>;
    setSlideTransition(): Promise<any>;
    getSlideTransition(): Promise<any>;
    setSlidesViewMode(): Promise<any>;
    getFocusedSlide(): Promise<any>;
    focusSlide(): Promise<any>;
    skipSlide(): Promise<any>;
    addTextToSlide(): Promise<any>;
    addShapeToSlide(): Promise<any>;
}
//# sourceMappingURL=figma-desktop-connector.d.ts.map