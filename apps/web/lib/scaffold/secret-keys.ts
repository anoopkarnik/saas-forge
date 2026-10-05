/**
 * Secret/credential classification for saved project configs.
 *
 * Saved configs must never persist secret env values — we store only non-secret
 * selections and generate acquisition steps (SETUP.md) instead. This module is
 * platform-only and is excluded from the downloaded boilerplate.
 */

import { isSecretEnvKey } from "@workspace/ui/lib/scaffold-secrets";

// The classifier lives in packages/ui so clients and the server share it.
export { SECRET_ENV_KEYS, isSecretEnvKey } from "@workspace/ui/lib/scaffold-secrets";

/**
 * Removes every secret-looking key from a config record, returning the safe
 * subset plus the list of keys that were dropped (for user-facing messaging).
 */
export function stripSecrets<T extends Record<string, unknown>>(
  config: T,
): { config: Partial<T>; strippedKeys: string[] } {
  const clean: Record<string, unknown> = {};
  const strippedKeys: string[] = [];

  for (const [key, value] of Object.entries(config)) {
    if (isSecretEnvKey(key)) {
      strippedKeys.push(key);
      continue;
    }
    clean[key] = value;
  }

  return { config: clean as Partial<T>, strippedKeys };
}
