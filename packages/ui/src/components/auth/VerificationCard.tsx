import { FormResult } from './FormResult';
import { Card, CardContent, CardFooter, CardHeader } from '@workspace/ui/components/shadcn/card';

import { BeatLoader } from 'react-spinners';
import { VerificationCardProps } from '@workspace/auth/utils/typescript';
import { useTranslations } from 'use-intl';

const VerificationCard = ({ errorMessage, successMessage, onBackToLoginClick }: VerificationCardProps) => {
  const t = useTranslations('auth')
  return (
    <Card className='w-full max-w-md border-border/50 shadow-xl bg-card/50 backdrop-blur-sm'>
      <CardHeader className="pb-6">
        <h2 className='text-3xl font-bold tracking-tight text-center flex items-center justify-center gap-4'>
          {t('verification.title')}
        </h2>
        <p className='text-sm text-muted-foreground text-center'>{t('verification.subtitle')}</p>
      </CardHeader>
      <CardContent>
        <div className='flex items-center justify-center py-4'>
          {(!successMessage && !errorMessage) && <BeatLoader size={16} color='var(--primary)' />}
          {!successMessage && <FormResult type="error" message={errorMessage} />}
          <FormResult type="success" message={successMessage} />
        </div>
      </CardContent>
      <CardFooter className='flex justify-center pt-2'>
        <button onClick={onBackToLoginClick} className='text-sm text-center font-medium text-primary hover:underline'>
          {t('backToLogin')}
        </button>
      </CardFooter>
    </Card>
  )
}

export default VerificationCard;