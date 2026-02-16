/**
 * Knowledge Base Service
 * 
 * Provides AI context injection from Google Sheets configured as "Knowledge Base"
 * in per-target llm_config.knowledgeBase.
 * 
 * Features:
 * - Memory cache with configurable TTL (default 90s) to avoid hammering Google Sheets
 * - Flexible intent detection (keyword patterns + always-inject mode)
 * - Smart data formatting: filters expired items, limits rows, formats by sheet type
 * - Works alongside existing aiSheetUpdaterService (which uses ai_sheet_updaters table)
 */

import { logger } from '../utils/logger';
import googleSheetsService from './googleSheetsService';

// ── Types ───────────────────────────────────────────────────────────────────

export interface KnowledgeBaseConfig {
    /** Array of Google Sheet sources */
    sheets: KnowledgeBaseSheet[];
    /** Intent detection mode: 'auto' = keyword matching, 'always' = inject on every message */
    mode: 'auto' | 'always';
    /** Custom keywords to trigger context injection (used when mode = 'auto') */
    customKeywords?: string[];
    /** Cache TTL in seconds (default 90) */
    cacheTTLSeconds?: number;
    /** Max rows to include per sheet (default 30) */
    maxRowsPerSheet?: number;
}

export interface KnowledgeBaseSheet {
    /** Full Google Sheets URL */
    url: string;
    /** Sheet/tab name (default: first sheet) */
    sheetName?: string;
    /** Human-readable label for this data source */
    label?: string;
}

interface CacheEntry {
    data: FormattedSheetData;
    fetchedAt: number;
}

interface FormattedSheetData {
    label: string;
    sheetName: string;
    headers: string[];
    totalRows: number;
    formatted: string;
}

// ── Service ─────────────────────────────────────────────────────────────────

class KnowledgeBaseService {
    /** In-memory cache: key = `${spreadsheetId}:${sheetName}` */
    private cache: Map<string, CacheEntry> = new Map();

    /** Default built-in keywords for academic/task queries (Indonesian + English) */
    private readonly DEFAULT_KEYWORDS: string[] = [
        // Indonesian
        'ada tugas', 'tugas apa', 'list tugas', 'daftar tugas',
        'deadline apa', 'ada deadline', 'kapan deadline',
        'rekap tugas', 'rekap deadline', 'apa aja tugas', 'apa saja tugas',
        'tugas yang ada', 'reminder tugas', 'ingetin tugas',
        'cek tugas', 'lihat tugas', 'jadwal apa', 'ada jadwal',
        'jadwal kuliah', 'jadwal kelas', 'jadwal hari ini',
        'jadwal besok', 'jadwal minggu ini', 'mata kuliah',
        'matkul apa', 'dosen siapa', 'ruangan mana', 'kelas apa',
        'pr apa', 'ada pr', 'tugas kuliah', 'ujian kapan',
        'uts kapan', 'uas kapan', 'quiz kapan', 'kuis kapan',
        'pengumuman', 'info terbaru', 'update terbaru',
        'data apa', 'cek data', 'lihat data', 'tampilkan data',
        'berapa', 'siapa yang', 'dimana', 'kapan',
        'harga', 'biaya', 'tarif', 'ongkir', 'ongkos',
        'produk', 'barang', 'stok', 'tersedia',
        'menu', 'daftar menu', 'ada menu',
        // English
        'show tasks', 'what tasks', 'any tasks', 'list deadlines',
        'any deadlines', 'what deadlines', 'check schedule',
        'show schedule', 'what schedule', 'class schedule',
        'show data', 'check data', 'list data', 'get data',
        'how much', 'how many', 'what is the',
        'price', 'cost', 'stock', 'available',
        'product', 'menu', 'catalog',
    ];

    /**
     * Check if a message should trigger knowledge base context injection
     */
    shouldInjectContext(message: string, config: KnowledgeBaseConfig): boolean {
        if (!config || !config.sheets || config.sheets.length === 0) {
            return false;
        }

        // Always-inject mode: every message gets context
        if (config.mode === 'always') {
            return true;
        }

        // Auto mode: check keywords
        const lowerMessage = message.toLowerCase().trim();

        // Check custom keywords first
        if (config.customKeywords && config.customKeywords.length > 0) {
            if (config.customKeywords.some(kw => lowerMessage.includes(kw.toLowerCase()))) {
                return true;
            }
        }

        // Check default keywords
        return this.DEFAULT_KEYWORDS.some(kw => lowerMessage.includes(kw));
    }

    /**
     * Fetch and format all knowledge base sheets for context injection
     * Returns formatted string ready to append to system prompt, or null if no data
     */
    async getContextForChat(config: KnowledgeBaseConfig): Promise<string | null> {
        if (!config || !config.sheets || config.sheets.length === 0) {
            return null;
        }

        const cacheTTL = (config.cacheTTLSeconds || 90) * 1000; // Convert to ms
        const maxRows = config.maxRowsPerSheet || 30;
        const results: FormattedSheetData[] = [];

        for (const sheet of config.sheets) {
            try {
                const data = await this.fetchSheetWithCache(sheet, cacheTTL, maxRows);
                if (data) {
                    results.push(data);
                }
            } catch (err: any) {
                logger.warn('[KnowledgeBase] Failed to fetch sheet', {
                    url: sheet.url,
                    sheetName: sheet.sheetName,
                    error: err.message,
                });
            }
        }

        if (results.length === 0) {
            return null;
        }

        // Combine all sheets into one context block
        const sections = results.map(r => {
            return `📋 ${r.label} (${r.sheetName})\nKolom: ${r.headers.join(', ')}\nTotal data: ${r.totalRows} baris\n\n${r.formatted}`;
        });

        return sections.join('\n\n---\n\n');
    }

    /**
     * Fetch sheet data with caching
     */
    private async fetchSheetWithCache(
        sheet: KnowledgeBaseSheet,
        cacheTTLMs: number,
        maxRows: number
    ): Promise<FormattedSheetData | null> {
        const spreadsheetId = googleSheetsService.extractSpreadsheetId(sheet.url);
        if (!spreadsheetId) {
            logger.warn('[KnowledgeBase] Invalid Google Sheets URL', { url: sheet.url });
            return null;
        }

        const sheetName = sheet.sheetName || 'Sheet1';
        const cacheKey = `${spreadsheetId}:${sheetName}`;

        // Check cache
        const cached = this.cache.get(cacheKey);
        if (cached && (Date.now() - cached.fetchedAt) < cacheTTLMs) {
            logger.debug('[KnowledgeBase] Cache hit', { cacheKey });
            return cached.data;
        }

        // Fetch from Google Sheets
        logger.info('[KnowledgeBase] Fetching sheet data', { spreadsheetId, sheetName });
        const rawData = await googleSheetsService.fetchSheetData(spreadsheetId, sheetName);

        if (!rawData || rawData.rows.length === 0) {
            const emptyResult: FormattedSheetData = {
                label: sheet.label || sheetName,
                sheetName,
                headers: rawData?.headers || [],
                totalRows: 0,
                formatted: '(Tidak ada data)',
            };
            this.cache.set(cacheKey, { data: emptyResult, fetchedAt: Date.now() });
            return emptyResult;
        }

        // Smart formatting
        const formatted = this.formatSheetData(rawData.headers, rawData.rows, maxRows);

        const result: FormattedSheetData = {
            label: sheet.label || sheetName,
            sheetName,
            headers: rawData.headers,
            totalRows: rawData.rows.length,
            formatted,
        };

        // Store in cache
        this.cache.set(cacheKey, { data: result, fetchedAt: Date.now() });

        return result;
    }

    /**
     * Smart data formatting:
     * - Detects date columns and filters expired items (optional)
     * - Limits to maxRows most recent entries
     * - Formats as numbered list with key:value pairs
     */
    private formatSheetData(headers: string[], rows: any[][], maxRows: number): string {
        if (rows.length === 0) return '(Tidak ada data)';

        // Detect date columns
        const dateColumnIndices = this.detectDateColumns(headers);

        // Try to filter out expired items if there's a deadline/date column
        let filteredRows = rows;
        if (dateColumnIndices.length > 0) {
            const now = new Date();
            now.setHours(0, 0, 0, 0);

            // Use the first date column that looks like a deadline
            const deadlineColIdx = this.findDeadlineColumn(headers, dateColumnIndices);
            if (deadlineColIdx !== -1) {
                const activeRows = rows.filter(row => {
                    const dateVal = row[deadlineColIdx];
                    if (!dateVal || String(dateVal).trim() === '') return true; // Keep rows without dates
                    const parsed = this.parseDate(String(dateVal));
                    if (!parsed) return true; // Keep rows with unparseable dates
                    return parsed >= now; // Keep future/today dates
                });

                // Only filter if we still have some rows left
                if (activeRows.length > 0) {
                    filteredRows = activeRows;
                }
            }
        }

        // Sort by date if possible (earliest first)
        if (dateColumnIndices.length > 0) {
            const sortCol = dateColumnIndices[0];
            filteredRows = [...filteredRows].sort((a, b) => {
                const dateA = this.parseDate(String(a[sortCol] || ''));
                const dateB = this.parseDate(String(b[sortCol] || ''));
                if (!dateA && !dateB) return 0;
                if (!dateA) return 1;
                if (!dateB) return -1;
                return dateA.getTime() - dateB.getTime();
            });
        }

        // Limit rows
        const limitedRows = filteredRows.slice(0, maxRows);

        // Format as numbered list
        const formatted = limitedRows.map((row, idx) => {
            const parts: string[] = [];
            for (let i = 0; i < headers.length && i < row.length; i++) {
                const val = String(row[i] || '').trim();
                if (val) {
                    parts.push(`${headers[i]}: ${val}`);
                }
            }
            return `${idx + 1}. ${parts.join(' | ')}`;
        });

        let result = formatted.join('\n');

        if (filteredRows.length > maxRows) {
            result += `\n\n(... dan ${filteredRows.length - maxRows} data lainnya)`;
        }

        return result;
    }

    /**
     * Detect which column indices likely contain dates
     */
    private detectDateColumns(headers: string[]): number[] {
        const dateKeywords = [
            'tanggal', 'date', 'deadline', 'due', 'tenggat',
            'waktu', 'time', 'jadwal', 'schedule', 'mulai', 'start',
            'selesai', 'end', 'expired', 'expires', 'batas',
        ];

        return headers
            .map((h, idx) => {
                const lower = h.toLowerCase();
                return dateKeywords.some(kw => lower.includes(kw)) ? idx : -1;
            })
            .filter(idx => idx !== -1);
    }

    /**
     * Find the most likely "deadline" column among date columns
     */
    private findDeadlineColumn(headers: string[], dateColIndices: number[]): number {
        const deadlineKeywords = ['deadline', 'due', 'tenggat', 'batas', 'expired', 'expires'];

        for (const idx of dateColIndices) {
            const lower = headers[idx].toLowerCase();
            if (deadlineKeywords.some(kw => lower.includes(kw))) {
                return idx;
            }
        }
        return -1; // No obvious deadline column
    }

    /**
     * Parse various date formats
     */
    private parseDate(dateStr: string): Date | null {
        if (!dateStr || dateStr.trim() === '') return null;

        const trimmed = dateStr.trim();

        // Try native parsing first
        const native = new Date(trimmed);
        if (!isNaN(native.getTime()) && native.getFullYear() > 2000) {
            return native;
        }

        // Try DD/MM/YYYY or DD-MM-YYYY
        const dmyMatch = trimmed.match(/^(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{4})$/);
        if (dmyMatch) {
            const [, day, month, year] = dmyMatch;
            const d = new Date(parseInt(year), parseInt(month) - 1, parseInt(day));
            if (!isNaN(d.getTime())) return d;
        }

        // Try DD/MM/YY
        const dmyShort = trimmed.match(/^(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{2})$/);
        if (dmyShort) {
            const [, day, month, year] = dmyShort;
            const fullYear = parseInt(year) + 2000;
            const d = new Date(fullYear, parseInt(month) - 1, parseInt(day));
            if (!isNaN(d.getTime())) return d;
        }

        return null;
    }

    /**
     * Clear cache for a specific sheet or all sheets
     */
    clearCache(spreadsheetId?: string): void {
        if (spreadsheetId) {
            for (const key of this.cache.keys()) {
                if (key.startsWith(spreadsheetId + ':')) {
                    this.cache.delete(key);
                }
            }
        } else {
            this.cache.clear();
        }
        logger.info('[KnowledgeBase] Cache cleared', { spreadsheetId: spreadsheetId || 'all' });
    }

    /**
     * Get cache stats (for monitoring)
     */
    getCacheStats(): { entries: number; keys: string[] } {
        return {
            entries: this.cache.size,
            keys: Array.from(this.cache.keys()),
        };
    }
}

export const knowledgeBaseService = new KnowledgeBaseService();
export default knowledgeBaseService;
