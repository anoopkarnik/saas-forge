"use client";
import React from "react";
import { useIsGuest } from "../../hooks/useIsGuest";
import { Eye } from "lucide-react";

export function GuestBanner() {
  const isGuest = useIsGuest();
  if (!isGuest) return null;
  return (
    <div className="flex items-center gap-2 bg-sky-500/10 text-sky-700 dark:text-sky-300 text-sm px-4 py-2 border-b border-sky-500/20">
      <Eye className="h-4 w-4" />
      You&apos;re in a read-only demo. Changes are disabled.
    </div>
  );
}
