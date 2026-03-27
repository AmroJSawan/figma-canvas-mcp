/**
 * Code to Figma Spec Converter
 *
 * Converts rendered HTML + computed CSS styles into Figma-compatible specification JSON.
 * This is the core logic that powers the Code → Figma workflow.
 *
 * Usage:
 *   const spec = convertToFigmaSpec(htmlString, computedStyles);
 *
 * The Storybook addon captures DOM + styles and sends them here for processing.
 */
export interface ComputedStyleMap {
    [selector: string]: {
        [property: string]: string;
    };
}
export interface ConversionOptions {
    /** Name for the root component */
    componentName?: string;
    /** Include metadata about token mappings */
    includeMetadata?: boolean;
    /** Token definitions for reverse-mapping values to tokens */
    tokens?: Record<string, string>;
}
export interface FigmaSpec {
    name: string;
    type: string;
    [key: string]: any;
}
export interface CodeToSpecInput {
    /** HTML string or pre-parsed DOM structure */
    html: string;
    /** Computed styles keyed by selector or element ID */
    styles: ComputedStyleMap;
    /** Conversion options */
    options?: ConversionOptions;
}
export interface CodeToSpecResult {
    success: boolean;
    spec?: FigmaSpec;
    error?: string;
    metadata?: {
        source: string;
        elementsProcessed: number;
        conversionTime: number;
    };
}
export declare function convertCodeToFigmaSpec(input: CodeToSpecInput): CodeToSpecResult;
/**
 * Validate a Figma spec for completeness
 */
/**
 * Structure returned by Chrome DevTools DOM extraction
 */
export interface ExtractedDOMNode {
    tagName: string;
    className: string | object;
    id: string;
    textContent: string | null;
    styles: {
        display?: string;
        position?: string;
        flexDirection?: string;
        alignItems?: string;
        justifyContent?: string;
        gap?: string;
        width?: number;
        height?: number;
        padding?: string;
        paddingTop?: string;
        paddingRight?: string;
        paddingBottom?: string;
        paddingLeft?: string;
        margin?: string;
        backgroundColor?: string;
        color?: string;
        borderRadius?: string;
        border?: string;
        borderWidth?: string;
        borderColor?: string;
        borderStyle?: string;
        boxShadow?: string;
        fontFamily?: string;
        fontSize?: string;
        fontWeight?: string;
        lineHeight?: string;
        textAlign?: string;
    };
    children: ExtractedDOMNode[];
}
/**
 * Convert extracted DOM tree (from Chrome DevTools) to Figma specification
 *
 * @param domTree - Pre-parsed DOM structure with computed styles
 * @param componentName - Optional name for the root component
 * @returns Figma spec JSON ready for the plugin
 */
export declare function convertDOMToFigmaSpec(domTree: ExtractedDOMNode, componentName?: string): CodeToSpecResult;
export declare function validateSpec(spec: FigmaSpec): {
    valid: boolean;
    issues: string[];
};
//# sourceMappingURL=code-to-spec.d.ts.map