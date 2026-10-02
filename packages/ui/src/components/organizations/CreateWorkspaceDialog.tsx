"use client";
import React, { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@workspace/ui/components/shadcn/dialog";
import { Button } from "@workspace/ui/components/shadcn/button";
import { Input } from "@workspace/ui/components/shadcn/input";
import { Label } from "@workspace/ui/components/shadcn/label";

export interface CreateWorkspaceDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onCreate: (name: string) => Promise<void> | void;
  isBusy?: boolean;
}

export function CreateWorkspaceDialog({
  open,
  onOpenChange,
  onCreate,
  isBusy,
}: CreateWorkspaceDialogProps) {
  const [name, setName] = useState("");

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    const trimmed = name.trim();
    if (!trimmed) return;
    try {
      await onCreate(trimmed);
      setName("");
      onOpenChange(false);
    } catch {
      // The caller reports the error; keep the dialog open so the user can retry.
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <form onSubmit={handleSubmit} className="space-y-4">
          <DialogHeader>
            <DialogTitle>Create workspace</DialogTitle>
            <DialogDescription>
              Workspaces keep a team&apos;s members and data separate. You can invite people after creating it.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-2">
            <Label htmlFor="workspace-name">Workspace name</Label>
            <Input
              id="workspace-name"
              value={name}
              maxLength={64}
              placeholder="Acme Inc."
              autoFocus
              onChange={(event) => setName(event.target.value)}
            />
          </div>
          <DialogFooter>
            <Button type="button" variant="ghost" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={isBusy || !name.trim()}>
              Create
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

export default CreateWorkspaceDialog;
