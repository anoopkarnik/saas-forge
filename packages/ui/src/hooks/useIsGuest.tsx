"use client";
import { useSession } from "@workspace/auth/better-auth/auth-client";

export function useIsGuest(): boolean {
  const session = useSession();
  return session?.data?.user?.role === "guest";
}
