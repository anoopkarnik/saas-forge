"use client"
import { FormResult } from './FormResult';
import { Card, CardContent, CardFooter, CardHeader } from '@workspace/ui/components/shadcn/card';

import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@workspace/ui/components/shadcn/form';
import { useForm } from 'react-hook-form';
import { z } from "zod"
import { zodResolver } from '@hookform/resolvers/zod';
import { Input } from '@workspace/ui/components/shadcn/input';
import { useRouter } from 'next/navigation';
import { useState } from 'react';
import LoadingButton from '@workspace/ui/components/misc/LoadingButton';
import { ResetPasswordSchema } from '@workspace/auth/utils/zod';
import { ResetPasswordCardProps } from '@workspace/auth/utils/typescript';
import { toast } from 'sonner'

const ResetPasswordCard = ({ errorMessage, successMessage, token, resetFunction }: ResetPasswordCardProps) => {
  const [pending, setPending] = useState(false)
  const form = useForm<z.infer<typeof ResetPasswordSchema>>({
    resolver: zodResolver(ResetPasswordSchema),
    defaultValues: {
      password: '',
      confirmPassword: '',
    },
  })

  const router = useRouter();

  async function handleSubmit(data: z.infer<typeof ResetPasswordSchema>) {
    setPending(true)
    await resetFunction(token, data.password)
    toast.success("Password reset successfully")
    router.push('/sign-in')
    setPending(false)
  }

  return (
    <Card className='w-full max-w-md border-border/50 shadow-xl bg-card/50 backdrop-blur-sm'>
      <CardHeader className="space-y-1 pb-6">
        <h2 className='text-3xl font-bold tracking-tight text-center'>Reset Password</h2>
        <p className='text-sm text-muted-foreground text-center'>Enter your new password below</p>
      </CardHeader>
      <CardContent>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(handleSubmit)} className='space-y-6'>
            <div className='space-y-4 mb-4'>
              <FormField control={form.control} name="password" render={({ field }) => (
                <FormItem>
                  <FormLabel>New Password</FormLabel>
                  <FormControl>
                    <Input type="password" placeholder='******' className="h-10" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )} />
              <FormField control={form.control} name="confirmPassword" render={({ field }) => (
                <FormItem>
                  <FormLabel>Confirm Password</FormLabel>
                  <FormControl>
                    <Input type="password" placeholder='******' className="h-10" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )} />
            </div>
            <FormResult type="error" message={errorMessage} />
            <FormResult type="success" message={successMessage} />
            <LoadingButton variant="default" className="w-full h-10 font-medium" pending={pending}>
              Reset Password
            </LoadingButton>
          </form>
        </Form>
      </CardContent>
      <CardFooter className='flex justify-center pt-2'>
        <button onClick={() => router.push('/sign-in')} className='text-sm text-center font-medium text-primary hover:underline'>
          Back to Login
        </button>
      </CardFooter>
    </Card>
  )
}

export default ResetPasswordCard;