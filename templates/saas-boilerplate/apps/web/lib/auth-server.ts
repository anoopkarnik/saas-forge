import { auth } from '@workspace/auth/better-auth/auth';
import { headers } from 'next/headers';

/**
 * Centralized server-side auth helper to prevent multiple Better Auth instances.
 * Always use this instead of importing auth directly in server components.
 */
export async function getServerSession() {
  return await auth.api.getSession({
    headers: await headers(),
  });
}

/**
 * Re-export auth for tRPC and API routes that need direct access.
 * Use sparingly - prefer getServerSession() for most cases.
 */
export { auth };
