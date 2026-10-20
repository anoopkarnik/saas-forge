export type RegistrationMode = "OPEN" | "INVITE_ONLY";

export interface RegistrationInvite {
  status: string;
  expiresAt: Date;
}

export function isEmailAllowedToRegister(
  mode: RegistrationMode,
  invite: RegistrationInvite | null,
  now: Date,
): boolean {
  if (mode === "OPEN") return true;
  if (!invite) return false;
  if (invite.status !== "PENDING") return false;
  return invite.expiresAt.getTime() > now.getTime();
}
