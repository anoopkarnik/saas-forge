import { lookup as dnsLookup, type LookupAddress } from "node:dns";
import { BlockList, isIP } from "node:net";

/**
 * SSRF guard for outgoing webhooks: a customer-supplied URL must not reach
 * this server's network. Checked when an endpoint is saved and again when
 * the connection is made (DNS can change in between).
 */
export class UnsafeWebhookUrlError extends Error {}

const blocked = new BlockList();
for (const [network, prefix] of [
  ["0.0.0.0", 8],
  ["10.0.0.0", 8],
  ["100.64.0.0", 10],
  ["127.0.0.0", 8],
  ["169.254.0.0", 16],
  ["172.16.0.0", 12],
  ["192.0.0.0", 24],
  ["192.168.0.0", 16],
  ["198.18.0.0", 15],
  ["224.0.0.0", 4],
  ["240.0.0.0", 4],
] as const) {
  blocked.addSubnet(network, prefix, "ipv4");
}
for (const [network, prefix] of [
  ["::", 128],
  ["::1", 128],
  ["fc00::", 7],
  ["fe80::", 10],
  ["ff00::", 8],
] as const) {
  blocked.addSubnet(network, prefix, "ipv6");
}

/** Loopback, private, link-local, carrier-grade NAT, multicast and reserved ranges. */
export function isPrivateAddress(address: string): boolean {
  const mapped = /^::ffff:(\d+\.\d+\.\d+\.\d+)$/i.exec(address);
  if (mapped) return blocked.check(mapped[1]!, "ipv4");
  const family = isIP(address);
  if (family === 4) return blocked.check(address, "ipv4");
  if (family === 6) return blocked.check(address, "ipv6");
  return true;
}

const isProduction = (env: Record<string, string | undefined> = process.env) => env.NODE_ENV === "production";

/** Syntax only: https (http outside production), no credentials. */
export function parseWebhookUrl(raw: string, production = isProduction()): URL {
  let url: URL;
  try {
    url = new URL(raw);
  } catch {
    throw new UnsafeWebhookUrlError("Enter a valid URL.");
  }
  const allowed = production ? ["https:"] : ["https:", "http:"];
  if (!allowed.includes(url.protocol)) {
    throw new UnsafeWebhookUrlError(production ? "Webhook URLs must use https." : "Webhook URLs must use http or https.");
  }
  if (url.username || url.password) throw new UnsafeWebhookUrlError("Webhook URLs cannot contain credentials.");
  return url;
}

type Resolve = (hostname: string) => Promise<string[]>;

const resolveAll: Resolve = (hostname) =>
  new Promise((resolve, reject) =>
    dnsLookup(hostname, { all: true }, (error, addresses) =>
      error ? reject(error) : resolve(addresses.map((entry) => entry.address)),
    ),
  );

/** Rejects a URL whose host is, or resolves to, a private address. */
export async function assertSafeWebhookUrl(raw: string, { resolve = resolveAll, production }: { resolve?: Resolve; production?: boolean } = {}): Promise<URL> {
  const url = parseWebhookUrl(raw, production);
  const host = url.hostname.replace(/^\[|\]$/g, "");
  let addresses: string[];
  if (isIP(host)) {
    addresses = [host];
  } else {
    try {
      addresses = await resolve(host);
    } catch {
      throw new UnsafeWebhookUrlError(`Could not resolve ${host}.`);
    }
  }
  if (addresses.length === 0 || addresses.some(isPrivateAddress)) {
    throw new UnsafeWebhookUrlError("Webhook URLs cannot point at private, loopback or link-local addresses.");
  }
  return url;
}

type LookupCallback = (error: NodeJS.ErrnoException | null, address: string | LookupAddress[], family?: number) => void;

/** `lookup` for http.request: the resolved address is checked at connect time (DNS rebinding). */
export function guardedLookup(hostname: string, options: { all?: boolean }, callback: LookupCallback): void {
  dnsLookup(hostname, { all: true }, (error, addresses) => {
    if (error) return callback(error, []);
    if (addresses.length === 0 || addresses.some((entry) => isPrivateAddress(entry.address))) {
      return callback(new UnsafeWebhookUrlError(`${hostname} resolves to a private address.`), []);
    }
    if (options.all) return callback(null, addresses);
    callback(null, addresses[0]!.address, addresses[0]!.family);
  });
}
