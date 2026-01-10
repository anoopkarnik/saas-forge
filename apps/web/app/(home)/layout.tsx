import ErrorState from "@workspace/ui/components/misc/ErrorState";
import LoadingState from "@workspace/ui/components/misc/LoadingState";
import { getQueryClient, trpc } from "@/trpc/server"
import { dehydrate, HydrationBoundary } from "@tanstack/react-query";
import { Suspense } from "react";
import { ErrorBoundary } from "react-error-boundary";
import { AppSidebar } from "@/blocks/AppSidebar";
import { SidebarProvider, SidebarTrigger } from "@workspace/ui/components/shadcn/sidebar";
import { Separator } from "@workspace/ui/components/shadcn/separator";
import {BreadcrumbsHeader} from "@/components/home/BreadcrumbsHeader"

export const dynamic = "force-dynamic";

export default async function Layout({ children }: { children: React.ReactNode }) {

    const queryClient = getQueryClient();
    await Promise.all([
      queryClient.ensureQueryData(trpc.landing.getLandingInfoFromNotion.queryOptions()),
    ]);

  return (
    <HydrationBoundary state={dehydrate(queryClient)}>
      <Suspense fallback={<LoadingState title='Retrieving' description='Please wait while we retrieve the landing page data' />}>
        <ErrorBoundary fallback={<ErrorState title='Error Retrieving Data' description='There was an error while retrieving the data.' />}>
           <SidebarProvider>
           <AppSidebar/>
           <div className="flex flex-col flex-1 max-h-screen">
            <div className="flex items-center gap-4 py-2">
              <SidebarTrigger />
              <BreadcrumbsHeader />
            </div>
            <Separator/>
          {children}
        </div>
        </SidebarProvider>
        </ErrorBoundary>
      </Suspense>
    </HydrationBoundary>
  )
}
