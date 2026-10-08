import ErrorState from "@workspace/ui/components/misc/ErrorState";
import LoadingState from "@workspace/ui/components/misc/LoadingState";
import { GuestBanner } from "@workspace/ui/components/misc/GuestBanner";
import { getQueryClient, trpc } from "@/trpc/server"
import { dehydrate, HydrationBoundary } from "@tanstack/react-query";
import { Suspense } from "react";
import { ErrorBoundary } from "react-error-boundary";
import { SidebarProvider, SidebarTrigger } from "@workspace/ui/components/shadcn/sidebar";
import { Separator } from "@workspace/ui/components/shadcn/separator";
import { BreadcrumbsHeader } from "@/components/home/BreadcrumbsHeader"
import AppSidebar from "@/components/home/AppSidebar";
// scaffold:begin notifications
import { NotificationsBell } from "@/components/notifications/NotificationsBell";
// scaffold:end notifications

// No blanket force-dynamic: every page under (home) is a client component that
// fetches its own data. This layout still renders per-request (it reads the
// session via the tRPC server proxy), but child routes are free to be cached.

export default async function Layout({ children }: { children: React.ReactNode }): Promise<React.ReactElement> {

  const queryClient = getQueryClient();
  await Promise.all([
    queryClient.ensureQueryData(trpc.landing.getLandingInfo.queryOptions()),
  ]);

  return (
    <HydrationBoundary state={dehydrate(queryClient)}>
      <Suspense fallback={<LoadingState title='Retrieving' description='Please wait while we retrieve the landing page data' />}>
        <ErrorBoundary fallback={<ErrorState title='Error Retrieving Data' description='There was an error while retrieving the data.' />}>
          <SidebarProvider>
            <AppSidebar />
            <main id="main-content" tabIndex={-1} className="flex min-w-0 flex-1 flex-col pb-24">
              <GuestBanner />
              <div className="flex items-center gap-3 px-4 py-2">
                <SidebarTrigger />
                <BreadcrumbsHeader />
                {/* scaffold:begin notifications */}
                <div className="ml-auto pr-4">
                  <NotificationsBell />
                </div>
                {/* scaffold:end notifications */}
              </div>
              <Separator />
              {children}
            </main>
          </SidebarProvider>
        </ErrorBoundary>
      </Suspense>
    </HydrationBoundary>
  )
}
