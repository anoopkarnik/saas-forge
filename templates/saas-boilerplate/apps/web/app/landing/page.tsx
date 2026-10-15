import ErrorState from "@workspace/ui/components/misc/ErrorState";
import LandingPage from "@/blocks/landing/LandingPage";
import LoadingState from "@workspace/ui/components/misc/LoadingState";
import { getQueryClient, trpc } from "@/trpc/server"
import { dehydrate, HydrationBoundary } from "@tanstack/react-query";
import type { Metadata } from "next";
import { siteMetadata } from "@/lib/site-config/metadata";
import { ReactElement, Suspense } from "react";
import { ErrorBoundary } from "react-error-boundary";
import { getTranslations } from "next-intl/server";

export const revalidate = 600;

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("landing.meta");
  return siteMetadata({
    title: t("title"),
    pathname: "/landing",
  });
}

const HomePage = async (): Promise<ReactElement> => {
  const t = await getTranslations("common");
  const queryClient = getQueryClient();
  await Promise.all([
    queryClient.ensureQueryData(trpc.landing.getLandingInfo.queryOptions()),
  ]);
  return (
    <HydrationBoundary state={dehydrate(queryClient)}>
      <Suspense fallback={<LoadingState title={t("retrieving.title")} description={t("retrieving.description")} />}>
        <ErrorBoundary fallback={<ErrorState title={t("retrieveError.title")} description={t("retrieveError.description")} />}>
          <LandingPage />
        </ErrorBoundary>
      </Suspense>
    </HydrationBoundary>
  )
}

export default HomePage
