/**
 * Cloud WebSocket Connector
 *
 * Implements IFigmaConnector by routing commands through the PluginRelayDO
 * Durable Object. Each method maps to a command sent via fetch() RPC to
 * the relay, which forwards it to the Figma Desktop Bridge plugin over
 * WebSocket.
 *
 * Structurally mirrors WebSocketConnector — same methods, different transport.
 */
import type { IFigmaConnector } from './figma-connector.js';
interface RelayStub {
    fetch(input: RequestInfo, init?: RequestInit): Promise<Response>;
}
export declare class CloudWebSocketConnector implements IFigmaConnector {
    private relayStub;
    constructor(relayStub: RelayStub);
    initialize(): Promise<void>;
    getTransportType(): 'cdp' | 'websocket';
    executeInPluginContext<T = any>(code: string): Promise<T>;
    getVariablesFromPluginUI(fileKey?: string): Promise<any>;
    getVariables(fileKey?: string): Promise<any>;
    executeCodeViaUI(code: string, timeoutMs?: number): Promise<any>;
    updateVariable(variableId: string, modeId: string, value: any): Promise<any>;
    createVariable(name: string, collectionId: string, resolvedType: string, options?: any): Promise<any>;
    deleteVariable(variableId: string): Promise<any>;
    refreshVariables(): Promise<any>;
    renameVariable(variableId: string, newName: string): Promise<any>;
    setVariableDescription(variableId: string, description: string): Promise<any>;
    addMode(collectionId: string, modeName: string): Promise<any>;
    renameMode(collectionId: string, modeId: string, newName: string): Promise<any>;
    createVariableCollection(name: string, options?: any): Promise<any>;
    deleteVariableCollection(collectionId: string): Promise<any>;
    getComponentFromPluginUI(nodeId: string): Promise<any>;
    getLocalComponents(): Promise<any>;
    setNodeDescription(nodeId: string, description: string, descriptionMarkdown?: string): Promise<any>;
    addComponentProperty(nodeId: string, propertyName: string, type: string, defaultValue: any, options?: any): Promise<any>;
    editComponentProperty(nodeId: string, propertyName: string, newValue: any): Promise<any>;
    deleteComponentProperty(nodeId: string, propertyName: string): Promise<any>;
    instantiateComponent(componentKey: string, options?: any): Promise<any>;
    resizeNode(nodeId: string, width: number, height: number, withConstraints?: boolean): Promise<any>;
    moveNode(nodeId: string, x: number, y: number): Promise<any>;
    setNodeFills(nodeId: string, fills: any[]): Promise<any>;
    setNodeStrokes(nodeId: string, strokes: any[], strokeWeight?: number): Promise<any>;
    setNodeOpacity(nodeId: string, opacity: number): Promise<any>;
    setNodeCornerRadius(nodeId: string, radius: number): Promise<any>;
    cloneNode(nodeId: string): Promise<any>;
    deleteNode(nodeId: string): Promise<any>;
    renameNode(nodeId: string, newName: string): Promise<any>;
    setTextContent(nodeId: string, characters: string, options?: any): Promise<any>;
    createChildNode(parentId: string, nodeType: string, properties?: any): Promise<any>;
    captureScreenshot(nodeId: string, options?: any): Promise<any>;
    setInstanceProperties(nodeId: string, properties: any): Promise<any>;
    clearFrameCache(): void;
    private sendCommand;
}
export {};
//# sourceMappingURL=cloud-websocket-connector.d.ts.map