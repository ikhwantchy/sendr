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

        // Replace all {VARIABLE_NAME} or {{VARIABLE_NAME}} with actual values
        Object.entries(variables).forEach(([key, value]) => {
            // Handle both {VAR} and {{VAR}} formats
            const regex = new RegExp(`{+${key}}+`, 'g');
            processed = processed.replace(regex, String(value));
        });

        // Basic global variables
        const now = new Date();
        const dayNames = ['Minggu', 'Senin', 'Selasa', 'Rabu', 'Kamis', 'Jumat', 'Sabtu'];
        processed = processed.replace(/{TODAY}/g, format(now, 'dd/MM/yyyy'));
        processed = processed.replace(/{TODAY_DATE}/g, format(now, 'dd/MM/yyyy'));
        processed = processed.replace(/{TODAY_NAME}/g, dayNames[now.getDay()]);

        return processed;
    }

    /**
     * Render a general template with loop support
     * Format: 
     * Header text
     * {{#LOOP}}
     * {{index}}. {{Nama}} - {{Status}}
     * {{/LOOP}}
     * Footer text
     */
    renderGeneralTemplate(template: string, items: any[], globalVars: Record<string, any> = {}): string {
        let processed = template;

        // 1. Process Global Variables first
        processed = this.processTemplate(processed, globalVars);

        // 2. Handle Loops: {{#LOOP}} ... {{/LOOP}}
        const loopRegex = /{{#LOOP}}([\s\S]*?){{\/LOOP}}/g;

        processed = processed.replace(loopRegex, (_, loopContent) => {
            if (!items || items.length === 0) return '';

            return items.map((item, index) => {
                let renderedItem = loopContent;

                // Replace {{index}} (1-based)
                renderedItem = renderedItem.replace(/{{index}}/g, String(index + 1));

                // Replace all {{ColumnName}} with item values
                Object.keys(item).forEach(key => {
                    const regex = new RegExp(`{{${key}}}`, 'g');
                    renderedItem = renderedItem.replace(regex, String(item[key] || ''));
                });

                // Also support {ColumnName} format
                Object.keys(item).forEach(key => {
                    const regex = new RegExp(`{${key}}`, 'g');
                    renderedItem = renderedItem.replace(regex, String(item[key] || ''));
                });

                return renderedItem;
            }).join('\n');
        });

        // 3. Cleanup: Remove any remaining LOOP tags if regex failed or multiple loops
        processed = processed.replace(/{{#?LOOP}}/g, '').replace(/{{\/?LOOP}}/g, '');

        return processed.trim();
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
     * Get value from row with fuzzy column matching
     */
    private getValue(item: any, possibleColumns: string[]): string {
        // Try exact match first
        for (const col of possibleColumns) {
            if (item[col] !== undefined && item[col] !== '') return String(item[col]);
        }

        // Try case-insensitive match
        const keys = Object.keys(item);
        for (const col of possibleColumns) {
            const match = keys.find(k => k.toLowerCase().trim() === col.toLowerCase().trim());
            if (match && item[match]) return String(item[match]);
        }

        // Try partial match (e.g. "Nama Dosen" matches "Dosen")
        for (const col of possibleColumns) {
            const match = keys.find(k => k.toLowerCase().includes(col.toLowerCase()) || col.toLowerCase().includes(k.toLowerCase()));
            if (match && item[match]) return String(item[match]);
        }

        return '';
    }

    /**
     * Format schedule data into readable text
     * Format:
     * 1. {Mata Kuliah}
     * {Waktu}
     * {Dosen}
     */
    private formatSchedule(scheduleData: any[]): string {
        if (scheduleData.length === 0) return '';

        return scheduleData.map((item, index) => {
            const mataKuliah = this.getValue(item, ['Mata Kuliah', 'Matkul', 'Subject', 'Mapel', 'MK']);
            const waktu = this.getValue(item, ['Waktu', 'Jam', 'Time', 'Pukul', 'Sesi']);
            const dosen = this.getValue(item, ['Dosen', 'Pengajar', 'Lecturer', 'Guru']);
            const ruang = this.getValue(item, ['Ruang', 'Room', 'Kelas', 'Lokasi']);

            let text = `${index + 1}. ${mataKuliah}`;
            if (waktu) text += `\n${waktu}`;
            if (ruang) text += ` (${ruang})`; // Optional: Add room if available
            if (dosen) text += `\n${dosen}`;

            return text;
        }).join('\n\n');
    }

    /**
     * Filter tasks with deadline <= 3 days from now
     */
    private filterUrgentTasks(tasksData: any[], currentDate: Date): any[] {
        const threeDaysLater = new Date(currentDate);
        threeDaysLater.setDate(threeDaysLater.getDate() + 3);

        return tasksData.filter(item => {
            const deadlineStr = this.getValue(item, ['Deadline', 'Tenggat', 'Due Date', 'Tanggal']); // Format: DD/MM/YYYY
            if (!deadlineStr) return false;

            try {
                // Parse deadline (assuming format: DD/MM/YYYY)
                const parts = deadlineStr.split(/[\/\-]/); // Split by / or -
                if (parts.length !== 3) return false;

                const day = parseInt(parts[0]);
                const month = parseInt(parts[1]) - 1; // Month is 0-indexed
                const year = parseInt(parts[2]);

                const deadline = new Date(year, month, day);

                // Use simple date comparison (ignoring time)
                const d1 = new Date(deadline.toDateString());
                const d2 = new Date(currentDate.toDateString());
                const d3 = new Date(threeDaysLater.toDateString());

                return d1 >= d2 && d1 <= d3;
            } catch (error) {
                return false;
            }
        });
    }

    /**
     * Format tasks data into readable text
     * Format:
     * 1. {Mata Kuliah} — {Jenis Tugas}
     * {Hari}, {Tanggal}
     * {Deskripsi/Kelompok/Materi}
     */
    private formatTasks(tasksData: any[]): string {
        if (tasksData.length === 0) return '';

        return tasksData.map((item, index) => {
            const mataKuliah = this.getValue(item, ['Mata Kuliah', 'Matkul', 'Subject', 'MK']);
            const tugas = this.getValue(item, ['Tugas', 'Task', 'Jenis Tugas', 'Type', 'Judul']);
            const deadline = this.getValue(item, ['Deadline', 'Tenggat', 'Due Date', 'Tanggal']); // Format: DD/MM/YYYY
            const hari = this.getValue(item, ['Hari', 'Day']);
            const deskripsi = this.getValue(item, ['Deskripsi', 'Keterangan', 'Detail', 'Note', 'Catatan']);
            const kelompok = this.getValue(item, ['Kelompok', 'Group', 'Tim']);
            const materi = this.getValue(item, ['Materi', 'Material', 'Bab']);

            // Construct title line: "1. Matkul — Tugas" or just "1. Tugas"
            let title = `${index + 1}. ${mataKuliah}`;
            if (tugas && tugas !== mataKuliah) title += ` — ${tugas}`;

            let text = title;

            // Date line: "Rabu, 12/10/2025"
            let dateLine = '';
            if (hari) dateLine += `${hari}, `;
            if (deadline) dateLine += deadline;
            if (dateLine) text += `\n${dateLine}`;

            // Details line: "Kelompok 10 - Materi 11" or Description
            let details = [];
            if (kelompok) details.push(kelompok);
            if (materi) details.push(materi);
            if (deskripsi) details.push(deskripsi);

            if (details.length > 0) {
                text += `\n${details.join(' - ')}`;
            }

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
