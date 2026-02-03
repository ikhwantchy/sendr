/**
 * Traffic Tool - Get traffic conditions using HERE Traffic API
 */
export interface TrafficData {
    route: string;
    condition: string;
    duration: string;
    distance: string;
    description: string;
}
export declare class TrafficTool {
    private apiKey;
    private geocodingUrl;
    private routingUrl;
    constructor();
    getTraffic(from?: string, to?: string): Promise<TrafficData>;
    private geocodeLocation;
    private getDurationRange;
    private getMockTraffic;
    formatTrafficResponse(traffic: TrafficData): string;
}
//# sourceMappingURL=trafficTool.d.ts.map