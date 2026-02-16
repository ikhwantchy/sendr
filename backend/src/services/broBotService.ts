/**
 * Bro-Bot Service
 * Handles specific student utility commands: Jadwal, Deadline, Tugas, Dosen, Seminar, Admin
 */

import { eventBus } from '../core/events/eventBus';
import { EventType, BaseEvent, MessageReceivedPayload } from '../core/events/types';
import { logger } from '../utils/logger';
import { whatsappAdapter } from '../adapters/whatsapp/whatsappAdapter.baileys';
import googleSheetsService from './googleSheetsService';
import { query } from '../database/connection';

// Placeholder for the Google Sheet ID - User should update this!
// We'll try to load it from system_settings, or fallback to this.
const DEFAULT_SPREADSHEET_ID = '1e3zQA_D-qXqjZ8C_Y_qXqjZ8C_Y_qXqjZ8C_Y'; // Replace with actual ID
const SYSTEM_SETTING_KEY = 'bro_bot_spreadsheet_id';

class BroBotService {
    private spreadsheetId: string = DEFAULT_SPREADSHEET_ID;

    constructor() {
        this.initialize();
    }

    private async initialize() {
        // Subscribe to messages
        eventBus.subscribe(EventType.MESSAGE_RECEIVED, this.handleMessage.bind(this));

        // Try to load spreadsheet ID from settings
        await this.loadConfig();

        logger.info('Bro-Bot Service initialized');
    }

    private async loadConfig() {
        try {
            const result = await query('SELECT value FROM system_settings WHERE key = ?', [SYSTEM_SETTING_KEY]);
            if (result.rows.length > 0) {
                this.spreadsheetId = result.rows[0].value;
            }
        } catch (error) {
            logger.warn('Failed to load Bro-Bot config, using default', { error });
        }
    }

    private async handleMessage(event: BaseEvent<MessageReceivedPayload>) {
        const { context, payload } = event;
        const message = payload.content?.trim();

        if (!message) return;

        // Check for specific commands
        const lowerMsg = message.toLowerCase();

        // 1. Menu / Bot
        if (lowerMsg === 'bot' || lowerMsg === 'bro-bot' || lowerMsg === 'menu') {
            await this.sendMenu(context);
            return;
        }

        // 2. Jadwal
        if (lowerMsg.startsWith('jadwal')) {
            const args = message.split(' ');
            const day = args[1] || this.getTodayName(); // Default to today
            await this.handleJadwal(context, day);
            return;
        }

        // 3. Deadline
        if (lowerMsg === 'deadline') {
            await this.handleDeadline(context);
            return;
        }

        // 4. Tugas
        if (lowerMsg === 'tugas') {
            await this.handleTugas(context);
            return;
        }

        // 5. Recap
        if (lowerMsg === 'recap') {
            await this.handleRecap(context);
            return;
        }

        // 6. Dosen
        if (lowerMsg.startsWith('dosen')) {
            const args = message.split(' ');
            const day = args[1] || this.getTodayName();
            await this.handleDosen(context, day);
            return;
        }

        // 7. Seminar
        if (lowerMsg === 'seminar') {
            await this.handleSeminar(context);
            return;
        }

        // 8. Admin #Kelompok
        if (lowerMsg.startsWith('#kelompok')) {
            const args = message.split(' ');
            const count = parseInt(args[1]);
            if (!isNaN(count)) {
                await this.handleGroupCreate(context, count);
            } else {
                await this.reply(context, '⚠️ Format salah. Gunakan: #Kelompok [Jumlah Anggota]\nContoh: #Kelompok 4');
            }
            return;
        }

        // 9. Reply to specific mentions if not handled by AIEngine (optional overlap)
        // We let AIEngine handle generic mentions.
    }

    // --- Command Handlers ---

    private async sendMenu(context: any) {
        const menu = `*Halo! Ini Bro-Bot, asisten bot yang akan membantumu dalam mencari info perkuliahan.*

Ketik *Bot* untuk melihat menu ini lagi.

*MEMBER*
• *Jadwal*
    Menampilkan jadwal mata kuliah Hari Ini

• *Jadwal [Hari]*
    Menampilkan jadwal lengkap untuk hari yang diminta.
    Contoh: Jadwal Rabu

• *Deadline*
    Menampilkan daftar SEMUA tenggat tugas yang masih berjalan (Aktif).

• *Tugas*
    Menampilkan tugas yang jatuh tempo Minggu Ini

• *Recap*
    Menampilkan rangkuman tugas Minggu Ini yang Belum Selesai

• *Dosen [Hari]*
    Menampilkan nama dan kontak dosen yang mengajar dihari tersebut.
    Contoh: Dosen Senin

• *Seminar*
    Menampilkan daftar seminar yang tersedia.

*UNTUK BERKOMUNIKASI DENGAN BRO-BOT DILUAR KEYWORD, LAKUKAN MENTION KE NOMOR BRO-BOT LALU KETIK PESANNYA BARU BRO-BOT AKAN MENJAWAB* 

*ADMIN*
• *#Kelompok [Jumlah Anggota Kelompok]*
    Membuat kelompok dengan jumlah anggota yang diinput.
    Contoh: "#Kelompok 4" Akan membuat kelompok dengan beranggotakan 4 orang.`;

        await this.reply(context, menu);
    }

    private async handleJadwal(context: any, day: string) {
        try {
            await this.reply(context, `🔍 Mencari jadwal untuk hari ${day}...`);

            // Fetch from Sheet "Jadwal"
            const data = await googleSheetsService.fetchSheetData(this.spreadsheetId, 'Jadwal');
            if (!data) {
                await this.reply(context, '❌ Gagal mengambil data jadwal (Sheet tidak ditemukan).');
                return;
            }

            const rows = googleSheetsService.convertToObjects(data);
            // Assuming headers: [Hari, Jam, Mata Kuliah, Ruang, Dosen]
            // Case-insensitive filtering
            const schedule = rows.filter(r => (r.Hari || '').toLowerCase() === day.toLowerCase());

            if (schedule.length === 0) {
                await this.reply(context, `📅 Tidak ada jadwal kuliah untuk hari ${day}. Libur? 🤔`);
                return;
            }

            let response = `*📅 Jadwal Kuliah - ${day}*\n\n`;
            schedule.forEach(s => {
                response += `📚 *${s['Mata Kuliah'] || 'N/A'}*\n`;
                response += `🕒 ${s.Jam || '-'}\n`;
                response += `🏫 ${s.Ruang || '-'}\n`;
                response += `👨‍🏫 ${s.Dosen || '-'}\n`;
                response += `-------------------\n`;
            });

            await this.reply(context, response);

        } catch (error: any) {
            logger.error('Error handling Jadwal', { error });
            await this.reply(context, `❌ Terjadi kesalahan: ${error.message}`);
        }
    }

    private async handleDeadline(context: any) {
        try {
            await this.reply(context, '🔍 Mencari semua deadline aktif...');

            // Fetch from Sheet "Tugas"
            const data = await googleSheetsService.fetchSheetData(this.spreadsheetId, 'Tugas');
            if (!data) {
                await this.reply(context, '❌ Gagal mengambil data tugas.');
                return;
            }

            const rows = googleSheetsService.convertToObjects(data);
            // Assuming headers: [Mata Kuliah, Tugas, Deadline, Status]
            // Filter: Status != Selesai
            const deadlines = rows.filter(r => (r.Status || '').toLowerCase() !== 'selesai');

            if (deadlines.length === 0) {
                await this.reply(context, '🎉 Tidak ada deadline aktif! Santuy dulu bos. ☕');
                return;
            }

            let response = `*🔥 DAFTAR DEADLINE (SEMUA)*\n\n`;
            deadlines.forEach(d => {
                response += `📌 *${d['Mata Kuliah'] || 'N/A'}*\n`;
                response += `📝 ${d.Tugas || '-'}\n`;
                response += `🕒 ${d.Deadline || '-'}\n`;
                response += `⚠️ Status: ${d.Status || 'Belum Selesai'}\n`;
                response += `-------------------\n`;
            });

            await this.reply(context, response);

        } catch (error: any) {
            await this.reply(context, `❌ Error: ${error.message}`);
        }
    }

    private async handleTugas(context: any) {
        // "Tugas yang jatuh tempo Minggu Ini"
        try {
            await this.reply(context, '🔍 Mencari tugas minggu ini...');

            const data = await googleSheetsService.fetchSheetData(this.spreadsheetId, 'Tugas');
            if (!data) {
                await this.reply(context, '❌ Gagal mengambil data tugas.');
                return;
            }

            const rows = googleSheetsService.convertToObjects(data);
            const now = new Date();
            const nextWeek = new Date();
            nextWeek.setDate(now.getDate() + 7);

            const upcoming = rows.filter(r => {
                // Parse date: assume YYYY-MM-DD or attempt parsing
                if (!r.Deadline) return false;
                const date = new Date(r.Deadline);
                if (isNaN(date.getTime())) return false; // Invalid date

                return date >= now && date <= nextWeek;
            });

            if (upcoming.length === 0) {
                await this.reply(context, '🎉 Tidak ada tugas jatuh tempo minggu ini!');
                return;
            }

            let response = `*📅 TUGAS MINGGU INI*\n\n`;
            upcoming.forEach(d => {
                response += `📌 *${d['Mata Kuliah'] || 'N/A'}*\n`;
                response += `📝 ${d.Tugas || '-'}\n`;
                response += `🕒 ${d.Deadline || '-'}\n`;
                response += `-------------------\n`;
            });

            await this.reply(context, response);

        } catch (error: any) {
            await this.reply(context, `❌ Error: ${error.message}`);
        }
    }

    private async handleRecap(context: any) {
        // "Rangkuman tugas Minggu Ini yang Belum Selesai"
        try {
            await this.reply(context, '🔍 Membuat recap tugas mingguan...');

            const data = await googleSheetsService.fetchSheetData(this.spreadsheetId, 'Tugas');
            if (!data) return;

            const rows = googleSheetsService.convertToObjects(data);
            const now = new Date();
            const nextWeek = new Date();
            nextWeek.setDate(now.getDate() + 7);

            const unfinished = rows.filter(r => {
                const status = (r.Status || '').toLowerCase();
                if (status === 'selesai') return false;

                if (!r.Deadline) return false;
                const date = new Date(r.Deadline);
                if (isNaN(date.getTime())) return false;

                return date >= now && date <= nextWeek;
            });

            if (unfinished.length === 0) {
                await this.reply(context, '✅ Recap: Semua aman untuk minggu ini!');
                return;
            }

            let response = `*📊 RECAP TUGAS MINGGU INI (BELUM SELESAI)*\n\n`;
            response += `Total: ${unfinished.length} tugas\n\n`;

            unfinished.forEach((d, i) => {
                response += `${i + 1}. ${d['Mata Kuliah']} - ${d.Tugas} (${d.Deadline})\n`;
            });

            await this.reply(context, response);

        } catch (error: any) {
            await this.reply(context, `❌ Error: ${error.message}`);
        }
    }

    private async handleDosen(context: any, day: string) {
        try {
            await this.reply(context, `🔍 Mencari kontak dosen hari ${day}...`);

            // Assuming "Dosen" sheet or re-using "Jadwal"
            const data = await googleSheetsService.fetchSheetData(this.spreadsheetId, 'Dosen');
            if (!data) {
                await this.reply(context, '❌ Sheet "Dosen" tidak ditemukan.');
                return;
            }

            const rows = googleSheetsService.convertToObjects(data);
            const lecturers = rows.filter(r => (r['Hari Mengajar'] || '').toLowerCase().includes(day.toLowerCase()));

            if (lecturers.length === 0) {
                await this.reply(context, `👨‍🏫 Tidak ada data dosen untuk hari ${day}.`);
                return;
            }

            let response = `*👨‍🏫 DOSEN HARI ${day.toUpperCase()}*\n\n`;
            lecturers.forEach(d => {
                response += `👤 *${d.Nama || 'N/A'}*\n`;
                response += `📱 ${d.Kontak || '-'}\n`;
                response += `-------------------\n`;
            });

            await this.reply(context, response);

        } catch (error: any) {
            await this.reply(context, `❌ Error: ${error.message}`);
        }
    }

    private async handleSeminar(context: any) {
        try {
            await this.reply(context, '🔍 Mencari info seminar...');

            const data = await googleSheetsService.fetchSheetData(this.spreadsheetId, 'Seminar');
            if (!data) {
                await this.reply(context, '❌ Sheet "Seminar" tidak ditemukan.');
                return;
            }

            const rows = googleSheetsService.convertToObjects(data);

            if (rows.length === 0) {
                await this.reply(context, '📢 Belum ada info seminar terbaru.');
                return;
            }

            let response = `*📢 INFO SEMINAR TERBARU*\n\n`;
            rows.forEach(s => {
                response += `🎓 *${s.Topik || s.Judul || 'N/A'}*\n`;
                response += `🗓️ ${s.Tanggal || '-'}\n`;
                response += `🎤 ${s.Pembicara || '-'}\n`;
                if (s.Link) response += `🔗 ${s.Link}\n`;
                response += `-------------------\n`;
            });

            await this.reply(context, response);

        } catch (error: any) {
            await this.reply(context, `❌ Error: ${error.message}`);
        }
    }

    private async handleGroupCreate(context: any, count: number) {
        // Only works in groups
        if (!context.group_id) {
            await this.reply(context, '❌ Fitur ini hanya bisa digunakan di dalam grup!');
            return;
        }

        if (count < 1) {
            await this.reply(context, '❌ Jumlah anggota minimal 1 orang.');
            return;
        }

        try {
            const sock = whatsappAdapter.getSocket(context.bot_id);
            if (!sock) {
                await this.reply(context, '❌ Bot tidak terhubung.');
                return;
            }

            // Get metadata
            const metadata = await sock.groupMetadata(context.group_id);
            // Fix: explicit type handling for participant extraction
            const participants: any[] = metadata.participants || [];
            const participantJids = participants.map((p: any) => p.id);

            // Randomize
            const shuffled = [...participantJids].sort(() => 0.5 - Math.random());

            // Chunk
            const chunks = [];
            for (let i = 0; i < shuffled.length; i += count) {
                chunks.push(shuffled.slice(i, i + count));
            }

            let response = `*👥 PEMBAGIAN KELOMPOK (${count} orang/kelompok)*\n\n`;

            chunks.forEach((chunk, index) => {
                response += `*Kelompok ${index + 1}*\n`;
                chunk.forEach((jid: string) => {
                    const phone = jid.split('@')[0];
                    response += `- @${phone}\n`; // Mention
                });
                response += '\n';
            });

            // Send with mentions
            await whatsappAdapter.sendMessage(context.bot_id, context.group_id, {
                type: 'text',
                content: response,
                // Cast to any to bypass interface limitation if 'mentions' is not in IWhatsAppMessage
                ...({ mentions: participantJids } as any)
            });

        } catch (error: any) {
            logger.error('Error creating group', { error });
            await this.reply(context, `❌ Gagal membagi kelompok: ${error.message}`);
        }
    }

    // --- Helpers ---

    private async reply(context: any, text: string) {
        await whatsappAdapter.sendMessage(
            context.bot_id,
            context.group_id || context.contact_id,
            { type: 'text', content: text }
        );
    }

    private getTodayName(): string {
        const days = ['Minggu', 'Senin', 'Selasa', 'Rabu', 'Kamis', 'Jumat', 'Sabtu'];
        const now = new Date();
        const jakartaOffset = 7 * 60; // UTC+7
        const jakartaTime = new Date(now.getTime() + (jakartaOffset + now.getTimezoneOffset()) * 60000);
        return days[jakartaTime.getDay()];
    }
}

export const broBotService = new BroBotService();
