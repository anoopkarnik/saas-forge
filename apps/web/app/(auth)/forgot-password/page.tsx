'use client'

import React, { useState } from 'react'
import { authClient } from '@workspace/auth/better-auth/auth-client'
import ForgotPasswordCard from '@/components/auth/ForgotPasswordCard'
import Quote from '@/components/auth/Quote'

const ForgotPasswordClient = () => {


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
        <div className='min-h-screen grid grid-cols-1 lg:grid-cols-2 '>
            <div className='flex items-center justify-center bg-gradient-to-br from-primary to-sidebar dark:bg-gradient-to-br'>
                <ForgotPasswordCard resetFunction={ResetPasswordFunction} errorMessage={error} successMessage={success} />
            </div>
            <div className='hidden lg:block '>
                <Quote />
            </div>
        </div>
    )
}

export default ForgotPasswordClient