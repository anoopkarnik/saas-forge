"use client";

import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@workspace/ui/components/shadcn/dialog";
import { Input } from "@workspace/ui/components/shadcn/input";
import { Label } from "@workspace/ui/components/shadcn/label";
import { Checkbox } from "@workspace/ui/components/shadcn/checkbox";
import { Button } from "@workspace/ui/components/shadcn/button";
import { API_KEY_SCOPES } from "@workspace/auth/api-keys";
import { useTRPC } from "@/trpc/client";

type Props = {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  onCreated: (plaintext: string) => void;
};

export function CreateKeyDialog({ open, onOpenChange, onCreated }: Props) {
  const trpc = useTRPC();
  const qc = useQueryClient();
  const [label, setLabel] = useState("");
  const [scopes, setScopes] = useState<string[]>(["read:me"]);
  const [error, setError] = useState<string | null>(null);

  const create = useMutation(
    trpc.apiKey.create.mutationOptions({
      onSuccess: async (res) => {
        await qc.invalidateQueries({ queryKey: trpc.apiKey.list.queryKey() });
        setLabel("");
        setScopes(["read:me"]);
        onOpenChange(false);
        onCreated(res.plaintext);
      },
      onError: (err) => setError(err.message),
    }),
  );

  function toggleScope(scope: string, checked: boolean) {
    setScopes((current) =>
      checked ? [...new Set([...current, scope])] : current.filter((s) => s !== scope),
    );
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Create API key</DialogTitle>
          <DialogDescription>
            Pick a label and the scopes this key needs. You'll see the key once.
          </DialogDescription>
        </DialogHeader>

        <div className="flex flex-col gap-4">
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="apikey-label">Label</Label>
            <Input
              id="apikey-label"
              value={label}
              onChange={(e) => setLabel(e.target.value)}
              placeholder="CI runner"
              maxLength={100}
            />
          </div>

          <div className="flex flex-col gap-1.5">
            <Label>Scopes</Label>
            <div className="flex flex-col gap-2">
              {API_KEY_SCOPES.map((scope) => (
                <label key={scope} className="flex items-center gap-2 text-sm">
                  <Checkbox
                    checked={scopes.includes(scope)}
                    onCheckedChange={(v) => toggleScope(scope, v === true)}
                  />
                  <code>{scope}</code>
                </label>
              ))}
            </div>
          </div>

          {error && <p className="text-sm text-destructive">{error}</p>}
        </div>

        <DialogFooter>
          <Button variant="ghost" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button
            disabled={!label.trim() || scopes.length === 0 || create.isPending}
            onClick={() => {
              setError(null);
              create.mutate({ label: label.trim(), scopes });
            }}
          >
            {create.isPending ? "Creating…" : "Create key"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
