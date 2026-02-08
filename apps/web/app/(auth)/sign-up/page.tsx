'use client'

import { useSearchParams } from 'next/navigation'
import React, { Suspense, useEffect, useState } from 'react'

import { authClient } from '@workspace/auth/better-auth/auth-client'
import { z } from 'zod'
import { RegisterSchema } from '@workspace/auth/utils/zod'
import RegisterCard from '@/components/auth/RegisterCard'
import Quote from '@/components/auth/Quote'
import LoadingCard from '@/components/auth/LoadingCard'

const RegisterContent = () => {
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
    <div className='grid grid-cols-1 lg:grid-cols-2 min-h-screen'>
      <div className='flex items-center justify-center bg-gradient-to-br from-primary to-sidebar dark:bg-gradient-to-br p-8'>
        <RegisterCard showEmail={true}
          showGoogleProvider={true} showGithubProvider={true}
          showLinkedinProvider={true} onEmailSubmit={register}
          onGoogleProviderSubmit={() => loginWithSocials('google')}
          onGithubProviderSubmit={() => loginWithSocials('github')}
          onLinkedinProviderSubmit={() => loginWithSocials('linkedin')}
          errorMessage={urlError} />
      </div>
      <div className='hidden lg:block h-full'>
        <Quote />
      </div>
    </div>
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
