export const API_KEY_SCOPES = [
  "read:me",
  "read:credits",
  "read:projects",
  "write:projects",
  "scaffold:download",
  "scaffold:upgrade",
] as const;

export type ApiKeyScope = (typeof API_KEY_SCOPES)[number];

export const API_KEY_SCOPE_DESCRIPTIONS: Record<ApiKeyScope, string> = {
  "read:me": "Read your basic account profile.",
  "read:credits": "Read your credit balance.",
  "read:projects": "List and read your saved project configurations.",
  "write:projects": "Create and update your saved project configurations.",
  "scaffold:download": "Download a project (spends credits).",
  "scaffold:upgrade": "Generate an upgrade kit for a project (spends credits).",
};

export function isValidScope(value: string): value is ApiKeyScope {
  return (API_KEY_SCOPES as readonly string[]).includes(value);
}
