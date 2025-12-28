import { format } from 'date-fns';
import { toZonedTime } from 'date-fns-tz';

interface TemplateVariable {
    key: string;
    value: string;
}

interface DataPipelineConfig {
    filter?: {
        column: string;
        operator: 'equals' | 'contains' | 'greater' | 'less' | 'between';
        value: any;
    }[];
    sort?: {
        column: string;
        order: 'asc' | 'desc';
    };
    limit?: number;
}

/**
 * Template Engine Service
 * Handles message template processing and variable replacement
 */
class TemplateEngineService {
    /**
     * Replace variables in template with actual values
     */
    processTemplate(template: string, variables: Record<string, any>): string {
        let processed = template;

        // Replace all {VARIABLE_NAME} with actual values
        Object.entries(variables).forEach(([key, value]) => {
            const regex = new RegExp(`{${key}}`, 'g');
            processed = processed.replace(regex, String(value));
        });

        return processed;
    }

    /**
     * Generate variables from sheet data for academic digest
     */
    generateAcademicDigestVariables(
        scheduleData: any[],
        tasksData: any[],
        timezone: string = 'Asia/Jakarta'
    ): Record<string, any> {
        const now = new Date();
        const zonedDate = toZonedTime(now, timezone);

        // Get today's info
        const todayDate = format(zonedDate, 'dd/MM/yyyy');
        const dayNames = ['Minggu', 'Senin', 'Selasa', 'Rabu', 'Kamis', 'Jumat', 'Sabtu'];
        const todayName = dayNames[zonedDate.getDay()];

        // Filter today's schedule
        const todaySchedule = this.filterTodaySchedule(scheduleData, todayName);
        const scheduleText = this.formatSchedule(todaySchedule);

        // Filter urgent tasks (deadline <= 3 days)
        const urgentTasks = this.filterUrgentTasks(tasksData, zonedDate);
        const tasksText = this.formatTasks(urgentTasks);

        return {
            TODAY_DATE: todayDate,
            TODAY_NAME: todayName,
            SCHEDULE_TODAY: scheduleText || 'Tidak ada jadwal hari ini',
            TASKS_URGENT: tasksText || 'Tidak ada tugas mendesak',
        };
    }

    /**
     * Filter schedule for today based on day name
     */
    private filterTodaySchedule(scheduleData: any[], todayName: string): any[] {
        return scheduleData.filter(item => {
            const hari = item['Hari'] || item['Day'] || '';
            return hari.toLowerCase() === todayName.toLowerCase();
        });
    }

    /**
     * Format schedule data into readable text
     */
    private formatSchedule(scheduleData: any[]): string {
        if (scheduleData.length === 0) return '';

        return scheduleData.map((item, index) => {
            const mataKuliah = item['Mata Kuliah'] || item['Subject'] || 'Unknown';
            const waktu = item['Waktu'] || item['Time'] || '';
            const dosen = item['Dosen'] || item['Lecturer'] || '';

            return `${index + 1}. ${mataKuliah}\n   ${waktu}\n   ${dosen}`;
        }).join('\n\n');
    }

    /**
     * Filter tasks with deadline <= 3 days from now
     */
    private filterUrgentTasks(tasksData: any[], currentDate: Date): any[] {
        const threeDaysLater = new Date(currentDate);
        threeDaysLater.setDate(threeDaysLater.getDate() + 3);

        return tasksData.filter(item => {
            const deadlineStr = item['Deadline'] || item['Due Date'] || '';
            if (!deadlineStr) return false;

            try {
                // Parse deadline (assuming format: DD/MM/YYYY)
                const [day, month, year] = deadlineStr.split('/').map(Number);
                const deadline = new Date(year, month - 1, day);

                return deadline >= currentDate && deadline <= threeDaysLater;
            } catch (error) {
                return false;
            }
        });
    }

    /**
     * Format tasks data into readable text
     */
    private formatTasks(tasksData: any[]): string {
        if (tasksData.length === 0) return '';

        return tasksData.map((item, index) => {
            const tugas = item['Tugas'] || item['Task'] || 'Unknown';
            const deadline = item['Deadline'] || item['Due Date'] || '';
            const kelompok = item['Kelompok'] || item['Group'] || '';
            const materi = item['Materi'] || item['Material'] || '';

            let text = `${index + 1}. ${tugas}`;
            if (deadline) text += `\n   ${deadline}`;
            if (kelompok) text += `\n   ${kelompok}`;
            if (materi) text += ` - ${materi}`;

            return text;
        }).join('\n\n');
    }

    /**
     * Apply data pipeline transformations
     */
    applyDataPipeline(data: any[], config: DataPipelineConfig): any[] {
        let result = [...data];

        // Apply filters
        if (config.filter) {
            config.filter.forEach(filter => {
                result = result.filter(item => {
                    const value = item[filter.column];

                    switch (filter.operator) {
                        case 'equals':
                            return value === filter.value;
                        case 'contains':
                            return String(value).toLowerCase().includes(String(filter.value).toLowerCase());
                        case 'greater':
                            return Number(value) > Number(filter.value);
                        case 'less':
                            return Number(value) < Number(filter.value);
                        default:
                            return true;
                    }
                });
            });
        }

        // Apply sorting
        if (config.sort) {
            result.sort((a, b) => {
                const aVal = a[config.sort!.column];
                const bVal = b[config.sort!.column];

                if (config.sort!.order === 'asc') {
                    return aVal > bVal ? 1 : -1;
                } else {
                    return aVal < bVal ? 1 : -1;
                }
            });
        }

        // Apply limit
        if (config.limit) {
            result = result.slice(0, config.limit);
        }

        return result;
    }

    /**
     * Extract variables from template
     */
    extractVariables(template: string): string[] {
        const regex = /{([A-Z_]+)}/g;
        const matches = template.matchAll(regex);
        return Array.from(matches, m => m[1]);
    }

    /**
     * Validate template (check if all variables can be resolved)
     */
    validateTemplate(template: string, availableVariables: string[]): { valid: boolean; missingVariables: string[] } {
        const usedVariables = this.extractVariables(template);
        const missingVariables = usedVariables.filter(v => !availableVariables.includes(v));

        return {
            valid: missingVariables.length === 0,
            missingVariables,
        };
    }
}

export default new TemplateEngineService();
