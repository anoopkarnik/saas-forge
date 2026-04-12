import ErrorState from "@workspace/ui/components/misc/ErrorState";
import LoadingState from "@workspace/ui/components/misc/LoadingState";
import { getQueryClient, trpc } from "@/trpc/server"
import { dehydrate, HydrationBoundary } from "@tanstack/react-query";
import { ReactElement, Suspense } from "react";
import { ErrorBoundary } from "react-error-boundary";
import PrivacyPolicy from "@/blocks/landing/PrivacyPolicy";
import { createSeoMetadata } from "@/lib/seo";

export const revalidate = 600;

export const metadata = createSeoMetadata({
  title: "Privacy Policy",
  description: "Read the privacy policy for this SaaS application.",
  pathname: "/landing/legal/privacy-policy",
});

const Page = async (): Promise<ReactElement> => {
  const queryClient = getQueryClient();
  await Promise.all([
    // queryClient.ensureQueryData(trpc.portfolio.getPortfolioDataFromStrapi.queryOptions()),
    queryClient.ensureQueryData(trpc.landing.getLandingInfoFromNotion.queryOptions()),
  ]);
  return (
    <HydrationBoundary state={dehydrate(queryClient)}>
      <Suspense fallback={<LoadingState title='Retrieving' description='Please wait while we retrieve the page data' />}>
        <ErrorBoundary fallback={<ErrorState title='Error Retrieving Data' description='There was an error while retrieving the data.' />}>
          <PrivacyPolicy />
        </ErrorBoundary>
      </Suspense>
    </HydrationBoundary>
  )
}

export default Page
