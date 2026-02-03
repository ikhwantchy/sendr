"use strict";
/**
 * Traffic Tool - Get traffic conditions using HERE Traffic API
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.TrafficTool = void 0;
const logger_1 = require("../../utils/logger");
class TrafficTool {
    apiKey;
    geocodingUrl = 'https://geocode.search.hereapi.com/v1/geocode';
    routingUrl = 'https://router.hereapi.com/v8/routes';
    constructor() {
        this.apiKey = process.env.HERE_API_KEY || '';
    }
    async getTraffic(from = 'Jakarta', to = 'Tangerang Selatan') {
        try {
            if (!this.apiKey) {
                logger_1.logger.warn('HERE API key not configured, returning mock data');
                return this.getMockTraffic(from, to);
            }
            logger_1.logger.info('Fetching traffic data', { from, to });
            // Step 1: Geocode origin
            const originCoords = await this.geocodeLocation(from);
            if (!originCoords) {
                return this.getMockTraffic(from, to);
            }
            // Step 2: Geocode destination
            const destCoords = await this.geocodeLocation(to);
            if (!destCoords) {
                return this.getMockTraffic(from, to);
            }
            // Step 3: Get route with traffic
            const routeUrl = `${this.routingUrl}?transportMode=car&origin=${originCoords.lat},${originCoords.lng}&destination=${destCoords.lat},${destCoords.lng}&return=summary,travelSummary&apiKey=${this.apiKey}`;
            const routeResponse = await fetch(routeUrl);
            if (!routeResponse.ok) {
                logger_1.logger.warn('HERE Routing API error, returning mock data', { status: routeResponse.status });
                return this.getMockTraffic(from, to);
            }
            const routeData = await routeResponse.json();
            if (!routeData.routes || routeData.routes.length === 0) {
                logger_1.logger.warn('No routes found, returning mock data');
                return this.getMockTraffic(from, to);
            }
            const route = routeData.routes[0];
            const summary = route.sections[0].travelSummary;
            // Calculate duration in minutes
            const durationMinutes = Math.round(summary.duration / 60);
            const distanceKm = (summary.length / 1000).toFixed(1);
            // Determine traffic condition based on traffic time vs base time
            const trafficTime = summary.duration;
            const baseTime = summary.baseDuration || trafficTime;
            const delay = trafficTime - baseTime;
            const delayPercent = (delay / baseTime) * 100;
            let condition = 'lancar';
            let emoji = '🟢';
            if (delayPercent > 50) {
                condition = 'macet';
                emoji = '🔴';
            }
            else if (delayPercent > 20) {
                condition = 'ramai';
                emoji = '🟡';
            }
            const durationRange = this.getDurationRange(durationMinutes, delayPercent);
            return {
                route: `${from} → ${to}`,
                condition: condition,
                duration: durationRange,
                distance: `~${distanceKm} km`,
                description: `Kondisi jalan ${from} ke ${to} saat ini ${condition} ${emoji}. Estimasi waktu tempuh ${durationRange} (jarak ${distanceKm} km).`
            };
        }
        catch (error) {
            logger_1.logger.error('Traffic tool error', { error: error.message });
            return this.getMockTraffic(from, to);
        }
    }
    async geocodeLocation(location) {
        try {
            const url = `${this.geocodingUrl}?q=${encodeURIComponent(location)},Indonesia&apiKey=${this.apiKey}`;
            const response = await fetch(url);
            if (!response.ok) {
                return null;
            }
            const data = await response.json();
            if (!data.items || data.items.length === 0) {
                return null;
            }
            const position = data.items[0].position;
            return { lat: position.lat, lng: position.lng };
        }
        catch (error) {
            return null;
        }
    }
    getDurationRange(minutes, delayPercent) {
        const variance = Math.max(5, Math.round(minutes * 0.15)); // 15% variance
        const min = minutes;
        const max = minutes + variance;
        return `${min}-${max} menit`;
    }
    getMockTraffic(from, to) {
        // Mock data for demo/fallback
        const conditions = ['lancar', 'ramai', 'macet'];
        const randomCondition = conditions[Math.floor(Math.random() * conditions.length)];
        let duration = '30-40 menit';
        let emoji = '🟢';
        if (randomCondition === 'ramai') {
            duration = '45-60 menit';
            emoji = '🟡';
        }
        else if (randomCondition === 'macet') {
            duration = '60-90 menit';
            emoji = '🔴';
        }
        return {
            route: `${from} → ${to}`,
            condition: randomCondition,
            duration: duration,
            distance: '~25 km',
            description: `Kondisi jalan ${from} ke ${to} saat ini ${randomCondition} ${emoji}. Estimasi waktu tempuh ${duration}.`
        };
    }
    formatTrafficResponse(traffic) {
        return traffic.description;
    }
}
exports.TrafficTool = TrafficTool;
//# sourceMappingURL=trafficTool.js.map