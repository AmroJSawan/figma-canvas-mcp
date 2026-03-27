/**
 * Design System Dashboard — Fix Generator
 *
 * Generates FixDefinitions for fixable findings.
 * Each generator inspects the raw data and produces a list of
 * concrete operations that the Desktop Bridge can execute.
 */
import type { FixDefinition } from "./fix-types.js";
import type { DesignSystemRawData } from "./types.js";
/**
 * Generate all fix definitions from raw data.
 * Returns a map of findingId → FixDefinition for annotation onto findings.
 */
export declare function generateAllFixes(data: DesignSystemRawData): Map<string, FixDefinition>;
//# sourceMappingURL=fix-generator.d.ts.map