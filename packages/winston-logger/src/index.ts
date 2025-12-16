import * as winston from 'winston';
import { Logtail } from "@logtail/node";
import { LogtailTransport } from "@logtail/winston";

// Setup Winston logger

const logtail = new Logtail("HN4zUUni7XZjSa4P85XgfFbn", {
  endpoint: 'https://s1587833.eu-nbg-2.betterstackdata.com',
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
        // new winston.transports.File({ filename: 'logs/combined.log' }),
        // new winston.transports.File({ filename: 'logs/error.log' ,level: 'error'}),
        new winston.transports.Console(),
        new LogtailTransport(logtail) as unknown as winston.transport,
    ]
});


