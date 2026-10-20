"use client"
import { cn } from '@workspace/ui/lib/utils';
import { useSuspenseQuery } from '@tanstack/react-query'
import { useTRPC } from '@/trpc/client'
import { motion, useReducedMotion } from 'framer-motion';
import { useLocale, useTranslations } from 'next-intl';
import type { Locale } from '@workspace/i18n/config';
import { formatRelative } from '@workspace/i18n/format';
import { ReactElement } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';

interface Props {
  slug: string;
}

const DocPostPage = ({ slug }: Props): ReactElement => {
  const t = useTranslations('landing');
  const locale = useLocale() as Locale;
  const reducedMotion = useReducedMotion();
  const trpc = useTRPC();
  const { data: content } = useSuspenseQuery(trpc.documentation.queryDocumentationBySlug.queryOptions({ slug: slug }))
  const { data: documentation } = useSuspenseQuery(trpc.documentation.getDocumentationInfo.queryOptions())

  if (!content) {
    return (
      <div className='flex flex-col items-center justify-center h-full'>
        <p className='text-muted-foreground'>{t('docs.notFound')}</p>
      </div>
    )
  }

  const currentDoc = documentation.docs.find(doc => doc.slug === slug);

  return (
    <div className="w-full max-w-3xl mx-auto px-4 py-8 sm:px-6 sm:py-12 relative">
      <div className="mb-12 border-b border-border/40 pb-8">
        <div className="flex items-center gap-2 text-sm text-muted-foreground mb-4">
          <span>{t('docs.breadcrumb')}</span>
          <span>/</span>
          <span className="text-foreground font-medium">{currentDoc?.Type}</span>
        </div>
        <h1 className="text-4xl md:text-5xl font-bold tracking-tight mb-4 bg-clip-text text-transparent bg-gradient-to-r from-foreground to-foreground/80">
          {currentDoc?.Name}
        </h1>
        <div className="flex items-center gap-4 text-sm text-muted-foreground">
          <div className="flex items-center gap-1">
            <span>{t('docs.lastUpdated')}</span>
            <span className="text-foreground">{formatRelative(currentDoc?.["Last edited time"] || new Date(), locale)}</span>
          </div>
        </div>
      </div>

      <motion.article
        initial={reducedMotion ? false : { opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6, delay: 0.2 }}
        className="prose prose-zinc dark:prose-invert max-w-none prose-pre:overflow-x-auto prose-table:block prose-table:overflow-x-auto [overflow-wrap:anywhere] mx-auto prose-headings:font-bold prose-headings:tracking-tight prose-a:text-primary hover:prose-a:underline prose-img:rounded-xl prose-img:shadow-lg"
      >
        <ReactMarkdown remarkPlugins={[remarkGfm]}>{content}</ReactMarkdown>
      </motion.article>
    </div>
  )
};

export default DocPostPage;
