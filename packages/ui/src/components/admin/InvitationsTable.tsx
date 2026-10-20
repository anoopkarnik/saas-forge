"use client";

import React from "react";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@workspace/ui/components/shadcn/table";
import { Badge } from "@workspace/ui/components/shadcn/badge";
import { Button } from "@workspace/ui/components/shadcn/button";

interface Props {
  invitations: any[];
  onRevoke: (id: string) => void;
  onResend: (id: string) => void;
}

const statusVariant: Record<string, "default" | "secondary" | "destructive" | "outline"> = {
  PENDING: "outline",
  ACCEPTED: "default",
  REVOKED: "destructive",
};

export function InvitationsTable({ invitations, onRevoke, onResend }: Props) {
  return (
    <div className="border rounded-md">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Email</TableHead>
            <TableHead>Invited by</TableHead>
            <TableHead>Expires</TableHead>
            <TableHead>Status</TableHead>
            <TableHead className="text-right">Actions</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {invitations.length === 0 ? (
            <TableRow>
              <TableCell colSpan={5} className="text-center h-24 text-muted-foreground">
                No invitations yet.
              </TableCell>
            </TableRow>
          ) : (
            invitations.map((inv) => (
              <TableRow key={inv.id}>
                <TableCell className="font-medium">{inv.email}</TableCell>
                <TableCell>{inv.invitedBy?.name || inv.invitedBy?.email || "—"}</TableCell>
                <TableCell>{new Date(inv.expiresAt).toLocaleDateString()}</TableCell>
                <TableCell>
                  <Badge variant={statusVariant[inv.status] ?? "secondary"} className="capitalize">
                    {String(inv.status).toLowerCase()}
                  </Badge>
                </TableCell>
                <TableCell className="text-right space-x-2">
                  {inv.status === "PENDING" && (
                    <>
                      <Button variant="outline" size="sm" onClick={() => onResend(inv.id)}>Resend</Button>
                      <Button variant="ghost" size="sm" onClick={() => onRevoke(inv.id)}>Revoke</Button>
                    </>
                  )}
                </TableCell>
              </TableRow>
            ))
          )}
        </TableBody>
      </Table>
    </div>
  );
}
