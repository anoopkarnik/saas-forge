export type FlagDefinition = { description: string; default: boolean };
export type FlagSubject = {
  userId?: string | null;
  role?: string | null;
  organizationId?: string | null;
  anonymousId?: string | null;
};
