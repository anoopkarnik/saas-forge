"use client"
import { cn } from '@workspace/ui/lib/utils';
import { useSuspenseQuery } from '@tanstack/react-query'
import { useTRPC } from '@/trpc/client'
import { Blocks } from '@workspace/ui/components/notion/block';
import { motion } from 'framer-motion';
import { formatDistanceToNow } from 'date-fns';

const DocPostPage = ({ docId }: { docId: string }) => {
    const trpc = useTRPC();
    const { data} = useSuspenseQuery(trpc.documentation.queryDocumentationById.queryOptions({id: docId}))
    const {data:documentation} = useSuspenseQuery(trpc.documentation.getDocumentationInfoFromNotion.queryOptions())

    return (
        <div className="container max-w-5xl mx-auto px-6 py-16  my-10 relative">
      <div className="leading-normal mb-10">
        <h1 className="text-5xl font-serif font-bold drop-shadow-sm  ">
          {documentation.docs.find(doc => doc.id === docId)?.Name}
        </h1>
        <p className="text-sm text-gray-500">
          Last Updated {formatDistanceToNow(new Date(documentation.docs.find(doc => doc.id === docId)?.['Last edited time'] || Date.now()), { addSuffix: true })}
        </p>
      </div>

      <motion.article
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6, delay: 0.2 }}
        className="prose prose-xl mx-auto prose-headings:font-serif prose-headings:text-gray-800"
      >
        <Blocks blocks={data || []}/>
      </motion.article>
    </div>
  )
};

export default DocPostPage;
