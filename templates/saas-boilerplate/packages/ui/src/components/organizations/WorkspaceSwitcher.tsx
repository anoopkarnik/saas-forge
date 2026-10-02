"use client";
import React, { useState } from "react";
import { Check, ChevronsUpDown, Mail, Plus, Users } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@workspace/ui/components/shadcn/dropdown-menu";
import { Button } from "@workspace/ui/components/shadcn/button";
import { cn } from "@workspace/ui/lib/utils";
import { CreateWorkspaceDialog } from "./CreateWorkspaceDialog";

export type OrgSummary = {
  id: string;
  name: string;
  slug: string;
  logo?: string | null;
  role: string;
};

export type PendingInvitation = {
  id: string;
  organizationName: string;
  inviterName: string;
  role: string;
  expiresAt: Date | string;
};

export interface WorkspaceSwitcherProps {
  organizations: OrgSummary[];
  activeId: string | null;
  invitations: PendingInvitation[];
  onSwitch: (organizationId: string) => void;
  onCreate: (name: string) => Promise<void> | void;
  onManage: () => void;
  onAcceptInvitation: (invitationId: string) => void;
  onDeclineInvitation: (invitationId: string) => void;
  isBusy?: boolean;
}

function initials(name: string) {
  return (
    name
      .split(/\s+/)
      .filter(Boolean)
      .slice(0, 2)
      .map((part) => part[0]?.toUpperCase())
      .join("") || "W"
  );
}

function WorkspaceMark({ name, className }: { name: string; className?: string }) {
  return (
    <span
      aria-hidden="true"
      className={cn(
        "flex size-7 shrink-0 items-center justify-center rounded-md bg-primary/10 text-[11px] font-semibold text-primary",
        className,
      )}
    >
      {initials(name)}
    </span>
  );
}

export function WorkspaceSwitcher({
  organizations,
  activeId,
  invitations,
  onSwitch,
  onCreate,
  onManage,
  onAcceptInvitation,
  onDeclineInvitation,
  isBusy,
}: WorkspaceSwitcherProps) {
  const [createOpen, setCreateOpen] = useState(false);
  const active = organizations.find((org) => org.id === activeId) ?? null;

  return (
    <>
      {/* modal={false} so opening the create dialog from a menu item does not
          leave Radix's pointer-events lock on <body>. */}
      <DropdownMenu modal={false}>
        <DropdownMenuTrigger asChild>
          <button
            type="button"
            aria-label="Switch workspace"
            disabled={isBusy}
            className="flex w-full items-center gap-2 rounded-lg border border-sidebar-border/60 bg-background/60 px-2 py-1.5 text-left transition-colors hover:bg-sidebar-accent disabled:opacity-60"
          >
            <WorkspaceMark name={active?.name ?? "Workspace"} />
            <span className="flex min-w-0 flex-1 flex-col">
              <span className="truncate text-sm font-medium">
                {active?.name ?? "Select workspace"}
              </span>
              {active && (
                <span className="truncate text-[11px] capitalize text-muted-foreground">
                  {active.role}
                </span>
              )}
            </span>
            {invitations.length > 0 && (
              <span className="rounded-full bg-primary px-1.5 text-[10px] font-semibold text-primary-foreground">
                {invitations.length}
              </span>
            )}
            <ChevronsUpDown className="size-4 shrink-0 text-muted-foreground" />
          </button>
        </DropdownMenuTrigger>
        <DropdownMenuContent className="w-64" align="start">
          <DropdownMenuLabel className="text-xs text-muted-foreground">Workspaces</DropdownMenuLabel>
          {organizations.map((org) => (
            <DropdownMenuItem
              key={org.id}
              onSelect={() => {
                if (org.id !== activeId) onSwitch(org.id);
              }}
              className="gap-2"
            >
              <WorkspaceMark name={org.name} className="size-6" />
              <span className="flex-1 truncate">{org.name}</span>
              {org.id === activeId && <Check className="size-4 text-primary" />}
            </DropdownMenuItem>
          ))}

          {invitations.length > 0 && (
            <>
              <DropdownMenuSeparator />
              <DropdownMenuLabel className="flex items-center gap-1.5 text-xs text-muted-foreground">
                <Mail className="size-3.5" /> Invitations
              </DropdownMenuLabel>
              {invitations.map((invitation) => (
                <div key={invitation.id} className="space-y-1.5 px-2 py-1.5 text-sm">
                  <div className="font-medium">{invitation.organizationName}</div>
                  <div className="text-xs text-muted-foreground">
                    {invitation.inviterName} invited you as {invitation.role}
                  </div>
                  <div className="flex gap-2">
                    <Button
                      size="sm"
                      className="h-7"
                      disabled={isBusy}
                      aria-label={`Accept invitation to ${invitation.organizationName}`}
                      onClick={() => onAcceptInvitation(invitation.id)}
                    >
                      Accept
                    </Button>
                    <Button
                      size="sm"
                      variant="ghost"
                      className="h-7"
                      disabled={isBusy}
                      aria-label={`Decline invitation to ${invitation.organizationName}`}
                      onClick={() => onDeclineInvitation(invitation.id)}
                    >
                      Decline
                    </Button>
                  </div>
                </div>
              ))}
            </>
          )}

          <DropdownMenuSeparator />
          <DropdownMenuItem onSelect={onManage} className="gap-2">
            <Users className="size-4" /> Manage team
          </DropdownMenuItem>
          <DropdownMenuItem onSelect={() => setCreateOpen(true)} className="gap-2">
            <Plus className="size-4" /> Create workspace
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
      <CreateWorkspaceDialog
        open={createOpen}
        onOpenChange={setCreateOpen}
        onCreate={onCreate}
        isBusy={isBusy}
      />
    </>
  );
}

export default WorkspaceSwitcher;
