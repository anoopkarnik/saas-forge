'use client'

import { useSearchParams } from 'next/navigation'
import React, { Suspense, useState } from 'react'

import { authClient } from '@workspace/auth/better-auth/auth-client'
import ErrorPage from '@workspace/ui/blocks/auth/ErrorPage'
import ResetPasswordPage from '@workspace/ui/blocks/auth/ResetPasswordPage'
import LoadingCard from '@workspace/ui/components/auth/LoadingCard'
import { useRouter } from 'next/navigation'
import { useTranslations } from 'next-intl'

const ResetPasswordContent = () => {
  const router = useRouter()
  const t = useTranslations()

  const [error, setError] = useState<string | undefined>(undefined)
  const [success, setSuccess] = useState<string | undefined>(undefined)
  const searchParams = useSearchParams();
  const token = searchParams?.get('token');



  const resetPassword = async (token: string, password: string) => {
    try {
      const { error } = await authClient.resetPassword({ token, newPassword: password })
      if (error) {
        setSuccess(undefined)
        setError(error)
        return
      }
      setSuccess(t('auth.reset.success'))
    } catch {
      setError(t('common.somethingWentWrong'))
    }
  }


  if (error) {
    return (
      <ErrorPage
        errorMessage={error}
        onBackToLoginClick={() => router.push('/sign-in')}
      />
    )
  }
  else {
    return (
      <ResetPasswordPage
        token={token as string}
        resetFunction={resetPassword}
        errorMessage={error}
        successMessage={success}
        onBackToLoginClick={() => router.push('/sign-in')}
      />
    )
  }
}

const ResetPassword = () => {
  return (
    <Suspense fallback={<LoadingCard />}>
      <ResetPasswordContent />
    </Suspense>
  )
}

export default ResetPassword
