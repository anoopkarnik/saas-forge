import { FormResult } from './FormResult';
import { Card, CardContent, CardFooter, CardHeader } from '@workspace/ui/components/shadcn/card';

import { BeatLoader } from 'react-spinners';
import { useRouter } from 'next/navigation';
import { VerificationCardProps } from '@workspace/auth/utils/typescript';

const VerificationCard = ({ errorMessage, successMessage }: VerificationCardProps) => {
  const router = useRouter();
  return (
    <Card className='w-full max-w-md border-border/50 shadow-xl bg-card/50 backdrop-blur-sm'>
      <CardHeader className="pb-6">
        <h2 className='text-3xl font-bold tracking-tight text-center flex items-center justify-center gap-4'>
          Verification
        </h2>
        <p className='text-sm text-muted-foreground text-center'>Verifying your identity...</p>
      </CardHeader>
      <CardContent>
        <div className='flex items-center justify-center py-4'>
          {(!successMessage && !errorMessage) && <BeatLoader size={16} color='var(--primary)' />}
          {!successMessage && <FormResult type="error" message={errorMessage} />}
          <FormResult type="success" message={successMessage} />
        </div>
      </CardContent>
      <CardFooter className='flex justify-center pt-2'>
        <button onClick={() => router.push('/sign-in')} className='text-sm text-center font-medium text-primary hover:underline'>
          Back to Login
        </button>
      </CardFooter>
    </Card>
  )
}

export default VerificationCard;