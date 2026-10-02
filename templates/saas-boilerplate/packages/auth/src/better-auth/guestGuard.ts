export const GUEST_BLOCKED_PATHS = [
  "/change-email",
  "/change-password",
  "/update-user",
  "/delete-user",
  "/link-social",
  "/unlink-account",
  "/organization/create",
  "/organization/update",
  "/organization/delete",
  "/organization/invite-member",
  "/organization/cancel-invitation",
  "/organization/accept-invitation",
  "/organization/reject-invitation",
  "/organization/remove-member",
  "/organization/update-member-role",
  "/organization/leave",
] as const;

export function isGuestAccountMutation(path: string): boolean {
  return (GUEST_BLOCKED_PATHS as readonly string[]).includes(path);
}
