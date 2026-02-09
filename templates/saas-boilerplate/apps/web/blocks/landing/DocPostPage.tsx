"use client"
import { cn } from '@workspace/ui/lib/utils';
import { useSuspenseQuery } from '@tanstack/react-query'
import { useTRPC } from '@/trpc/client'
import { Blocks } from '@workspace/ui/components/notion/block';
import { motion } from 'framer-motion';
import { formatDistanceToNow } from 'date-fns';

interface Props {
  slug: string;
}

const DocPostPage = ({ slug }: Props) => {
  const trpc = useTRPC();
  const { data: blocks } = useSuspenseQuery(trpc.documentation.queryDocumentationBySlug.queryOptions({ slug: slug }))
  const { data: documentation } = useSuspenseQuery(trpc.documentation.getDocumentationInfoFromNotion.queryOptions())

  //console.log(blocks);

  if (!blocks || blocks.length === 0) {
    return (
      <div className='flex flex-col items-center justify-center h-full'>
        <p className='text-muted-foreground'>No documentation found.</p>
      </div>
    )
  }

  const currentDoc = documentation.docs.find(doc => doc.slug === slug);

  return (
    <div className="container max-w-5xl mx-auto px-6 py-16  my-10 relative">
      <div className="mb-12 border-b border-border/40 pb-8">
        <div className="flex items-center gap-2 text-sm text-muted-foreground mb-4">
          <span>Docs</span>
          <span>/</span>
          <span className="text-foreground font-medium">{currentDoc?.Type}</span>
        </div>
        <h1 className="text-4xl md:text-5xl font-bold tracking-tight mb-4 bg-clip-text text-transparent bg-gradient-to-r from-foreground to-foreground/80">
          {currentDoc?.Name}
        </h1>
        <div className="flex items-center gap-4 text-sm text-muted-foreground">
          <div className="flex items-center gap-1">
            <span>Last updated:</span>
            <span className="text-foreground">{formatDistanceToNow(new Date(currentDoc?.["Last edited time"] || new Date()), { addSuffix: true })}</span>
          </div>
        </div>
      </div>

      <motion.article
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6, delay: 0.2 }}
        className="prose prose-zinc dark:prose-invert prose-lg max-w-none mx-auto prose-headings:font-bold prose-headings:tracking-tight prose-a:text-primary hover:prose-a:underline prose-img:rounded-xl prose-img:shadow-lg"
      >
        <Blocks blocks={blocks || []} />
      </motion.article>
    </div>
  )
};

export default DocPostPage;
