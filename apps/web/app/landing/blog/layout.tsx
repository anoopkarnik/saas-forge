import ErrorState from "@workspace/ui/components/misc/ErrorState";
import LoadingState from "@workspace/ui/components/misc/LoadingState";
import { getQueryClient, trpc } from "@/trpc/server"
import { dehydrate, HydrationBoundary } from "@tanstack/react-query";
import { ReactElement, ReactNode, Suspense } from "react";
import { ErrorBoundary } from "react-error-boundary";
import BlogShell from "@/blocks/landing/BlogShell";

const BlogLayout = async ({ children }: { children: ReactNode }): Promise<ReactElement> => {
  const queryClient = getQueryClient();
  await queryClient.ensureQueryData(trpc.landing.getLandingInfo.queryOptions());

  return (
    <HydrationBoundary state={dehydrate(queryClient)}>
      <Suspense fallback={<LoadingState title='Retrieving' description='Please wait while we retrieve the blog' />}>
        <ErrorBoundary fallback={<ErrorState title='Error Retrieving Data' description='There was an error while retrieving the blog.' />}>
          <BlogShell>{children}</BlogShell>
        </ErrorBoundary>
      </Suspense>
    </HydrationBoundary>
  )
}

export default BlogLayout
