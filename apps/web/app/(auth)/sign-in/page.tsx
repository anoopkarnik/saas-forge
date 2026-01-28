'use client'

import {  useRouter } from 'next/navigation'
import React, { Suspense, useState } from 'react'

import { authClient } from '@workspace/auth/better-auth/auth-client'
import { z } from 'zod'
import { LoginSchema } from '@workspace/auth/utils/zod'
import LoginCard from '@/components/auth/LoginCard'
import Quote from '@/components/auth/Quote'
import LoadingCard from '@/components/auth/LoadingCard'
import { waitFor } from '@/lib/helper/waitFor'


const LoginContent = () => {
  const router = useRouter()
  const [error, setError] = useState<string | undefined>(undefined)


  const loginWithSocials = async (type: string) => {
    const {error} = await authClient.signIn.social({provider: type})
    if (error) {
      setError(error.message)
    } else {
      router.push("/")
    }
  }

  const loginWithEmail = async (data:  z.infer<typeof LoginSchema>) => {
    const {error} = await authClient.signIn.email({...data, callbackUrl: "/", rememberMe: true,})
    if (error) {
      setError(error.message)
    }else {
      router.push("/")
    }
  }

  return (
    <div className='min-h-screen grid grid-cols-1 lg:grid-cols-2 '>
        <div className='flex items-center justify-center bg-gradient-to-br from-primary to-sidebar dark:bg-gradient-to-br'>
            <LoginCard showEmail={true} showGoogleProvider={true} 
            showGithubProvider={true}
              showLinkedinProvider={true} onEmailSubmit={loginWithEmail} 
              onGoogleProviderSubmit={()=>loginWithSocials('google')} 
              onGithubProviderSubmit={()=>loginWithSocials('github')} 
              onLinkedinProviderSubmit={()=>loginWithSocials('linkedin')} 
              errorMessage={error}/>
        </div>
        <div className='hidden lg:block '>
            <Quote/>
        </div>
    </div>
  )
}

const Login = () => {
  return (
    <Suspense fallback={<LoadingCard/>}>
      <LoginContent />
    </Suspense>
  )
}

export default Login
