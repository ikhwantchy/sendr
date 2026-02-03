/**
 * Weather Tool - Get real-time weather data using OpenMeteo (Free, No API Key!)
 */
export interface WeatherData {
    location: string;
    temperature: number;
    condition: string;
    humidity: number;
    windSpeed: number;
    description: string;
}
export declare class WeatherTool {
    private geocodingUrl;
    private weatherUrl;
    getWeather(location?: string): Promise<WeatherData>;
    /**
     * Get weather forecast or historical data
     * @param location Location name
     * @param days Number of days: 0=today, 1=tomorrow, -1=yesterday, etc. Max: 7 days future, -7 days past
     */
    getWeatherForecast(location: string, days?: number): Promise<WeatherData>;
    private getConditionFromCode;
    private getDescriptionFromCode;
    private getMockWeather;
    getWeatherEmoji(condition: string): string;
    formatWeatherResponse(weather: WeatherData): string;
}
//# sourceMappingURL=weatherTool.d.ts.map