export const GUEST_BLOCKED_PATHS = [
  "/change-email",
  "/change-password",
  "/update-user",
  "/delete-user",
  "/link-social",
  "/unlink-account",
] as const;

export function isGuestAccountMutation(path: string): boolean {
  return (GUEST_BLOCKED_PATHS as readonly string[]).includes(path);
}
