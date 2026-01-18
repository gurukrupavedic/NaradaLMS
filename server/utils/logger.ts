import { LOG_TRUNCATE_LENGTH } from "@shared/constants";

// Simple logic to colorize output in development
const colors = {
    reset: "\x1b[0m",
    red: "\x1b[31m",
    yellow: "\x1b[33m",
    blue: "\x1b[34m",
    gray: "\x1b[90m",
};

export class Logger {
    private static isDev = process.env.NODE_ENV !== "production";

    private static formatMessage(level: string, message: string, meta?: any): string {
        const timestamp = new Date().toISOString();

        if (this.isDev) {
            let color = colors.reset;
            if (level === "ERROR") color = colors.red;
            if (level === "WARN") color = colors.yellow;
            if (level === "INFO") color = colors.blue;

            let logLine = `${colors.gray}[${timestamp}]${colors.reset} ${color}[${level}]${colors.reset} ${message}`;

            if (meta) {
                if (meta instanceof Error) {
                    logLine += `\n${colors.red}${meta.stack || meta.message}${colors.reset}`;
                } else {
                    logLine += ` ${JSON.stringify(meta)}`;
                }
            }
            return logLine;
        }

        // Production: JSON structure
        return JSON.stringify({
            timestamp,
            level,
            message,
            ...meta,
        });
    }

    static info(message: string, meta?: any) {
        console.log(this.formatMessage("INFO", message, meta));
    }

    static warn(message: string, meta?: any) {
        console.warn(this.formatMessage("WARN", message, meta));
    }

    static error(message: string, meta?: any) {
        console.error(this.formatMessage("ERROR", message, meta));
    }

    static debug(message: string, meta?: any) {
        if (this.isDev) {
            console.debug(this.formatMessage("DEBUG", message, meta));
        }
    }

    static http(method: string, path: string, status: number, duration: number, body?: any) {
        let logLine = `${method} ${path} ${status} in ${duration}ms`;
        if (this.isDev) {
            // Keep the existing truncation logic for dev readability if mostly text
            if (logLine.length > LOG_TRUNCATE_LENGTH) {
                logLine = logLine.slice(0, LOG_TRUNCATE_LENGTH - 1) + "…";
            }
            console.log(`${colors.gray}[${new Date().toISOString()}]${colors.reset} ${colors.blue}[HTTP]${colors.reset} ${logLine}`);
        } else {
            // Structured log for prod
            console.log(JSON.stringify({
                timestamp: new Date().toISOString(),
                level: "HTTP",
                method,
                path,
                status,
                duration
            }));
        }
    }
}
