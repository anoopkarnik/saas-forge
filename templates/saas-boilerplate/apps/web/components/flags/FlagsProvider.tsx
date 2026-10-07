"use client";

import { createContext, useContext, type ReactNode } from "react";
import { flagDefaults, type FlagKey, type FlagValues } from "@/lib/flags/definitions";

const FlagsContext = createContext<FlagValues | null>(null);

/** The root layout passes flags evaluated on the server, so there is no flicker and no rule reaches the browser. */
export function FlagsProvider({ flags, children }: { flags: FlagValues; children: ReactNode }) {
  return <FlagsContext.Provider value={flags}>{children}</FlagsContext.Provider>;
}

/** Whether a flag is on for the signed-in user (its code default outside the provider). */
export function useFlag(key: FlagKey): boolean {
  return (useContext(FlagsContext) ?? flagDefaults())[key];
}
