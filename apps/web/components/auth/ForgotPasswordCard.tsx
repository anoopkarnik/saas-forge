import { useState } from 'react'
import {z} from "zod"
import { Card, CardContent, CardFooter, CardHeader } from '@workspace/ui/components/shadcn/card';
import { Button } from '@workspace/ui/components/shadcn/button';
import {  useForm } from 'react-hook-form';
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

const ForgotPasswordCard = ({errorMessage,successMessage,resetFunction}
  :ForgotPasswordCardProps
) => {
  const [pending, setPending] = useState(false)
  const form = useForm<z.infer<typeof ForgotPasswordSchema>>({
    resolver: zodResolver(ForgotPasswordSchema),
    defaultValues:{
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
    <Card className='w-[400px] shadow-xl shadow-white/20'>
      <CardHeader>
        <div className='text-4xl font-bold text-center'>Forgot Password</div>
        <div className='text-md font-extralight text-center'>Send Reset Password Mail</div>
      </CardHeader>
      <CardContent>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(handleSubmit)} className='space-y-6'>
            <div className='space-y-4 mb-4'>
              <FormField control={form.control} name="email" render={({field})=>(
                <FormItem>
                  <FormLabel>Email</FormLabel>
                  <FormControl>
                    <Input  type="email" placeholder='example@gmail.com'  {...field}/>
                  </FormControl>
                  <FormMessage/>
                </FormItem>
              )}/>
            </div>
            <FormResult type="error" message={errorMessage}/>
            <FormResult type="success" message={successMessage}/>
            <LoadingButton variant="default" pending={pending}>
              Send Email
            </LoadingButton>
          </form>
        </Form>
      </CardContent>
      <CardFooter className='flex justify-center'>
        <Button onClick={()=>router.push('/sign-in')} variant={'ghost'}
        className='text-sm text-center  cursor-pointer hover:underline'>
          Go to Login Page
        </Button>
      </CardFooter>
    </Card>
  )
}

export default ForgotPasswordCard;