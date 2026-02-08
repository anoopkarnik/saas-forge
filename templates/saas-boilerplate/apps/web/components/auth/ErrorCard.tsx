import { Card, CardFooter, CardHeader } from '@workspace/ui/components/shadcn/card';
import { BsExclamationTriangle } from 'react-icons/bs';
import { Button } from '@workspace/ui/components/shadcn/button';
import { useRouter } from 'next/navigation';
import { ErrorCardProps } from '@workspace/auth/utils/typescript';

const ErrorCard = ({ errorMessage }: ErrorCardProps) => {

  const router = useRouter();

  return (
    <Card className='w-full max-w-md border-destructive/50 shadow-xl bg-card/50 backdrop-blur-sm'>
      <CardHeader className="pb-6">
        <h2 className='text-3xl font-bold tracking-tight text-center flex items-center justify-center gap-3 text-destructive'>
          <BsExclamationTriangle className="h-8 w-8" /> Error
        </h2>
        <p className='text-sm text-muted-foreground text-center px-4'>
          {errorMessage || "Oops! Something went wrong!"}
        </p>
      </CardHeader>
      <CardFooter className='flex justify-center pt-2'>
        <Button onClick={() => router.push('/sign-in')} variant={'outline'}
          className='w-full'>
          Back to Login
        </Button>
      </CardFooter>
    </Card>
  )
}

export default ErrorCard;