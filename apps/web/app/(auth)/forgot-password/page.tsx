'use client'

import React, { useState } from 'react'
import { authClient } from '@workspace/auth/better-auth/auth-client'
import ForgotPasswordPage from '@workspace/ui/blocks/auth/ForgotPasswordPage'
import { useRouter } from 'next/navigation'
import { useTranslations } from 'next-intl'

const ForgotPasswordClient = () => {
    const router = useRouter()
    const t = useTranslations()


    const [error, setError] = useState<string | undefined>()
    const [success, setSuccess] = useState<string | undefined>()

    const ResetPasswordFunction = async (email: string) => {
        try {
            const { error } = await authClient.requestPasswordReset({ email, redirectTo: "/reset-password" })
            if (error) {
                setSuccess(undefined)
                setError(error)
                return
            }
            setSuccess(t('auth.forgot.sent'))
        } catch {
            setError(t('common.somethingWentWrong'))
        }
    }


    return (
        <ForgotPasswordPage
            resetFunction={ResetPasswordFunction}
            errorMessage={error}
            successMessage={success}
            onBackToLoginClick={() => router.push('/sign-in')}
        />
    )
}

export default ForgotPasswordClient