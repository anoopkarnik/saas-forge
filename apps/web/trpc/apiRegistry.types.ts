export type Access = "public" | "authenticated" | "admin" | "adminGuestRead";

export type ApiCall = {
  name: string;
  type: "query" | "mutation";
  access: Access;
};

export type ApiGroup = {
  /** tRPC router path prefix, e.g. "billing" or "admin.settings". */
  group: string;
  /** Human-readable heading. */
  label: string;
  calls: ApiCall[];
};
