'use client'

import React, { useState } from 'react'
import { authClient } from '@workspace/auth/better-auth/auth-client'
import ForgotPasswordPage from '@workspace/ui/blocks/auth/ForgotPasswordPage'
import { useRouter } from 'next/navigation'

const ForgotPasswordClient = () => {
    const router = useRouter()


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
            setSuccess("Check your email for the reset link")
        } catch {
            setError("Something went wrong!")
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