import DocPostPage from "@/blocks/landing/DocPostPage";
import { fetchDocumentation } from "@/lib/functions/fetchDocumentation";
import { createSeoMetadata } from "@/lib/seo";
import { getQueryClient, trpc } from "@/trpc/server";
import { dehydrate, HydrationBoundary } from "@tanstack/react-query";
import ErrorState from "@workspace/ui/components/misc/ErrorState";
import LoadingState from "@workspace/ui/components/misc/LoadingState";
import type { Metadata } from "next";
import { ReactElement, Suspense } from "react";
import { ErrorBoundary } from "react-error-boundary";

interface Props {
  params: Promise<{ slug: string }>
}

export const revalidate = 600;

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;

  try {
    const documentation = await fetchDocumentation();
    const doc = documentation.docs.find((item) => item.slug === slug);

    if (doc) {
      return createSeoMetadata({
        title: doc.Name,
        description: `${doc.Name} documentation for this SaaS application.`,
        pathname: `/landing/doc/${slug}`,
      });
    }
  } catch (error) {
    console.error("[SEO] documentation metadata error:", error);
  }

  return createSeoMetadata({
    title: "Documentation",
    description: "Read the documentation for this SaaS application.",
    pathname: `/landing/doc/${slug}`,
  });
}

const DocIdPage = async ({ params }: Props): Promise<ReactElement> => {
  const { slug } = await params;

  const queryClient = getQueryClient();
  void queryClient.prefetchQuery(trpc.documentation.queryDocumentationBySlug.queryOptions({ slug: slug }));

  return (
    <HydrationBoundary state={dehydrate(queryClient)}>
      <Suspense fallback={<LoadingState title='Retrieving Documentation' description='Please wait while we fetch the documentation details.' />}>
        <ErrorBoundary fallback={<ErrorState title='Error Retrieving Documentation' description='There was an error while retrieving the documentation details.' />}>
          <DocPostPage slug={slug} />
        </ErrorBoundary>
      </Suspense>
    </HydrationBoundary>
  )
}

export default DocIdPage;
