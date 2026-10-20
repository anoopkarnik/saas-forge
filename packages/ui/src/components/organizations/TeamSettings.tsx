"use client";
import React, { useEffect, useState } from "react";
import { LogOut, Mail, Trash2, UserMinus } from "lucide-react";
import {
  hasOrgRole,
  ORG_ROLES,
  type OrgRole,
} from "@workspace/auth/better-auth/organization-helpers";
import { Badge } from "@workspace/ui/components/shadcn/badge";
import { Button } from "@workspace/ui/components/shadcn/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@workspace/ui/components/shadcn/card";
import { Input } from "@workspace/ui/components/shadcn/input";
import { Label } from "@workspace/ui/components/shadcn/label";
import {
  NativeSelect,
  NativeSelectOption,
} from "@workspace/ui/components/shadcn/native-select";

export type TeamMember = {
  id: string;
  userId: string;
  name: string;
  email: string;
  image?: string | null;
  role: string;
  createdAt: Date | string;
};

export type TeamInvitation = {
  id: string;
  email: string;
  role: string;
  expiresAt: Date | string;
};

export interface TeamSettingsProps {
  organization: { id: string; name: string };
  currentRole: string;
  currentUserId: string;
  members: TeamMember[];
  invitations: TeamInvitation[];
  onRename: (name: string) => void;
  onInvite: (input: { email: string; role: OrgRole }) => void;
  onCancelInvitation: (invitationId: string) => void;
  onChangeRole: (memberId: string, role: OrgRole) => void;
  onRemove: (memberId: string) => void;
  onLeave: () => void;
  onDelete: () => void;
  isBusy?: boolean;
}

/** Roles the current user may grant: their own rank and below. */
function assignableRoles(currentRole: string): OrgRole[] {
  return ORG_ROLES.filter((role) => hasOrgRole(currentRole, role));
}

function formatDate(value: Date | string) {
  return new Date(value).toLocaleDateString();
}

export function TeamSettings({
  organization,
  currentRole,
  currentUserId,
  members,
  invitations,
  onRename,
  onInvite,
  onCancelInvitation,
  onChangeRole,
  onRemove,
  onLeave,
  onDelete,
  isBusy,
}: TeamSettingsProps) {
  const canManage = hasOrgRole(currentRole, "admin");
  const isOwner = currentRole === "owner";
  const roles = assignableRoles(currentRole);

  const [name, setName] = useState(organization.name);
  const [inviteEmail, setInviteEmail] = useState("");
  const [inviteRole, setInviteRole] = useState<OrgRole>("member");

  useEffect(() => setName(organization.name), [organization.name]);

  const canManageMember = (member: TeamMember) =>
    canManage &&
    member.userId !== currentUserId &&
    (member.role !== "owner" || isOwner);

  const submitRename = (event: React.FormEvent) => {
    event.preventDefault();
    const trimmed = name.trim();
    if (trimmed && trimmed !== organization.name) onRename(trimmed);
  };

  const submitInvite = (event: React.FormEvent) => {
    event.preventDefault();
    const email = inviteEmail.trim();
    if (!email) return;
    onInvite({ email, role: inviteRole });
    setInviteEmail("");
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Workspace</CardTitle>
          <CardDescription>
            You are {currentRole === "admin" || currentRole === "owner" ? "an" : "a"} {currentRole} of this workspace.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {canManage ? (
            <form onSubmit={submitRename} className="flex flex-col gap-2 sm:flex-row sm:items-end">
              <div className="flex-1 space-y-2">
                <Label htmlFor="workspace-rename">Workspace name</Label>
                <Input
                  id="workspace-rename"
                  value={name}
                  maxLength={64}
                  onChange={(event) => setName(event.target.value)}
                />
              </div>
              <Button type="submit" disabled={isBusy || !name.trim() || name.trim() === organization.name}>
                Save
              </Button>
            </form>
          ) : (
            <p className="text-sm font-medium">{organization.name}</p>
          )}
        </CardContent>
      </Card>

      {canManage && (
        <Card>
          <CardHeader>
            <CardTitle>Invite people</CardTitle>
            <CardDescription>
              They&apos;ll get an email and can accept after signing in with that address. Invitations expire in 7 days.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={submitInvite} className="flex flex-col gap-2 sm:flex-row sm:items-end">
              <div className="flex-1 space-y-2">
                <Label htmlFor="invite-email">Invite email</Label>
                <Input
                  id="invite-email"
                  type="email"
                  required
                  placeholder="teammate@company.com"
                  value={inviteEmail}
                  onChange={(event) => setInviteEmail(event.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="invite-role">Invite role</Label>
                <NativeSelect
                  id="invite-role"
                  value={inviteRole}
                  onChange={(event) => setInviteRole(event.target.value as OrgRole)}
                >
                  {roles.map((role) => (
                    <NativeSelectOption key={role} value={role}>
                      {role}
                    </NativeSelectOption>
                  ))}
                </NativeSelect>
              </div>
              <Button type="submit" disabled={isBusy}>
                <Mail className="size-4" /> Send invite
              </Button>
            </form>
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader>
          <CardTitle>Members</CardTitle>
          <CardDescription>{members.length} {members.length === 1 ? "person" : "people"} in this workspace.</CardDescription>
        </CardHeader>
        <CardContent>
          <ul className="divide-y">
            {members.map((member) => {
              const manageable = canManageMember(member);
              return (
                <li key={member.id} className="flex flex-wrap items-center gap-3 py-3">
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2 truncate text-sm font-medium">
                      {member.name}
                      {member.userId === currentUserId && <Badge variant="secondary">You</Badge>}
                    </div>
                    <div className="truncate text-xs text-muted-foreground">{member.email}</div>
                  </div>
                  {manageable ? (
                    <NativeSelect
                      aria-label={`Role for ${member.name}`}
                      value={member.role}
                      disabled={isBusy}
                      onChange={(event) => onChangeRole(member.id, event.target.value as OrgRole)}
                    >
                      {roles.map((role) => (
                        <NativeSelectOption key={role} value={role}>
                          {role}
                        </NativeSelectOption>
                      ))}
                    </NativeSelect>
                  ) : (
                    <Badge variant="outline" className="capitalize">{member.role}</Badge>
                  )}
                  {manageable && (
                    <Button
                      variant="ghost"
                      size="icon"
                      disabled={isBusy}
                      aria-label={`Remove ${member.name}`}
                      onClick={() => {
                        if (window.confirm(`Remove ${member.name} from ${organization.name}?`)) {
                          onRemove(member.id);
                        }
                      }}
                    >
                      <UserMinus className="size-4" />
                    </Button>
                  )}
                </li>
              );
            })}
          </ul>
        </CardContent>
      </Card>

      {canManage && invitations.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Pending invitations</CardTitle>
          </CardHeader>
          <CardContent>
            <ul className="divide-y">
              {invitations.map((invitation) => (
                <li key={invitation.id} className="flex flex-wrap items-center gap-3 py-3">
                  <div className="min-w-0 flex-1">
                    <div className="truncate text-sm font-medium">{invitation.email}</div>
                    <div className="text-xs text-muted-foreground">
                      {invitation.role} · expires {formatDate(invitation.expiresAt)}
                    </div>
                  </div>
                  <Button
                    variant="ghost"
                    size="sm"
                    disabled={isBusy}
                    aria-label={`Revoke invitation for ${invitation.email}`}
                    onClick={() => onCancelInvitation(invitation.id)}
                  >
                    Revoke
                  </Button>
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>
      )}

      <Card className="border-destructive/40">
        <CardHeader>
          <CardTitle>Danger zone</CardTitle>
          <CardDescription>You can&apos;t leave or delete your only workspace.</CardDescription>
        </CardHeader>
        <CardContent className="flex flex-wrap gap-2">
          <Button
            variant="outline"
            disabled={isBusy}
            onClick={() => {
              if (window.confirm(`Leave ${organization.name}?`)) onLeave();
            }}
          >
            <LogOut className="size-4" /> Leave workspace
          </Button>
          {isOwner && (
            <Button
              variant="destructive"
              disabled={isBusy}
              onClick={() => {
                if (window.confirm(`Delete ${organization.name}? This removes all members and cannot be undone.`)) {
                  onDelete();
                }
              }}
            >
              <Trash2 className="size-4" /> Delete workspace
            </Button>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

export default TeamSettings;
