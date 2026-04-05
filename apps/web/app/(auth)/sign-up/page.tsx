'use client'

import { useSearchParams } from 'next/navigation'
import React, { Suspense, useEffect, useState } from 'react'

import { authClient } from '@workspace/auth/better-auth/auth-client'
import { z } from 'zod'
import { RegisterSchema } from '@workspace/auth/utils/zod'
import RegisterPage from '@workspace/ui/blocks/auth/RegisterPage'
import LoadingCard from '@workspace/ui/components/auth/LoadingCard'
import { useRouter } from 'next/navigation'

const RegisterContent = () => {
  const router = useRouter()
  const searchParams = useSearchParams()

  const [urlError, setUrlError] = useState('')

  useEffect(() => {
    const error = searchParams.get('error')
    if (error === 'OAuthAccountNotLinked') {
      setUrlError('This email is already in use with another provider.')
    }
  }, [searchParams])

  const loginWithSocials = async (type: string) => {
    await authClient.signIn.social({
      provider: type as any,
      callbackURL: "/auth-callback"
    })
  }

  const register = async (data: z.infer<typeof RegisterSchema>) => {
    const result = await authClient.signUp.email(data)
    return result
  }

  return (
    <RegisterPage
      showEmail={process.env.NEXT_PUBLIC_AUTH_EMAIL === 'true'}
      showGoogleProvider={process.env.NEXT_PUBLIC_AUTH_GOOGLE === 'true'}
      showGithubProvider={process.env.NEXT_PUBLIC_AUTH_GITHUB === 'true'}
      showLinkedinProvider={process.env.NEXT_PUBLIC_AUTH_LINKEDIN === 'true'}
      onEmailSubmit={register}
      onGoogleProviderSubmit={() => loginWithSocials('google')}
      onGithubProviderSubmit={() => loginWithSocials('github')}
      onLinkedinProviderSubmit={() => loginWithSocials('linkedin')}
      onSignInClick={() => router.push('/sign-in')}
      onTermsOfServiceClick={() => router.push('/terms')}
      onPrivacyPolicyClick={() => router.push('/privacy')}
      errorMessage={urlError}
    />
  )
}

const Register = () => {
  return (
    <Suspense fallback={<LoadingCard />}>
      <RegisterContent />
    </Suspense>
  )
}

export default Register
