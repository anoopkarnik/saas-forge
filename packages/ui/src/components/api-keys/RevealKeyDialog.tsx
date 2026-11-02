"use client";

import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@workspace/ui/components/shadcn/dialog";
import { Button } from "@workspace/ui/components/shadcn/button";

type Props = {
  plaintext: string | null;
  onClose: () => void;
};

export function RevealKeyDialog({ plaintext, onClose }: Props) {
  const [copied, setCopied] = useState(false);

  async function copy() {
    if (!plaintext) return;
    await navigator.clipboard.writeText(plaintext);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  return (
    <Dialog open={!!plaintext} onOpenChange={(v) => !v && onClose()}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Your new API key</DialogTitle>
          <DialogDescription>
            Copy this key now. You will not be able to see it again.
          </DialogDescription>
        </DialogHeader>

        <div
          role="alert"
          className="rounded-md border border-destructive bg-destructive/10 p-3 text-sm text-destructive"
        >
          This is the only time you will see this key. Copy it now.
        </div>

        <pre className="overflow-x-auto rounded-md bg-muted p-3 text-xs">
          {plaintext}
        </pre>

        <DialogFooter>
          <Button variant="ghost" onClick={onClose}>
            Close
          </Button>
          <Button onClick={copy}>{copied ? "Copied!" : "Copy"}</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
