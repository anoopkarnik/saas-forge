// Organizations module not installed (multi_tenancy scaffold module was not
// selected). auth.ts still imports these, so they are kept as no-ops.

export const organizationPlugins: any[] = [];

export async function createPersonalOrganization(_user: {
    id: string;
    name?: string | null;
    email: string;
}): Promise<void> {}

export async function getInitialActiveOrganizationId(_userId: string): Promise<string | null> {
    return null;
}

export async function hasPendingOrganizationInvite(_email: string): Promise<boolean> {
    return false;
}
