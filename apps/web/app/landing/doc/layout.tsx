import ErrorState from "@workspace/ui/components/misc/ErrorState";
import LoadingState from "@workspace/ui/components/misc/LoadingState";
import { getQueryClient, trpc } from "@/trpc/server"
import { dehydrate, HydrationBoundary } from "@tanstack/react-query";
import { Suspense } from "react";
import { ErrorBoundary } from "react-error-boundary";
import DocSidebar from "@/blocks/landing/DocSidebar";
import { SidebarProvider } from "@workspace/ui/components/shadcn/sidebar";

// Public docs shell — cache the render and revalidate every 10 minutes to match
// landing/doc/[slug]/page.tsx instead of rendering it on every request.
export const revalidate = 600;
const DocumentationPage = async ({ children }: { children: React.ReactNode }): Promise<React.ReactElement> => {
  const queryClient = getQueryClient();
  await Promise.all([
    // queryClient.ensureQueryData(trpc.portfolio.getPortfolioDataFromStrapi.queryOptions()),
    queryClient.ensureQueryData(trpc.documentation.getDocumentationInfo.queryOptions()),
  ]);
  return (
    <HydrationBoundary state={dehydrate(queryClient)}>
      <Suspense fallback={<LoadingState title='Retrieving' description='Please wait while we retrieve the documentation page data' />}>
        <ErrorBoundary fallback={<ErrorState title='Error Retrieving Data' description='There was an error while retrieving the data.' />}>
          <SidebarProvider>
            <div className="flex gap-4">
              <DocSidebar />
              {children}
            </div>
          </SidebarProvider>
        </ErrorBoundary>
      </Suspense>
    </HydrationBoundary>
  )
}

export default DocumentationPage