export const API_KEY_SCOPES = ["read:me"] as const;

export type ApiKeyScope = (typeof API_KEY_SCOPES)[number];

export function isValidScope(value: string): value is ApiKeyScope {
  return (API_KEY_SCOPES as readonly string[]).includes(value);
}
