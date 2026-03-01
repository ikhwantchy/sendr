import { Server as HttpServer } from 'http';
import { Server, Socket } from 'socket.io';
import { logger } from '../utils/logger';

export class SocketService {
    private io: Server | null = null;

    initialize(server: HttpServer) {
        this.io = new Server(server, {
            cors: {
                origin: '*',
                methods: ['GET', 'POST']
            }
        });

        this.io.on('connection', (socket: Socket) => {
            logger.info(`[Socket] Client connected: ${socket.id}`);

            // A client can join rooms based on their tenant/bot access
            socket.on('join_tenant', (tenantId: string) => {
                socket.join(`tenant:${tenantId}`);
                logger.debug(`[Socket] ${socket.id} joined tenant:${tenantId}`);
            });

            socket.on('join_conversation', (conversationId: string) => {
                socket.join(`conversation:${conversationId}`);
                logger.debug(`[Socket] ${socket.id} joined conversation:${conversationId}`);
            });

            socket.on('leave_conversation', (conversationId: string) => {
                socket.leave(`conversation:${conversationId}`);
                logger.debug(`[Socket] ${socket.id} left conversation:${conversationId}`);
            });

            socket.on('disconnect', () => {
                logger.info(`[Socket] Client disconnected: ${socket.id}`);
            });
        });

        logger.info('✅ Socket.IO service initialized');
    }

    getIo(): Server {
        if (!this.io) {
            throw new Error('Socket.IO is not initialized!');
        }
        return this.io;
    }

    emitToTenant(tenantId: string, event: string, payload: any) {
        if (this.io) {
            this.io.to(`tenant:${tenantId}`).emit(event, payload);
        }
    }

    emitToConversation(conversationId: string, event: string, payload: any) {
        if (this.io) {
            this.io.to(`conversation:${conversationId}`).emit(event, payload);
        }
    }
}

export const socketService = new SocketService();
