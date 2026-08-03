"use client";

import React, { useState } from "react";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter,
} from "@workspace/ui/components/shadcn/dialog";
import { Button } from "@workspace/ui/components/shadcn/button";
import { Input } from "@workspace/ui/components/shadcn/input";
import { Label } from "@workspace/ui/components/shadcn/label";
import { useIsGuest } from "../../hooks/useIsGuest";

interface Props {
  onInvite: (email: string) => void;
  isInviting: boolean;
}

export function InviteUserDialog({ onInvite, isInviting }: Props) {
  const isGuest = useIsGuest();
  const [open, setOpen] = useState(false);
  const [email, setEmail] = useState("");

  const submit = () => {
    if (!email.trim()) return;
    onInvite(email.trim());
    setEmail("");
    setOpen(false);
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button disabled={isGuest}>Invite user</Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Invite a user by email</DialogTitle>
        </DialogHeader>
        <div className="space-y-2">
          <Label htmlFor="invite-email">Email</Label>
          <Input
            id="invite-email"
            type="email"
            placeholder="person@example.com"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && submit()}
          />
        </div>
        <DialogFooter>
          <Button onClick={submit} disabled={isInviting || !email.trim()}>
            {isInviting ? "Sending..." : "Send invite"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
