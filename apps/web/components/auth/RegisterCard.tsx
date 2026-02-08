"use client"
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
import { useRouter } from 'next/navigation';
import { useState } from "react";
import { RegisterSchema } from "@workspace/auth/utils/zod";
import { RegisterCardProps } from "@workspace/auth/utils/typescript";

const RegisterCard = ({ showEmail, showGoogleProvider, showGithubProvider, showLinkedinProvider,
  onEmailSubmit, onGoogleProviderSubmit, onGithubProviderSubmit, onLinkedinProviderSubmit, errorMessage }: RegisterCardProps
) => {
  const form = useForm<z.infer<typeof RegisterSchema>>({
    resolver: zodResolver(RegisterSchema),
    defaultValues: {
      name: '',
      email: '',
      password: '',
      confirmPassword: ''
    },
  })

  const router = useRouter();
  const [isPending, setIsPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  async function handleSubmit(data: z.infer<typeof RegisterSchema>) {
    setIsPending(true)
    const { error } = await onEmailSubmit(data)
    if (error) {
      setError(error)
    }
    else {
      setSuccess("Registration successful! Please verify your email before logging in!")
      setError(null)
    }
    setIsPending(false)
  }
  return (
    <Card className='w-full max-w-md border-border/50 shadow-xl bg-card/50 backdrop-blur-sm'>
      <CardHeader className="space-y-1 pb-6">
        <h2 className='text-3xl font-bold tracking-tight text-center'>Create an account</h2>
        <p className='text-sm text-muted-foreground text-center'>
          Enter your information to get started
        </p>
      </CardHeader>
      {showEmail &&
        <CardContent className="pb-6">
          <Form {...form}>
            <form onSubmit={form.handleSubmit(handleSubmit)} className='space-y-4'>
              {['name', 'email', 'password', 'confirmPassword'].map((field) => (
                <FormField
                  key={field}
                  name={field as keyof z.infer<typeof RegisterSchema>}
                  render={({ field: fieldProps }) => (
                    <FormItem>
                      <FormLabel>
                        {field === 'confirmPassword' ? 'Confirm Password' : field.charAt(0).toUpperCase() + field.slice(1)}
                      </FormLabel>
                      <FormControl>
                        <Input
                          type={field.toLowerCase().includes('password') ? 'password' : field === 'email' ? 'email' : 'text'}
                          placeholder={field === 'confirmPassword' ? '******' : `Enter your ${field}`}
                          autoComplete='off'
                          className="h-10"
                          {...fieldProps}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              ))}
              <FormResult type="error" message={error as string} />
              <FormResult type="success" message={success as string} />
              <Button disabled={isPending} variant="default" className="w-full h-10 font-medium" type="submit" >
                Create Account
              </Button>
            </form>
          </Form>
        </CardContent>}

      {(showGoogleProvider || showGithubProvider || showLinkedinProvider) && (
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
        <div className="grid grid-cols-3 gap-3 w-full">
          {showGoogleProvider && (
            <Button variant='outline' onClick={onGoogleProviderSubmit} className="w-full h-10 hover:bg-muted/50 transition-colors" title="Sign up with Google">
              <FcGoogle className="h-5 w-5" />
            </Button>
          )}
          {showGithubProvider && (
            <Button variant='outline' onClick={onGithubProviderSubmit} className="w-full h-10 hover:bg-muted/50 transition-colors" title="Sign up with GitHub">
              <FaGithub className="h-5 w-5" />
            </Button>
          )}
          {showLinkedinProvider && (
            <Button variant='outline' onClick={onLinkedinProviderSubmit} className="w-full h-10 hover:bg-muted/50 transition-colors" title="Sign up with LinkedIn">
              <FaLinkedin className="h-5 w-5 text-[#0a66c2]" />
            </Button>
          )}
        </div>

        <div className="mt-4 text-center text-sm text-muted-foreground">
          Already have an account?{" "}
          <button onClick={() => router.push('/sign-in')} className='font-medium text-primary hover:underline transition-all cursor-pointer'>
            Log in
          </button>
        </div>

        <p className='text-xs text-center text-muted-foreground mt-2 px-4'>
          By clicking continue, you agree to our{" "}
          <button onClick={() => router.push('/landing/legal/terms-of-service')} className='underline underline-offset-4 hover:text-primary cursor-pointer'>
            Terms of Service
          </button>{" "}
          and{" "}
          <button onClick={() => router.push('/landing/legal/privacy-policy')} className='underline underline-offset-4 hover:text-primary cursor-pointer'>
            Privacy Policy
          </button>
          .
        </p>
      </CardFooter>
    </Card>
  )
}

export default RegisterCard;