'use client'

import VerificationPage from '@workspace/ui/blocks/auth/VerificationPage'
import { useRouter } from 'next/navigation'
import { useTranslations } from 'next-intl'

import type { ReactElement } from 'react'

const VerificationTemp = (): ReactElement => {
  const router = useRouter()
  const t = useTranslations('auth.verification')


  return (
    <VerificationPage
      errorMessage={t('notVerified')}
      successMessage={t('verified')}
      onBackToLoginClick={() => router.push('/sign-in')}
    />
  )
}


export default VerificationTemp
