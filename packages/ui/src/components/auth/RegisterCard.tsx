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
import { useEffect, useState } from "react";
import { useTranslations } from "use-intl";
import { useAuthSchemas } from "@workspace/ui/hooks/useAuthSchemas";
import { RegisterCardProps } from "@workspace/auth/utils/typescript";

const RegisterCard = ({ showEmail, showGoogleProvider, showGithubProvider, showLinkedinProvider, prefillEmail,
  onEmailSubmit, onGoogleProviderSubmit, onGithubProviderSubmit, onLinkedinProviderSubmit, errorMessage,
  onSignInClick, onTermsOfServiceClick, onPrivacyPolicyClick }: RegisterCardProps
) => {
  const t = useTranslations('auth')
  const { RegisterSchema } = useAuthSchemas()
  const form = useForm<z.infer<typeof RegisterSchema>>({
    resolver: zodResolver(RegisterSchema),
    defaultValues: {
      name: '',
      email: prefillEmail ?? '',
      password: '',
      confirmPassword: ''
    },
  })
  const [isPending, setIsPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  useEffect(() => {
    if (prefillEmail && !form.formState.dirtyFields.email) {
      form.setValue('email', prefillEmail)
    }
  }, [prefillEmail, form])

  async function handleSubmit(data: z.infer<typeof RegisterSchema>) {
    setIsPending(true)
    const { error } = await onEmailSubmit(data)
    if (error) {
      setError(error)
    }
    else {
      setSuccess(t('register.success'))
      setError(null)
    }
    setIsPending(false)
  }
  return (
    <Card className='w-full max-w-md border-border/50 shadow-xl bg-card/50 backdrop-blur-sm'>
      <CardHeader className="space-y-1 ">
        <h1 className='text-3xl font-bold tracking-tight text-center'>{t('register.title')}</h1>
        <p className='text-sm text-muted-foreground text-center'>
          {t('register.subtitle')}
        </p>
      </CardHeader>
      {errorMessage &&
        <CardContent className="pb-0">
          <FormResult type="error" message={errorMessage} />
        </CardContent>}
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
                        {({ name: t('register.name'), email: t('email'), password: t('password'), confirmPassword: t('confirmPassword') } as Record<string, string>)[field]}
                      </FormLabel>
                      <FormControl>
                        <Input
                          type={field.toLowerCase().includes('password') ? 'password' : field === 'email' ? 'email' : 'text'}
                          placeholder={({ name: t('register.namePlaceholder'), email: t('register.emailPlaceholder'), password: t('register.passwordPlaceholder'), confirmPassword: '******' } as Record<string, string>)[field]}
                          autoComplete={field === 'name' ? 'name' : field === 'email' ? 'email' : 'new-password'}
                          className="h-10"
                          readOnly={field === 'email' && !!prefillEmail}
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
                {t('register.submit')}
              </Button>
            </form>
          </Form>
        </CardContent>}

      {(showGoogleProvider || showGithubProvider || showLinkedinProvider) && (showEmail) && (
        <div className="px-6 relative">
          <div className="absolute inset-0 flex items-center px-6">
            <span className="w-full border-t border-border/60" />
          </div>
          <div className="relative flex justify-center text-xs uppercase">
            <span className="px-2 text-muted-foreground">{t('orContinueWith')}</span>
          </div>
        </div>
      )}

      <CardFooter className='flex flex-col gap-3 pt-6'>
        {showGoogleProvider && (
          <Button variant='outline' onClick={onGoogleProviderSubmit} className="w-full h-10 hover:bg-muted/50 transition-colors" title={t('register.withProvider', { provider: 'Google' })}>
            <FcGoogle className="h-5 w-5" />
          </Button>
        )}
        {showGithubProvider && (
          <Button variant='outline' onClick={onGithubProviderSubmit} className="w-full h-10 hover:bg-muted/50 transition-colors" title={t('register.withProvider', { provider: 'GitHub' })}>
            <FaGithub className="h-5 w-5" />
          </Button>
        )}
        {showLinkedinProvider && (
          <Button variant='outline' onClick={onLinkedinProviderSubmit} className="w-full h-10 hover:bg-muted/50 transition-colors" title={t('register.withProvider', { provider: 'LinkedIn' })}>
            <FaLinkedin className="h-5 w-5 text-[#0a66c2]" />
          </Button>
        )}

        <div className="mt-4 text-center text-sm text-muted-foreground">
          {t('register.haveAccount')}{" "}
          <button onClick={onSignInClick} className='font-medium text-primary hover:underline transition-all cursor-pointer'>
            {t('register.logIn')}
          </button>
        </div>

        <p className='text-xs text-center text-muted-foreground mt-2 px-4'>
          {t.rich('register.terms', {
            terms: (chunks) => <button onClick={onTermsOfServiceClick} className='underline underline-offset-4 hover:text-primary cursor-pointer'>{chunks}</button>,
            privacy: (chunks) => <button onClick={onPrivacyPolicyClick} className='underline underline-offset-4 hover:text-primary cursor-pointer'>{chunks}</button>,
          })}
        </p>
      </CardFooter>
    </Card>
  )
}

export default RegisterCard;
