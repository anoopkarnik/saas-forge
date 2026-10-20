"use client";

import React from "react";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@workspace/ui/components/shadcn/table";
import { Badge } from "@workspace/ui/components/shadcn/badge";
import {
  Accordion, AccordionItem, AccordionTrigger, AccordionContent,
} from "@workspace/ui/components/shadcn/accordion";
import { cn } from "@workspace/ui/lib/utils";

type Access = "public" | "authenticated" | "admin" | "adminGuestRead";

interface ApiCall {
  name: string;
  type: "query" | "mutation";
  access: Access;
}

interface ApiGroup {
  group: string;
  label: string;
  calls: ApiCall[];
}

interface Props {
  data: ApiGroup[];
}

// The "write tier" badge — who is allowed to fully use the call. adminGuestRead
// is an admin-write surface, so it shows as Admin; guest read access is shown
// separately in the Guest column.
const accessBadge: Record<Access, { label: string; className: string }> = {
  public: {
    label: "Public",
    className: "bg-emerald-500/15 text-emerald-700 dark:text-emerald-400 border-emerald-500/30",
  },
  authenticated: {
    label: "Authenticated",
    className: "bg-blue-500/15 text-blue-700 dark:text-blue-400 border-blue-500/30",
  },
  admin: {
    label: "Admin",
    className: "bg-amber-500/15 text-amber-700 dark:text-amber-400 border-amber-500/30",
  },
  adminGuestRead: {
    label: "Admin",
    className: "bg-amber-500/15 text-amber-700 dark:text-amber-400 border-amber-500/30",
  },
};

// Whether the read-only demo (guest) role can call this. Mirrors the guards in
// trpc/init.ts: public is ungated; guests may run any non-admin query and any
// adminGuestRead query, but are blocked from authenticated/admin mutations and
// admin-only queries.
function guestCanAccess(call: ApiCall): boolean {
  switch (call.access) {
    case "public":
      return true;
    case "authenticated":
      return call.type === "query";
    case "adminGuestRead":
      return call.type === "query";
    case "admin":
      return false;
  }
}

function AccessBadge({ access }: { access: Access }) {
  const b = accessBadge[access];
  return (
    <Badge variant="outline" className={cn("font-medium", b.className)}>
      {b.label}
    </Badge>
  );
}

function GuestBadge({ call }: { call: ApiCall }) {
  return guestCanAccess(call) ? (
    <Badge
      variant="outline"
      className="font-medium bg-emerald-500/15 text-emerald-700 dark:text-emerald-400 border-emerald-500/30"
    >
      ✓ Yes
    </Badge>
  ) : (
    <Badge variant="outline" className="font-medium text-muted-foreground">
      ✗ No
    </Badge>
  );
}

function Legend() {
  return (
    <div className="space-y-2 text-xs text-muted-foreground mb-6">
      <div className="flex flex-wrap items-center gap-2">
        <span className="mr-1">Access:</span>
        <AccessBadge access="public" />
        <span>anyone</span>
        <span className="mx-1">·</span>
        <AccessBadge access="authenticated" />
        <span>signed-in users &amp; admins</span>
        <span className="mx-1">·</span>
        <AccessBadge access="admin" />
        <span>admins only</span>
      </div>
      <p>
        <strong>Guest</strong> is the read-only demo role: guests may run queries
        they are permitted to see (including the admin analytics/config reads
        marked <span className="font-medium">Admin</span> + Guest&nbsp;✓) but are
        blocked from every authenticated/admin mutation and from sensitive
        admin-only queries. Public mutations are ungated, so guests can call them.
      </p>
    </div>
  );
}

export function ApiRegistryTable({ data }: Props) {
  const total = data.reduce((n, g) => n + g.calls.length, 0);

  return (
    <div>
      <Legend />
      <Accordion
        type="multiple"
        defaultValue={data.map((g) => g.group)}
        className="space-y-3"
      >
        {data.map((group) => (
          <AccordionItem
            key={group.group}
            value={group.group}
            className="border rounded-md px-4"
          >
            <AccordionTrigger className="hover:no-underline">
              <span className="flex items-center gap-3">
                <span className="font-semibold">{group.label}</span>
                <span className="text-xs text-muted-foreground font-normal">
                  {group.group}
                </span>
                <Badge variant="secondary" className="ml-1">
                  {group.calls.length}
                </Badge>
              </span>
            </AccordionTrigger>
            <AccordionContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Call</TableHead>
                    <TableHead className="w-32">Type</TableHead>
                    <TableHead className="w-40">Access</TableHead>
                    <TableHead className="w-28">Guest</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {group.calls.map((call) => (
                    <TableRow key={call.name}>
                      <TableCell className="font-mono text-sm">{call.name}</TableCell>
                      <TableCell>
                        <Badge
                          variant="outline"
                          className={cn(
                            "font-medium",
                            call.type === "mutation"
                              ? "bg-purple-500/15 text-purple-700 dark:text-purple-400 border-purple-500/30"
                              : "bg-slate-500/15 text-slate-700 dark:text-slate-300 border-slate-500/30",
                          )}
                        >
                          {call.type === "mutation" ? "Mutation" : "Query"}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <AccessBadge access={call.access} />
                      </TableCell>
                      <TableCell>
                        <GuestBadge call={call} />
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </AccordionContent>
          </AccordionItem>
        ))}
      </Accordion>
      <p className="text-xs text-muted-foreground mt-4">
        {total} calls across {data.length} groups.
      </p>
    </div>
  );
}
