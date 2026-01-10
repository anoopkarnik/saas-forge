import ErrorState from "@workspace/ui/components/misc/ErrorState";
import LandingPage from "@/blocks/LandingPage";
import LoadingState from "@workspace/ui/components/misc/LoadingState";
import { getQueryClient, trpc } from "@/trpc/server"
import { dehydrate, HydrationBoundary } from "@tanstack/react-query";
import { Suspense } from "react";
import { ErrorBoundary } from "react-error-boundary";

// export const revalidate = 600;
export const dynamic = "force-dynamic";
const HomePage = async () => {
  const queryClient = getQueryClient();
  await Promise.all([
    queryClient.ensureQueryData(trpc.landing.getLandingInfoFromNotion.queryOptions()),
  ]);
  return (
    <HydrationBoundary state={dehydrate(queryClient)}>
      <Suspense fallback={<LoadingState title='Retrieving' description='Please wait while we retrieve the landing page data' />}>
        <ErrorBoundary fallback={<ErrorState title='Error Retrieving Data' description='There was an error while retrieving the data.' />}>
           <LandingPage />
        </ErrorBoundary>
      </Suspense>
    </HydrationBoundary>
  )
}

export default HomePage