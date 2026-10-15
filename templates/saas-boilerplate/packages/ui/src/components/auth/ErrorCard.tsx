import { Card, CardFooter, CardHeader } from '@workspace/ui/components/shadcn/card';
import { BsExclamationTriangle } from 'react-icons/bs';
import { Button } from '@workspace/ui/components/shadcn/button';

import { ErrorCardProps } from '@workspace/auth/utils/typescript';
import { useTranslations } from 'use-intl';

const ErrorCard = ({ errorMessage, onBackToLoginClick }: ErrorCardProps) => {
  const t = useTranslations('auth')

  return (
    <Card className='w-full max-w-md border-destructive/50 shadow-xl bg-card/50 backdrop-blur-sm'>
      <CardHeader className="pb-6">
        <h2 className='text-3xl font-bold tracking-tight text-center flex items-center justify-center gap-3 text-destructive'>
          <BsExclamationTriangle className="h-8 w-8" /> {t('error.title')}
        </h2>
        <p className='text-sm text-muted-foreground text-center px-4'>
          {errorMessage || t('error.fallback')}
        </p>
      </CardHeader>
      <CardFooter className='flex justify-center pt-2'>
        <Button onClick={onBackToLoginClick} variant={'outline'}
          className='w-full'>
          {t('backToLogin')}
        </Button>
      </CardFooter>
    </Card>
  )
}

export default ErrorCard;