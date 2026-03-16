
import React from 'react'
import { useNavigate } from 'react-router-dom'
import ResetPasswordPage from '@workspace/ui/blocks/auth/ResetPasswordPage'
import { authClient } from '@workspace/auth/better-auth/auth-client'
import { useSearchParams } from 'react-router-dom'
import ErrorPage from '@workspace/ui/blocks/auth/ErrorPage'

export default function ResetPasswordRoute() {
    const navigate = useNavigate();
    const [searchParams] = useSearchParams();
    const token = searchParams.get('token') || '';

    const [error, setError] = React.useState<string | undefined>();
    const [success, setSuccess] = React.useState<string | undefined>();

    const resetPassword = async (token: string, password: string) => {
        try {
            const { error } = await authClient.resetPassword({ token, newPassword: password })
            if (error) {
                setSuccess(undefined)
                setError(error.message || error.statusText)
                return
            }
            setSuccess("Password reset successfully")
        } catch {
            setError("Something went wrong!")
        }
    }

    if (error) {
        return (
            <ErrorPage
                errorMessage={error}
                onBackToLoginClick={() => navigate('/sign-in')}
            />
        )
    } else {
        return (
            <ResetPasswordPage
                token={token}
                resetFunction={resetPassword}
                errorMessage={error}
                successMessage={success}
                onBackToLoginClick={() => navigate('/sign-in')}
            />
        )
    }
}
