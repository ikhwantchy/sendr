/**
 * Tool Manager - Manages all available tools for LLM function calling
 */

import { WeatherTool, WeatherData } from './weatherTool';
import { TrafficTool, TrafficData } from './trafficTool';
import { logger } from '../../utils/logger';

export interface ToolDefinition {
    name: string;
    description: string;
    parameters: {
        type: string;
        properties: any;
        required?: string[];
    };
}

export class ToolManager {
    private weatherTool: WeatherTool;
    private trafficTool: TrafficTool;

    constructor() {
        this.weatherTool = new WeatherTool();
        this.trafficTool = new TrafficTool();
    }

    getAvailableTools(): ToolDefinition[] {
        return [
            {
                name: 'get_weather',
                description: 'Mendapatkan informasi cuaca real-time SAAT INI untuk lokasi tertentu di Indonesia',
                parameters: {
                    type: 'object',
                    properties: {
                        location: {
                            type: 'string',
                            description: 'Nama kota/lokasi, contoh: "Tangerang Selatan", "Jakarta", "Bandung"'
                        }
                    },
                    required: ['location']
                }
            },
            {
                name: 'get_weather_forecast',
                description: 'Mendapatkan prakiraan cuaca (forecast) atau cuaca sebelumnya (historical). Gunakan ini untuk pertanyaan tentang cuaca besok, lusa, kemarin, dll.',
                parameters: {
                    type: 'object',
                    properties: {
                        location: {
                            type: 'string',
                            description: 'Nama kota/lokasi, contoh: "Tangerang Selatan", "Jakarta"'
                        },
                        days: {
                            type: 'number',
                            description: 'Jumlah hari dari hari ini: 0=hari ini, 1=besok, 2=lusa, -1=kemarin, -2=2 hari lalu. Maksimal: 7 hari ke depan atau 7 hari ke belakang'
                        }
                    },
                    required: ['location', 'days']
                }
            },
            {
                name: 'get_traffic',
                description: 'Mendapatkan kondisi lalu lintas antara dua lokasi',
                parameters: {
                    type: 'object',
                    properties: {
                        from: {
                            type: 'string',
                            description: 'Lokasi asal, contoh: "Jakarta"'
                        },
                        to: {
                            type: 'string',
                            description: 'Lokasi tujuan, contoh: "Tangerang Selatan"'
                        }
                    },
                    required: ['from', 'to']
                }
            }
        ];
    }

    async executeTool(toolName: string, parameters: any): Promise<string> {
        try {
            logger.info('Executing tool', { toolName, parameters });

            switch (toolName) {
                case 'get_weather': {
                    const weather = await this.weatherTool.getWeather(parameters.location);
                    return this.weatherTool.formatWeatherResponse(weather);
                }

                case 'get_weather_forecast': {
                    const weather = await this.weatherTool.getWeatherForecast(parameters.location, parameters.days);
                    const dayLabel = parameters.days === 0 ? 'hari ini' :
                        parameters.days === 1 ? 'besok' :
                            parameters.days === -1 ? 'kemarin' :
                                parameters.days > 0 ? `${parameters.days} hari lagi` :
                                    `${Math.abs(parameters.days)} hari lalu`;
                    return `Cuaca ${dayLabel} di ${weather.location}: ${weather.description} ${this.weatherTool.getWeatherEmoji(weather.condition)}, suhu ${weather.temperature}°C.`;
                }

                case 'get_traffic': {
                    const traffic = await this.trafficTool.getTraffic(parameters.from, parameters.to);
                    return this.trafficTool.formatTrafficResponse(traffic);
                }

                default:
                    logger.warn('Unknown tool requested', { toolName });
                    return `Tool "${toolName}" tidak tersedia.`;
            }
        } catch (error: any) {
            logger.error('Tool execution error', { toolName, error: error.message });
            return `Maaf, terjadi error saat mengakses ${toolName}.`;
        }
    }
}
