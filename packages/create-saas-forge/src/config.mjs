import fs from "node:fs";
import os from "node:os";
import path from "node:path";

export const DEFAULT_URL = "https://saasforge.cc";

export function credentialsPath(env = process.env) {
  const base = env.XDG_CONFIG_HOME || path.join(os.homedir(), ".config");
  return path.join(base, "saas-forge", "credentials.json");
}

/** API key and server URL: flags, then env vars, then the saved credentials file. */
export function resolveConfig(flags, env = process.env) {
  let saved = {};
  try {
    saved = JSON.parse(fs.readFileSync(credentialsPath(env), "utf-8"));
  } catch {
    // No saved credentials yet.
  }
  return {
    apiKey: flags["api-key"] || env.SAAS_FORGE_API_KEY || saved.apiKey || null,
    baseUrl: flags.url || env.SAAS_FORGE_URL || saved.baseUrl || DEFAULT_URL,
  };
}

/** Saved with 0600 so other users on the machine cannot read the key. */
export function saveCredentials(credentials, env = process.env) {
  const file = credentialsPath(env);
  fs.mkdirSync(path.dirname(file), { recursive: true, mode: 0o700 });
  fs.writeFileSync(file, JSON.stringify(credentials, null, 2) + "\n", { mode: 0o600 });
  fs.chmodSync(file, 0o600);
  return file;
}
