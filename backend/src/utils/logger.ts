/**
 * Logger utility using Winston
 */

import winston from 'winston';
import path from 'path';

const logLevel = process.env.LOG_LEVEL || 'info';
const logFile = process.env.LOG_FILE || './logs/app.log';

// Create logs directory if it doesn't exist
import fs from 'fs';
const logDir = path.dirname(logFile);
if (!fs.existsSync(logDir)) {
    fs.mkdirSync(logDir, { recursive: true });
}

// Define log format
const logFormat = winston.format.combine(
    winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
    winston.format.errors({ stack: true }),
    winston.format.splat(),
    winston.format.json()
);

// Create logger
export const logger = winston.createLogger({
    level: logLevel,
    format: logFormat,
    defaultMeta: { service: 'wa-automation' },
    transports: [
        // Write all logs to file
        new winston.transports.File({
            filename: logFile,
            maxsize: 10485760, // 10MB
            maxFiles: 5,
        }),
        // Write errors to separate file
        new winston.transports.File({
            filename: path.join(logDir, 'error.log'),
            level: 'error',
            maxsize: 10485760,
            maxFiles: 5,
        }),
    ],
});

// Also log to console in development
if (process.env.NODE_ENV !== 'production') {
    logger.add(
        new winston.transports.Console({
            format: winston.format.combine(
                winston.format.colorize(),
                winston.format.simple()
            ),
        })
    );
}

export default logger;
