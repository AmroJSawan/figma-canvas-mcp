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
export class CloudWebSocketConnector {
    constructor(relayStub) {
        this.relayStub = relayStub;
    }
    async initialize() {
        const res = await this.relayStub.fetch('https://relay/relay/status');
        const status = await res.json();
        if (!status.connected) {
            throw new Error('No plugin connected to cloud relay. User must pair the Desktop Bridge plugin first (use figma_pair_plugin tool).');
        }
    }
    getTransportType() {
        return 'websocket';
    }
    // ============================================================================
    // Core execution
    // ============================================================================
    async executeInPluginContext(code) {
        return this.sendCommand('EXECUTE_CODE', { code, timeout: 5000 }, 7000);
    }
    async getVariablesFromPluginUI(fileKey) {
        return this.sendCommand('GET_VARIABLES_DATA', {}, 10000);
    }
    async getVariables(fileKey) {
        const code = `
      (async () => {
        try {
          if (typeof figma === 'undefined') {
            throw new Error('Figma API not available in this context');
          }
          const variables = await figma.variables.getLocalVariablesAsync();
          const collections = await figma.variables.getLocalVariableCollectionsAsync();
          return {
            success: true,
            timestamp: Date.now(),
            fileMetadata: { fileName: figma.root.name, fileKey: figma.fileKey || null },
            variables: variables.map(function(v) { return { id: v.id, name: v.name, key: v.key, resolvedType: v.resolvedType, valuesByMode: v.valuesByMode, variableCollectionId: v.variableCollectionId, scopes: v.scopes, description: v.description, hiddenFromPublishing: v.hiddenFromPublishing }; }),
            variableCollections: collections.map(function(c) { return { id: c.id, name: c.name, key: c.key, modes: c.modes, defaultModeId: c.defaultModeId, variableIds: c.variableIds }; })
          };
        } catch (error) {
          return { success: false, error: error.message };
        }
      })()
    `;
        return this.sendCommand('EXECUTE_CODE', { code, timeout: 30000 }, 32000);
    }
    async executeCodeViaUI(code, timeoutMs = 5000) {
        return this.sendCommand('EXECUTE_CODE', { code, timeout: timeoutMs }, timeoutMs + 2000);
    }
    // ============================================================================
    // Variable operations
    // ============================================================================
    async updateVariable(variableId, modeId, value) {
        return this.sendCommand('UPDATE_VARIABLE', { variableId, modeId, value });
    }
    async createVariable(name, collectionId, resolvedType, options) {
        const params = { name, collectionId, resolvedType };
        if (options) {
            if (options.valuesByMode)
                params.valuesByMode = options.valuesByMode;
            if (options.description)
                params.description = options.description;
            if (options.scopes)
                params.scopes = options.scopes;
        }
        return this.sendCommand('CREATE_VARIABLE', params);
    }
    async deleteVariable(variableId) {
        return this.sendCommand('DELETE_VARIABLE', { variableId });
    }
    async refreshVariables() {
        return this.sendCommand('REFRESH_VARIABLES', {}, 300000);
    }
    async renameVariable(variableId, newName) {
        const result = await this.sendCommand('RENAME_VARIABLE', { variableId, newName });
        if (!result.oldName && result.variable?.oldName)
            result.oldName = result.variable.oldName;
        return result;
    }
    async setVariableDescription(variableId, description) {
        return this.sendCommand('SET_VARIABLE_DESCRIPTION', { variableId, description });
    }
    // ============================================================================
    // Mode operations
    // ============================================================================
    async addMode(collectionId, modeName) {
        return this.sendCommand('ADD_MODE', { collectionId, modeName });
    }
    async renameMode(collectionId, modeId, newName) {
        const result = await this.sendCommand('RENAME_MODE', { collectionId, modeId, newName });
        if (!result.oldName && result.collection?.oldName)
            result.oldName = result.collection.oldName;
        return result;
    }
    // ============================================================================
    // Collection operations
    // ============================================================================
    async createVariableCollection(name, options) {
        const params = { name };
        if (options) {
            if (options.initialModeName)
                params.initialModeName = options.initialModeName;
            if (options.additionalModes)
                params.additionalModes = options.additionalModes;
        }
        return this.sendCommand('CREATE_VARIABLE_COLLECTION', params);
    }
    async deleteVariableCollection(collectionId) {
        return this.sendCommand('DELETE_VARIABLE_COLLECTION', { collectionId });
    }
    // ============================================================================
    // Component operations
    // ============================================================================
    async getComponentFromPluginUI(nodeId) {
        return this.sendCommand('GET_COMPONENT', { nodeId }, 10000);
    }
    async getLocalComponents() {
        return this.sendCommand('GET_LOCAL_COMPONENTS', {}, 300000);
    }
    async setNodeDescription(nodeId, description, descriptionMarkdown) {
        return this.sendCommand('SET_NODE_DESCRIPTION', { nodeId, description, descriptionMarkdown });
    }
    async addComponentProperty(nodeId, propertyName, type, defaultValue, options) {
        const params = { nodeId, propertyName, propertyType: type, defaultValue };
        if (options?.preferredValues)
            params.preferredValues = options.preferredValues;
        return this.sendCommand('ADD_COMPONENT_PROPERTY', params);
    }
    async editComponentProperty(nodeId, propertyName, newValue) {
        return this.sendCommand('EDIT_COMPONENT_PROPERTY', { nodeId, propertyName, newValue });
    }
    async deleteComponentProperty(nodeId, propertyName) {
        return this.sendCommand('DELETE_COMPONENT_PROPERTY', { nodeId, propertyName });
    }
    async instantiateComponent(componentKey, options) {
        const params = { componentKey };
        if (options) {
            if (options.nodeId)
                params.nodeId = options.nodeId;
            if (options.position)
                params.position = options.position;
            if (options.size)
                params.size = options.size;
            if (options.overrides)
                params.overrides = options.overrides;
            if (options.variant)
                params.variant = options.variant;
            if (options.parentId)
                params.parentId = options.parentId;
        }
        return this.sendCommand('INSTANTIATE_COMPONENT', params);
    }
    // ============================================================================
    // Node manipulation
    // ============================================================================
    async resizeNode(nodeId, width, height, withConstraints = true) {
        return this.sendCommand('RESIZE_NODE', { nodeId, width, height, withConstraints });
    }
    async moveNode(nodeId, x, y) {
        return this.sendCommand('MOVE_NODE', { nodeId, x, y });
    }
    async setNodeFills(nodeId, fills) {
        return this.sendCommand('SET_NODE_FILLS', { nodeId, fills });
    }
    async setNodeStrokes(nodeId, strokes, strokeWeight) {
        const params = { nodeId, strokes };
        if (strokeWeight !== undefined)
            params.strokeWeight = strokeWeight;
        return this.sendCommand('SET_NODE_STROKES', params);
    }
    async setNodeOpacity(nodeId, opacity) {
        return this.sendCommand('SET_NODE_OPACITY', { nodeId, opacity });
    }
    async setNodeCornerRadius(nodeId, radius) {
        return this.sendCommand('SET_NODE_CORNER_RADIUS', { nodeId, radius });
    }
    async cloneNode(nodeId) {
        return this.sendCommand('CLONE_NODE', { nodeId });
    }
    async deleteNode(nodeId) {
        return this.sendCommand('DELETE_NODE', { nodeId });
    }
    async renameNode(nodeId, newName) {
        return this.sendCommand('RENAME_NODE', { nodeId, newName });
    }
    async setTextContent(nodeId, characters, options) {
        const params = { nodeId, text: characters };
        if (options) {
            if (options.fontSize)
                params.fontSize = options.fontSize;
            if (options.fontWeight)
                params.fontWeight = options.fontWeight;
            if (options.fontFamily)
                params.fontFamily = options.fontFamily;
        }
        return this.sendCommand('SET_TEXT_CONTENT', params);
    }
    async createChildNode(parentId, nodeType, properties) {
        return this.sendCommand('CREATE_CHILD_NODE', { parentId, nodeType, properties: properties || {} });
    }
    // ============================================================================
    // Screenshot & instance properties
    // ============================================================================
    async captureScreenshot(nodeId, options) {
        const params = { nodeId };
        if (options?.format)
            params.format = options.format;
        if (options?.scale)
            params.scale = options.scale;
        return this.sendCommand('CAPTURE_SCREENSHOT', params, 30000);
    }
    async setInstanceProperties(nodeId, properties) {
        return this.sendCommand('SET_INSTANCE_PROPERTIES', { nodeId, properties });
    }
    // ============================================================================
    // Image fill
    // ============================================================================
    async setImageFill(nodeIds, imageData, scaleMode = 'FILL') {
        return this.sendCommand('SET_IMAGE_FILL', { nodeIds, imageData, scaleMode }, 60000);
    }
    // ============================================================================
    // Design lint
    // ============================================================================
    async lintDesign(nodeId, rules, maxDepth, maxFindings) {
        const params = {};
        if (nodeId)
            params.nodeId = nodeId;
        if (rules)
            params.rules = rules;
        if (maxDepth !== undefined)
            params.maxDepth = maxDepth;
        if (maxFindings !== undefined)
            params.maxFindings = maxFindings;
        return this.sendCommand('LINT_DESIGN', params, 120000);
    }
    // ============================================================================
    // FigJam operations
    // ============================================================================
    async createSticky(params) {
        return this.sendCommand('CREATE_STICKY', params);
    }
    async createStickies(params) {
        return this.sendCommand('CREATE_STICKIES', params, 30000);
    }
    async createConnector(params) {
        return this.sendCommand('CREATE_CONNECTOR', params);
    }
    async createShapeWithText(params) {
        return this.sendCommand('CREATE_SHAPE_WITH_TEXT', params);
    }
    async createTable(params) {
        return this.sendCommand('CREATE_TABLE', params, 30000);
    }
    async createCodeBlock(params) {
        return this.sendCommand('CREATE_CODE_BLOCK', params);
    }
    async getBoardContents(params) {
        return this.sendCommand('GET_BOARD_CONTENTS', params, 30000);
    }
    async getConnections() {
        return this.sendCommand('GET_CONNECTIONS', {}, 15000);
    }
    // ============================================================================
    // Slides operations
    // ============================================================================
    async listSlides() {
        return this.sendCommand('LIST_SLIDES', {}, 10000);
    }
    async getSlideContent(params) {
        return this.sendCommand('GET_SLIDE_CONTENT', params, 10000);
    }
    async createSlide(params) {
        return this.sendCommand('CREATE_SLIDE', params, 10000);
    }
    async deleteSlide(params) {
        return this.sendCommand('DELETE_SLIDE', params, 5000);
    }
    async duplicateSlide(params) {
        return this.sendCommand('DUPLICATE_SLIDE', params, 5000);
    }
    async getSlideGrid() {
        return this.sendCommand('GET_SLIDE_GRID', {}, 10000);
    }
    async reorderSlides(params) {
        return this.sendCommand('REORDER_SLIDES', params, 15000);
    }
    async setSlideTransition(params) {
        return this.sendCommand('SET_SLIDE_TRANSITION', params, 5000);
    }
    async getSlideTransition(params) {
        return this.sendCommand('GET_SLIDE_TRANSITION', params, 5000);
    }
    async setSlidesViewMode(params) {
        return this.sendCommand('SET_SLIDES_VIEW_MODE', params, 5000);
    }
    async getFocusedSlide() {
        return this.sendCommand('GET_FOCUSED_SLIDE', {}, 5000);
    }
    async focusSlide(params) {
        return this.sendCommand('FOCUS_SLIDE', params, 5000);
    }
    async skipSlide(params) {
        return this.sendCommand('SKIP_SLIDE', params, 5000);
    }
    async addTextToSlide(params) {
        return this.sendCommand('ADD_TEXT_TO_SLIDE', params, 10000);
    }
    async addShapeToSlide(params) {
        return this.sendCommand('ADD_SHAPE_TO_SLIDE', params, 5000);
    }
    // ============================================================================
    // Cache management (no-op for cloud relay)
    // ============================================================================
    clearFrameCache() {
        // No frame cache in cloud relay mode
    }
    // ============================================================================
    // Transport — fetch-based RPC to the relay DO
    // ============================================================================
    async sendCommand(method, params = {}, timeoutMs = 15000) {
        const res = await this.relayStub.fetch('https://relay/relay/command', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ method, params, timeoutMs }),
        });
        const data = await res.json();
        if (data.error) {
            throw new Error(data.error);
        }
        return data.result;
    }
}
