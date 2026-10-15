import { Card, CardContent } from '@workspace/ui/components/shadcn/card';
import { LoadingCardProps } from '@workspace/auth/utils/typescript';
import { BeatLoader } from 'react-spinners';
import { useTranslations } from 'use-intl';

const LoadingCard = ({ title, description }: LoadingCardProps) => {
  const t = useTranslations('common')

  return (
    <div className='w-full flex items-center justify-center mt-10 min-h-full'>
      <Card className='flex items-center justify-center  shadow-xl shadow-white/20 p-4'>
        <CardContent>
          <div className='flex flex-col items-center justify-center gap-4'>
            <div className='text-4xl animate-pulse text-center mb-4'>
              {title ?? t('loading.title')}
            </div>
            <div className='text-lg animate-pulse text-center'>
              {description ?? t('loading.description')}
            </div>
            <BeatLoader size={20} />
          </div>
        </CardContent>
      </Card>
    </div>
  )
}

export default LoadingCard;