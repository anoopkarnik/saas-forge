import DocPostPage from "@/blocks/DocPostPage";
import { getQueryClient, trpc } from "@/trpc/server";
import { dehydrate, HydrationBoundary } from "@tanstack/react-query";
import ErrorState from "@workspace/ui/components/misc/ErrorState";
import LoadingState from "@workspace/ui/components/misc/LoadingState";
import { Suspense } from "react";
import { ErrorBoundary } from "react-error-boundary";

interface Props {
    params: Promise<{ docId: string }>
}

const DocIdPage = async ({params} : Props) => {
    const {docId} = await params;

    const queryClient = getQueryClient();
    void queryClient.prefetchQuery(trpc.documentation.queryDocumentationById.queryOptions({id: docId}));

  return (
    <HydrationBoundary state={dehydrate(queryClient)}>
        <Suspense fallback={<LoadingState title='Retrieving Documentation' description='Please wait while we fetch the documentation details.' />}>
          <ErrorBoundary fallback={<ErrorState title='Error Retrieving Documentation' description='There was an error while retrieving the documentation details.' />}>
                <DocPostPage docId={docId}/>
            </ErrorBoundary>
        </Suspense>
    </HydrationBoundary>
  )
}

export default DocIdPage;