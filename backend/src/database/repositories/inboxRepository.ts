import { query } from '../connection';
import { v4 as uuidv4 } from 'uuid';

export interface InboxConversation {
    id: string;
    tenant_id: string;
    bot_id: string;
    contact_number: string;
    contact_name?: string | null;
    unread_count: number;
    status: 'open' | 'closed' | 'resolved';
    last_message_at?: string | null;
    created_at?: string;
    updated_at?: string;
    // joined fields
    last_message_content?: string;
    bot_name?: string;
}

export interface InboxMessage {
    id: string;
    conversation_id: string;
    message_id?: string | null;
    sender_type: 'contact' | 'bot' | 'agent';
    sender_id?: string | null;
    sender_name?: string | null;
    content: string;
    message_type: 'text' | 'image' | 'video' | 'audio' | 'document' | 'template';
    status: 'sent' | 'delivered' | 'read' | 'failed';
    media_meta?: {
        filename?: string;
        mimetype?: string;
        file_size?: number;
        message_type?: string;
    } | null;
    created_at?: string;
    updated_at?: string;
}

export class InboxRepository {
    async findConversations(tenantId: string, botId?: string, status?: string): Promise<InboxConversation[]> {
        let sql = `
            SELECT c.*, b.name as bot_name, 
                   (SELECT content FROM inbox_messages m WHERE m.conversation_id = c.id ORDER BY m.created_at DESC LIMIT 1) as last_message_content
            FROM inbox_conversations c
            LEFT JOIN bots b ON c.bot_id = b.id
            WHERE c.tenant_id = ?
        `;
        const params: any[] = [tenantId];

        if (botId) {
            sql += ` AND c.bot_id = ?`;
            params.push(botId);
        }

        if (status) {
            sql += ` AND c.status = ?`;
            params.push(status);
        }

        sql += ` ORDER BY c.last_message_at DESC NULLS LAST, c.updated_at DESC`;

        const result = await query(sql, params);
        return result.rows as InboxConversation[];
    }

    async findConversationById(id: string): Promise<InboxConversation | null> {
        const result = await query(`SELECT * FROM inbox_conversations WHERE id = ?`, [id]);
        return result.rows.length ? (result.rows[0] as InboxConversation) : null;
    }

    async findConversationByContact(botId: string, contactNumber: string): Promise<InboxConversation | null> {
        const result = await query(
            `SELECT * FROM inbox_conversations WHERE bot_id = ? AND contact_number = ?`,
            [botId, contactNumber]
        );
        return result.rows.length ? (result.rows[0] as InboxConversation) : null;
    }

    async createConversation(data: Partial<InboxConversation>): Promise<InboxConversation> {
        const id = uuidv4();
        await query(
            `INSERT INTO inbox_conversations (id, tenant_id, bot_id, contact_number, contact_name, status, last_message_at) 
             VALUES (?, ?, ?, ?, ?, ?, datetime('now'))`,
            [id, data.tenant_id, data.bot_id, data.contact_number, data.contact_name || null, data.status || 'open']
        );
        return this.findConversationById(id) as Promise<InboxConversation>;
    }

    async updateConversation(id: string, data: Partial<InboxConversation>): Promise<void> {
        const updates: string[] = [];
        const params: any[] = [];

        if (data.status !== undefined) {
            updates.push('status = ?');
            params.push(data.status);
        }
        if (data.unread_count !== undefined) {
            updates.push('unread_count = ?');
            params.push(data.unread_count);
        }
        if (data.contact_name !== undefined) {
            updates.push('contact_name = ?');
            params.push(data.contact_name);
        }
        if (data.last_message_at !== undefined) {
            updates.push('last_message_at = ?');
            params.push(data.last_message_at);
        }

        if (updates.length > 0) {
            updates.push("updated_at = datetime('now')");
            params.push(id);
            await query(`UPDATE inbox_conversations SET ${updates.join(', ')} WHERE id = ?`, params);
        }
    }

    async incrementUnreadCount(conversationId: string): Promise<void> {
        await query(
            `UPDATE inbox_conversations 
             SET unread_count = unread_count + 1, updated_at = datetime('now') 
             WHERE id = ?`,
            [conversationId]
        );
    }

    async resetUnreadCount(conversationId: string): Promise<void> {
        await query(
            `UPDATE inbox_conversations 
             SET unread_count = 0, updated_at = datetime('now') 
             WHERE id = ?`,
            [conversationId]
        );
    }

    // --- MESSAGES ---

    async findMessages(conversationId: string, limit: number = 50, offset: number = 0): Promise<InboxMessage[]> {
        const result = await query(
            `SELECT * FROM inbox_messages 
             WHERE conversation_id = ? 
             ORDER BY created_at ASC 
             LIMIT ? OFFSET ?`,
            [conversationId, limit, offset]
        );
        // Parse media_meta JSON string back to object
        return (result.rows as any[]).map(row => ({
            ...row,
            media_meta: row.media_meta ? JSON.parse(row.media_meta) : null,
        })) as InboxMessage[];
    }

    async findMessageByMessageId(messageId: string): Promise<InboxMessage | null> {
        const result = await query(`SELECT * FROM inbox_messages WHERE message_id = ?`, [messageId]);
        return result.rows.length ? (result.rows[0] as InboxMessage) : null;
    }

    async createMessage(data: Partial<InboxMessage> & { media_meta?: any }): Promise<InboxMessage> {
        const id = uuidv4();
        const mediaMeta = data.media_meta ? JSON.stringify(data.media_meta) : null;
        await query(
            `INSERT INTO inbox_messages 
             (id, conversation_id, message_id, sender_type, sender_id, sender_name, content, message_type, status, media_meta) 
             VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
            [
                id,
                data.conversation_id,
                data.message_id || null,
                data.sender_type || 'contact',
                data.sender_id || null,
                data.sender_name || null,
                data.content || '',
                data.message_type || 'text',
                data.status || 'sent',
                mediaMeta,
            ]
        );

        // Update the conversation's last_message_at
        await this.updateConversation(data.conversation_id as string, { last_message_at: new Date().toISOString() });

        const result = await query(`SELECT * FROM inbox_messages WHERE id = ?`, [id]);
        const row = result.rows[0] as any;
        return {
            ...row,
            media_meta: row.media_meta ? JSON.parse(row.media_meta) : null,
        } as InboxMessage;
    }

    async updateMessageStatus(messageId: string, status: string): Promise<void> {
        await query(
            `UPDATE inbox_messages SET status = ?, updated_at = datetime('now') WHERE message_id = ? OR id = ?`,
            [status, messageId, messageId]
        );
    }
}

export const inboxRepository = new InboxRepository();
