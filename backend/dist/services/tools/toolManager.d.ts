/**
 * Tool Manager - Manages all available tools for LLM function calling
 */
export interface ToolDefinition {
    name: string;
    description: string;
    parameters: {
        type: string;
        properties: any;
        required?: string[];
    };
}
export declare class ToolManager {
    private weatherTool;
    private trafficTool;
    constructor();
    getAvailableTools(): ToolDefinition[];
    executeTool(toolName: string, parameters: any): Promise<string>;
}
//# sourceMappingURL=toolManager.d.ts.map