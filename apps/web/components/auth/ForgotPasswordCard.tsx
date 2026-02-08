import { useState } from 'react'
import { z } from "zod"
import { Card, CardContent, CardFooter, CardHeader } from '@workspace/ui/components/shadcn/card';
import { Button } from '@workspace/ui/components/shadcn/button';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@workspace/ui/components/shadcn/form'
import { FormResult } from './FormResult';
import { useRouter } from 'next/navigation';
import LoadingButton from '@workspace/ui/components/misc/LoadingButton';
import { ForgotPasswordSchema } from '@workspace/auth/utils/zod';
import { ForgotPasswordCardProps } from '@workspace/auth/utils/typescript';
import { Input } from '@workspace/ui/components/shadcn/input';

const ForgotPasswordCard = ({ errorMessage, successMessage, resetFunction }
  : ForgotPasswordCardProps
) => {
  const [pending, setPending] = useState(false)
  const form = useForm<z.infer<typeof ForgotPasswordSchema>>({
    resolver: zodResolver(ForgotPasswordSchema),
    defaultValues: {
      email: '',
    },
  })


  async function handleSubmit(data: z.infer<typeof ForgotPasswordSchema>) {
    setPending(true)
    await resetFunction(data.email)
    setPending(false)
  }

  const router = useRouter();

  return (
    <Card className='w-full max-w-md border-border/50 shadow-xl bg-card/50 backdrop-blur-sm'>
      <CardHeader className="space-y-1 pb-6">
        <h2 className='text-3xl font-bold tracking-tight text-center'>Forgot Password</h2>
        <p className='text-sm text-muted-foreground text-center'>
          Enter your email to reset your password
        </p>
      </CardHeader>
      <CardContent>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(handleSubmit)} className='space-y-6'>
            <div className='space-y-4 mb-4'>
              <FormField control={form.control} name="email" render={({ field }) => (
                <FormItem>
                  <FormLabel>Email</FormLabel>
                  <FormControl>
                    <Input type="email" placeholder='name@example.com' className="h-10" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )} />
            </div>
            {errorMessage && <FormResult type="error" message={JSON.stringify(errorMessage)} />}
            {successMessage && <FormResult type="success" message={JSON.stringify(successMessage)} />}
            <LoadingButton variant="default" className="w-full h-10 font-medium" pending={pending}>
              Send Reset Link
            </LoadingButton>
          </form>
        </Form>
      </CardContent>
      <CardFooter className='flex justify-center pt-2'>
        <Button onClick={() => router.push('/sign-in')} variant={'ghost'}
          className='text-sm text-center font-normal hover:bg-muted'>
          Back to Login
        </Button>
      </CardFooter>
    </Card>
  )
}

export default ForgotPasswordCard;