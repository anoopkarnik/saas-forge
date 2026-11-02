"use client";

import React from "react";
import { toast } from "sonner";
import { Button } from "@workspace/ui/components/shadcn/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@workspace/ui/components/shadcn/dialog";

/** Shows a new signing secret once. */
export function SecretDialog({
  secret,
  onClose,
}: {
  secret: string | null;
  onClose: () => void;
}) {
  return (
    <Dialog open={!!secret} onOpenChange={(open) => !open && onClose()}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Signing secret</DialogTitle>
          <DialogDescription>
            Copy it now; it will not be shown again. Verify each request&apos;s
            SaaSForge-Signature header with it.
          </DialogDescription>
        </DialogHeader>
        <code className="break-all rounded-md bg-muted p-3 text-sm">
          {secret}
        </code>
        <DialogFooter>
          <Button
            variant="outline"
            onClick={() =>
              secret &&
              navigator.clipboard
                .writeText(secret)
                .then(() => toast.success("Copied"))
            }
          >
            Copy
          </Button>
          <Button onClick={onClose}>Done</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
