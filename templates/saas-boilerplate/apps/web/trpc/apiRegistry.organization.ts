import type { ApiGroup } from "./apiRegistry.types";

// Organization procedures (multi_tenancy module). Kept in its own file so the
// scaffold can swap it for an empty list when the module is not selected.
// Access is the global gate; org role checks (admin/owner) happen inside.
export const ORGANIZATION_API_GROUPS: ApiGroup[] = [
  {
    group: "organization",
    label: "Organizations",
    calls: [
      { name: "current", type: "query", access: "authenticated" },
      { name: "create", type: "mutation", access: "authenticated" },
      { name: "setActive", type: "mutation", access: "authenticated" },
      { name: "members", type: "query", access: "authenticated" },
      { name: "update", type: "mutation", access: "authenticated" },
      { name: "invite", type: "mutation", access: "authenticated" },
      { name: "cancelInvitation", type: "mutation", access: "authenticated" },
      { name: "updateMemberRole", type: "mutation", access: "authenticated" },
      { name: "removeMember", type: "mutation", access: "authenticated" },
      { name: "leave", type: "mutation", access: "authenticated" },
      { name: "delete", type: "mutation", access: "authenticated" },
      { name: "getInvitation", type: "query", access: "authenticated" },
      { name: "acceptInvitation", type: "mutation", access: "authenticated" },
      { name: "rejectInvitation", type: "mutation", access: "authenticated" },
    ],
  },
];
