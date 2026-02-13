"use client"

import { useState } from 'react'
import { z } from "zod"
import { Card, CardContent, CardFooter, CardHeader } from '@workspace/ui/components/shadcn/card';
import { FaGithub, FaLinkedin } from 'react-icons/fa';
import { FcGoogle } from 'react-icons/fc';
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
import { Input } from '@workspace/ui/components/shadcn/input';
import { FormResult } from './FormResult';
import { useRouter } from 'next/navigation'
import LoadingButton from '@workspace/ui/components/misc/LoadingButton';
import { LoginSchema } from '@workspace/auth/utils/zod';
import { LoginCardProps } from '@workspace/auth/utils/typescript';
import { Separator } from '@workspace/ui/components/shadcn/separator';

const LoginCard = ({ showEmail, showGoogleProvider, showGithubProvider, showLinkedinProvider, onEmailSubmit,
  onGoogleProviderSubmit, onGithubProviderSubmit, onLinkedinProviderSubmit, errorMessage }
  : LoginCardProps
) => {
  const [pending, setPending] = useState(false)
  const form = useForm<z.infer<typeof LoginSchema>>({
    resolver: zodResolver(LoginSchema),
    defaultValues: {
      email: '',
      password: ''
    },
  })


  const router = useRouter();

  async function handleSubmit(data: z.infer<typeof LoginSchema>) {
    setPending(true)
    await onEmailSubmit(data)
    setPending(false)

  }

  return (
    <Card className='w-full max-w-md border-border/50 shadow-xl bg-card/50 backdrop-blur-sm'>
      <CardHeader className="space-y-1">
        <h2 className='text-3xl font-bold tracking-tight text-center'>Login</h2>
        <p className='text-sm text-muted-foreground text-center'>
          Welcome back! Please enter your details.
        </p>
      </CardHeader>
      {showEmail &&
        <CardContent className="pb-6">
          <Form {...form}>
            <form onSubmit={form.handleSubmit(handleSubmit)} className='space-y-4'>
              <div className='space-y-4'>
                <FormField control={form.control} name="email" render={({ field }) => (
                  <FormItem>
                    <FormLabel>Email</FormLabel>
                    <FormControl>
                      <Input disabled={pending} type="email" placeholder='name@example.com' className="h-10" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )} />
                <FormField control={form.control} name="password" render={({ field }) => (
                  <FormItem>
                    <div className="flex items-center justify-between">
                      <FormLabel>Password</FormLabel>
                      <button type="button" onClick={() => router.push('/forgot-password')} className='text-xs font-medium text-primary hover:underline cursor-pointer'>
                        Forgot password?
                      </button>
                    </div>
                    <FormControl>
                      <Input disabled={pending} placeholder='******' type="password" className="h-10" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )} />
              </div>

              <FormResult type="error" message={errorMessage} />
              <LoadingButton variant="default" className="w-full h-10 font-medium" pending={pending}>
                Sign in
              </LoadingButton>
            </form>
          </Form>
        </CardContent>}

      {(showGoogleProvider || showGithubProvider || showLinkedinProvider) && (showEmail) && (
        <div className="px-6 relative">
          <div className="absolute inset-0 flex items-center px-6">
            <span className="w-full border-t border-border/60" />
          </div>
          <div className="relative flex justify-center text-xs uppercase">
            <span className="px-2 text-muted-foreground">Or continue with</span>
          </div>
        </div>
      )}

      <CardFooter className='flex flex-col gap-3 pt-6'>
        {showGoogleProvider && (
          <Button variant='outline' onClick={onGoogleProviderSubmit} className="w-full h-10 hover:bg-muted/50 transition-colors" title="Sign in with Google">
            <FcGoogle className="h-5 w-5" />
          </Button>
        )}
        {showGithubProvider && (
          <Button variant='outline' onClick={onGithubProviderSubmit} className="w-full h-10 hover:bg-muted/50 transition-colors" title="Sign in with GitHub">
            <FaGithub className="h-5 w-5" />
          </Button>
        )}
        {showLinkedinProvider && (
          <Button variant='outline' onClick={onLinkedinProviderSubmit} className="w-full h-10 hover:bg-muted/50 transition-colors" title="Sign in with LinkedIn">
            <FaLinkedin className="h-5 w-5 text-[#0a66c2]" />
          </Button>
        )}
        <div className="mt-4 text-center text-sm text-muted-foreground">
          Don&apos;t have an account?{" "}
          <button onClick={() => router.push('/sign-up')} className='font-medium text-primary hover:underline transition-all cursor-pointer'>
            Sign up
          </button>
        </div>
      </CardFooter>
    </Card>
  )
}

export default LoginCard;