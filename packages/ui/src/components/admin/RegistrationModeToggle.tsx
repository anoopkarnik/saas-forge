"use client";

import React from "react";
import { Button } from "@workspace/ui/components/shadcn/button";

interface Props {
  mode: "OPEN" | "INVITE_ONLY";
  onChange: (mode: "OPEN" | "INVITE_ONLY") => void;
  disabled?: boolean;
}

export function RegistrationModeToggle({ mode, onChange, disabled }: Props) {
  return (
    <div className="flex items-center gap-3">
      <span className="text-sm text-muted-foreground">Registration:</span>
      <div className="inline-flex rounded-md border p-1">
        <Button
          type="button"
          size="sm"
          variant={mode === "OPEN" ? "default" : "ghost"}
          disabled={disabled}
          onClick={() => onChange("OPEN")}
        >
          Open
        </Button>
        <Button
          type="button"
          size="sm"
          variant={mode === "INVITE_ONLY" ? "default" : "ghost"}
          disabled={disabled}
          onClick={() => onChange("INVITE_ONLY")}
        >
          Invite only
        </Button>
      </div>
    </div>
  );
}
