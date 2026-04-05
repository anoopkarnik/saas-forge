import { createTRPCContext } from '@trpc/tanstack-react-query'

// Using `any` since the desktop app doesn't share the AppRouter type directly.
// For full type-safety, import `AppRouter` from the web app's tRPC routers.
export const { TRPCProvider, useTRPC } = createTRPCContext<any>()
