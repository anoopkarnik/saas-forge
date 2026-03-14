'use client'

import { useRouter } from 'next/navigation'
import React, { Suspense, useState } from 'react'

import { authClient } from '@workspace/auth/better-auth/auth-client'
import { z } from 'zod'
import { LoginSchema } from '@workspace/auth/utils/zod'
import LoginPage from '@workspace/ui/blocks/auth/LoginPage'
import LoadingCard from '@workspace/ui/components/auth/LoadingCard'

const LoginContent = () => {
  const router = useRouter()
  const [error, setError] = useState<string | undefined>(undefined)


  const loginWithSocials = async (type: string) => {
    await authClient.signIn.social({
      provider: type as any,
      callbackURL: "/auth-callback"
    })
  }

  const loginWithEmail = async (data: z.infer<typeof LoginSchema>) => {
    const { error } = await authClient.signIn.email({ ...data, callbackUrl: "/", rememberMe: true, })
    if (error) {
      setError(error.message)
    } else {
      router.push("/")
    }
  }

  return (
    <LoginPage
      showEmail={process.env.NEXT_PUBLIC_AUTH_EMAIL === 'true'}
      showGoogleProvider={process.env.NEXT_PUBLIC_AUTH_GOOGLE === 'true'}
      showGithubProvider={process.env.NEXT_PUBLIC_AUTH_GITHUB === 'true'}
      showLinkedinProvider={process.env.NEXT_PUBLIC_AUTH_LINKEDIN === 'true'}
      onEmailSubmit={loginWithEmail}
      onGoogleProviderSubmit={() => loginWithSocials('google')}
      onGithubProviderSubmit={() => loginWithSocials('github')}
      onLinkedinProviderSubmit={() => loginWithSocials('linkedin')}
      onSignUpClick={() => router.push('/sign-up')}
      onForgotPasswordClick={() => router.push('/forgot-password')}
      errorMessage={error}
    />
  )
}

const Login = () => {
  return (
    <Suspense fallback={<LoadingCard />}>
      <LoginContent />
    </Suspense>
  )
}

export default Login
