import * as winston from 'winston';
import { Logtail } from "@logtail/node";
import { LogtailTransport } from "@logtail/winston";

// Setup Winston logger

const logtail = new Logtail(process.env.BETTERSTACK_TELEMETRY_SOURCE_TOKEN!, {
  endpoint: process.env.BETTERSTACK_TELEMETRY_INGESTING_HOST!,
});

export const logger = winston.createLogger({
    level: 'info',
    format: winston.format.combine(
        winston.format.timestamp({format: 'MMM-DD-YYYY HH:mm:ss'}),
        winston.format.colorize(),
        winston.format.align(),
        winston.format.printf((info)=>`${info.level}: ${[info.timestamp]}: ${info.message}`)
    ),
    transports: [
        new winston.transports.Console(),
        new LogtailTransport(logtail) as unknown as winston.transport,
    ]
});


