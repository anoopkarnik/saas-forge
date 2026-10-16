export const API_KEY_SCOPES = [
  "read:me",
  "read:credits",
  "read:projects",
  "write:projects",
  "scaffold:download",
  "scaffold:upgrade",
  // scaffold:begin mcp
  // scaffold:begin billing
  "read:usage",
  // scaffold:end billing
  // scaffold:begin multi_tenancy
  "read:workspaces",
  // scaffold:end multi_tenancy
  // scaffold:begin notifications
  "read:notifications",
  // scaffold:end notifications
  // scaffold:end mcp
] as const;

export type ApiKeyScope = (typeof API_KEY_SCOPES)[number];

export const API_KEY_SCOPE_DESCRIPTIONS: Record<ApiKeyScope, string> = {
  "read:me": "Read your basic account profile.",
  "read:credits": "Read your credit balance.",
  "read:projects": "List and read your saved project configurations.",
  "write:projects": "Create and update your saved project configurations.",
  "scaffold:download": "Download a project (spends credits).",
  "scaffold:upgrade": "Generate an upgrade kit for a project (spends credits).",
  // scaffold:begin mcp
  // scaffold:begin billing
  "read:usage": "Read your credit usage history.",
  // scaffold:end billing
  // scaffold:begin multi_tenancy
  "read:workspaces": "List the workspaces you belong to and your role in each.",
  // scaffold:end multi_tenancy
  // scaffold:begin notifications
  "read:notifications": "Read your notification inbox.",
  // scaffold:end notifications
  // scaffold:end mcp
};

export function isValidScope(value: string): value is ApiKeyScope {
  return (API_KEY_SCOPES as readonly string[]).includes(value);
}
