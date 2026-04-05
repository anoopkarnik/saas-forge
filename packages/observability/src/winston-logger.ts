import * as winston from "winston";
import { Logtail } from "@logtail/node";
import { LogtailTransport } from "@logtail/winston";

const transports: winston.transport[] = [
  new winston.transports.Console(),
];

const sourceToken = process.env.BETTERSTACK_TELEMETRY_SOURCE_TOKEN;
const ingestHost = process.env.BETTERSTACK_TELEMETRY_INGESTING_HOST;

// Only initialize Logtail if both env vars exist
if (sourceToken && ingestHost) {
  const logtail = new Logtail(sourceToken, {
    endpoint: ingestHost,
  });

  transports.push(new LogtailTransport(logtail) as unknown as winston.transport);
} else {
  // Optional: only warn in development
  if (process.env.NODE_ENV !== "production") {
    console.warn("BetterStack logging disabled (missing env variables)");
  }
}

export const logger = winston.createLogger({
  level: "info",
  format: winston.format.combine(
    winston.format.timestamp({ format: "MMM-DD-YYYY HH:mm:ss" }),
    winston.format.colorize(),
    winston.format.align(),
    winston.format.printf(
      (info) => `${info.level}: [${info.timestamp}] ${info.message}`
    )
  ),
  transports,
});
