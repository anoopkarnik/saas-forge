import React from 'react'
import { useNavigate } from 'react-router-dom'
import ForgotPasswordPage from '@workspace/ui/blocks/auth/ForgotPasswordPage'
import { authClient } from '@workspace/auth/better-auth/auth-client'

export default function ForgotPasswordRoute() {
    const navigate = useNavigate();
    const [error, setError] = React.useState<string | undefined>();
    const [success, setSuccess] = React.useState<string | undefined>();

    const ResetPasswordFunction = async (email: string) => {
        try {
            const { error } = await authClient.requestPasswordReset({ email, redirectTo: "/reset-password" })
            if (error) {
                setSuccess(undefined)
                setError(error.message || error.statusText)
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
            onBackToLoginClick={() => navigate('/sign-in')}
        />
    )
}