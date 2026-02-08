"use client"
import { cn } from '@workspace/ui/lib/utils';
import { useSuspenseQuery } from '@tanstack/react-query'
import { useTRPC } from '@/trpc/client'
import { Blocks } from '@workspace/ui/components/notion/block';
import { motion } from 'framer-motion';
import { formatDistanceToNow } from 'date-fns';

const DocPostPage = ({ docId }: { docId: string }) => {
  const trpc = useTRPC();
  const { data } = useSuspenseQuery(trpc.documentation.queryDocumentationById.queryOptions({ id: docId }))
  const { data: documentation } = useSuspenseQuery(trpc.documentation.getDocumentationInfoFromNotion.queryOptions())

  return (
    <div className="container max-w-5xl mx-auto px-6 py-16  my-10 relative">
      <div className="mb-12 border-b border-border/40 pb-8">
        <div className="flex items-center gap-2 text-sm text-muted-foreground mb-4">
          <span>Docs</span>
          <span>/</span>
          <span className="text-foreground font-medium">{documentation.docs.find(doc => doc.id === docId)?.Type}</span>
        </div>
        <h1 className="text-4xl md:text-5xl font-bold tracking-tight mb-4 bg-clip-text text-transparent bg-gradient-to-r from-foreground to-foreground/80">
          {documentation.docs.find(doc => doc.id === docId)?.Name}
        </h1>
        <p className="text-sm text-muted-foreground flex items-center gap-2">
          <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="lucide lucide-clock"><circle cx="12" cy="12" r="10" /><polyline points="12 6 12 12 16 14" /></svg>
          Last updated {formatDistanceToNow(new Date(documentation.docs.find(doc => doc.id === docId)?.['Last edited time'] || Date.now()), { addSuffix: true })}
        </p>
      </div>

      <motion.article
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6, delay: 0.2 }}
        className="prose prose-zinc dark:prose-invert prose-lg max-w-none mx-auto prose-headings:font-bold prose-headings:tracking-tight prose-a:text-primary hover:prose-a:underline prose-img:rounded-xl prose-img:shadow-lg"
      >
        <Blocks blocks={data || []} />
      </motion.article>
    </div>
  )
};

export default DocPostPage;
