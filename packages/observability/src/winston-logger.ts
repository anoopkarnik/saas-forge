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

// Defence in depth: metadata that looks like a credential never reaches a
// transport. Token counts ("promptTokens") are kept; tokens ("accessToken") are not.
const SECRET_KEY =
  /(secret|password|passwd|api_?key|database_?url|credential|private_?key|webhook_?key|jwt|authorization|cookie)|token$/i;
const REDACTED = "[redacted]";

/** Redacts secret-looking keys, and any `envVars` payload wholesale. */
export function redactSecrets(value: unknown, depth = 0): unknown {
  if (depth > 6 || value === null || typeof value !== "object") return value;
  if (Array.isArray(value)) return value.map((item) => redactSecrets(item, depth + 1));
  return Object.fromEntries(
    Object.entries(value).map(([key, inner]) =>
      key === "envVars" || SECRET_KEY.test(key)
        ? [key, REDACTED]
        : [key, redactSecrets(inner, depth + 1)],
    ),
  );
}

export const redactFormat = winston.format((info) => {
  for (const key of Object.keys(info)) {
    if (key === "level" || key === "message" || key === "timestamp") continue;
    info[key] = key === "envVars" || SECRET_KEY.test(key) ? REDACTED : redactSecrets(info[key]);
  }
  return info;
});

export const logger = winston.createLogger({
  level: "info",
  format: winston.format.combine(
    redactFormat(),
    winston.format.timestamp({ format: "MMM-DD-YYYY HH:mm:ss" }),
    winston.format.colorize(),
    winston.format.align(),
    winston.format.printf(
      (info) => `${info.level}: [${info.timestamp}] ${info.message}`
    )
  ),
  transports,
});
