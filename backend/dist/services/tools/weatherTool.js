"use strict";
/**
 * Weather Tool - Get real-time weather data using OpenMeteo (Free, No API Key!)
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.WeatherTool = void 0;
const logger_1 = require("../../utils/logger");
class WeatherTool {
    geocodingUrl = 'https://geocoding-api.open-meteo.com/v1/search';
    weatherUrl = 'https://api.open-meteo.com/v1/forecast';
    async getWeather(location = 'Tangerang Selatan') {
        return this.getWeatherForecast(location, 0); // 0 = today (current)
    }
    /**
     * Get weather forecast or historical data
     * @param location Location name
     * @param days Number of days: 0=today, 1=tomorrow, -1=yesterday, etc. Max: 7 days future, -7 days past
     */
    async getWeatherForecast(location, days = 0) {
        try {
            logger_1.logger.info('Fetching weather forecast', { location, days });
            // Step 1: Get coordinates from location name
            const geoUrl = `${this.geocodingUrl}?name=${encodeURIComponent(location)}&count=1&language=id&format=json`;
            const geoResponse = await fetch(geoUrl);
            if (!geoResponse.ok) {
                logger_1.logger.warn('Geocoding API error, returning mock data', { status: geoResponse.status });
                return this.getMockWeather(location);
            }
            const geoData = await geoResponse.json();
            if (!geoData.results || geoData.results.length === 0) {
                logger_1.logger.warn('Location not found, returning mock data', { location });
                return this.getMockWeather(location);
            }
            const { latitude, longitude, name } = geoData.results[0];
            // Calculate date range based on days parameter
            const today = new Date();
            const targetDate = new Date(today);
            targetDate.setDate(today.getDate() + days);
            const startDate = new Date(targetDate);
            startDate.setDate(targetDate.getDate() - (days < 0 ? Math.abs(days) : 0));
            const endDate = new Date(targetDate);
            endDate.setDate(targetDate.getDate() + (days > 0 ? days : 0));
            const startDateStr = startDate.toISOString().split('T')[0];
            const endDateStr = endDate.toISOString().split('T')[0];
            // Step 2: Get weather data
            let weatherUrl = `${this.weatherUrl}?latitude=${latitude}&longitude=${longitude}&timezone=Asia/Jakarta`;
            if (days === 0) {
                // Current weather
                weatherUrl += `&current=temperature_2m,relative_humidity_2m,wind_speed_10m,weather_code`;
            }
            else {
                // Forecast or historical
                weatherUrl += `&daily=temperature_2m_max,temperature_2m_min,relative_humidity_2m_mean,wind_speed_10m_max,weather_code&start_date=${startDateStr}&end_date=${endDateStr}`;
            }
            const weatherResponse = await fetch(weatherUrl);
            if (!weatherResponse.ok) {
                logger_1.logger.warn('Weather API error, returning mock data', { status: weatherResponse.status });
                return this.getMockWeather(location);
            }
            const weatherData = await weatherResponse.json();
            if (days === 0) {
                // Current weather
                const current = weatherData.current;
                const condition = this.getConditionFromCode(current.weather_code);
                const description = this.getDescriptionFromCode(current.weather_code);
                return {
                    location: name,
                    temperature: Math.round(current.temperature_2m),
                    condition: condition,
                    humidity: current.relative_humidity_2m,
                    windSpeed: current.wind_speed_10m,
                    description: description
                };
            }
            else {
                // Forecast or historical
                const daily = weatherData.daily;
                const index = days < 0 ? daily.time.length - 1 : 0;
                const tempMax = daily.temperature_2m_max[index];
                const tempMin = daily.temperature_2m_min[index];
                const avgTemp = Math.round((tempMax + tempMin) / 2);
                const condition = this.getConditionFromCode(daily.weather_code[index]);
                const description = this.getDescriptionFromCode(daily.weather_code[index]);
                return {
                    location: name,
                    temperature: avgTemp,
                    condition: condition,
                    humidity: Math.round(daily.relative_humidity_2m_mean[index]),
                    windSpeed: daily.wind_speed_10m_max[index],
                    description: description
                };
            }
        }
        catch (error) {
            logger_1.logger.error('Weather tool error', { error: error.message });
            return this.getMockWeather(location);
        }
    }
    getConditionFromCode(code) {
        // WMO Weather interpretation codes
        if (code === 0)
            return 'Clear';
        if (code <= 3)
            return 'Clouds';
        if (code <= 48)
            return 'Fog';
        if (code <= 67)
            return 'Rain';
        if (code <= 77)
            return 'Snow';
        if (code <= 82)
            return 'Rain';
        if (code <= 86)
            return 'Snow';
        if (code <= 99)
            return 'Thunderstorm';
        return 'Clear';
    }
    getDescriptionFromCode(code) {
        const descriptions = {
            0: 'cerah',
            1: 'cerah sebagian',
            2: 'berawan sebagian',
            3: 'berawan',
            45: 'berkabut',
            48: 'berkabut',
            51: 'gerimis ringan',
            53: 'gerimis',
            55: 'gerimis lebat',
            61: 'hujan ringan',
            63: 'hujan',
            65: 'hujan lebat',
            71: 'salju ringan',
            73: 'salju',
            75: 'salju lebat',
            80: 'hujan ringan',
            81: 'hujan',
            82: 'hujan lebat',
            95: 'badai petir',
            96: 'badai petir dengan hujan es',
            99: 'badai petir dengan hujan es lebat'
        };
        return descriptions[code] || 'cerah';
    }
    getMockWeather(location) {
        // Mock data for demo/fallback
        return {
            location: location,
            temperature: 30 + Math.floor(Math.random() * 5),
            condition: 'Clouds',
            humidity: 70 + Math.floor(Math.random() * 20),
            windSpeed: 3 + Math.random() * 2,
            description: 'berawan'
        };
    }
    getWeatherEmoji(condition) {
        const emojiMap = {
            'Clear': '☀️',
            'Clouds': '☁️',
            'Rain': '🌧️',
            'Drizzle': '🌦️',
            'Thunderstorm': '⛈️',
            'Snow': '❄️',
            'Mist': '🌫️',
            'Fog': '🌫️',
            'Haze': '🌫️'
        };
        return emojiMap[condition] || '🌤️';
    }
    formatWeatherResponse(weather) {
        const emoji = this.getWeatherEmoji(weather.condition);
        return `Cuaca di ${weather.location} sekarang ${weather.description} ${emoji}, suhu ${weather.temperature}°C. Kelembaban ${weather.humidity}%, angin ${weather.windSpeed.toFixed(1)} m/s.`;
    }
}
exports.WeatherTool = WeatherTool;
//# sourceMappingURL=weatherTool.js.map