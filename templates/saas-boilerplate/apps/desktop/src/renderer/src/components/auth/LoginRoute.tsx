import React from 'react'
import { useNavigate } from 'react-router-dom'
import LoginPage from '@workspace/ui/blocks/auth/LoginPage'
import { authClient } from '@workspace/auth/better-auth/auth-client'
import { z } from 'zod'
import { LoginSchema } from '@workspace/auth/utils/zod'

export default function LoginRoute() {
    const navigate = useNavigate();
    const [error, setError] = React.useState<string | undefined>(undefined);

    const loginWithSocials = async (type: string) => {
        const apiBaseUrl = import.meta.env.VITE_API_URL?.replace('/api/trpc', '') || 'http://localhost:3000';
        await authClient.signIn.social({
            provider: type as any,
            callbackURL: `${apiBaseUrl}/api/auth/desktop-callback`
        });
    }

    const loginWithEmail = async (data: z.infer<typeof LoginSchema>) => {
        try {
            const { error } = await authClient.signIn.email({ ...data, rememberMe: true });
            if (error) {
                setError(error.message || (error as any).statusText || 'Sign-in failed. Please try again.');
            } else {
                navigate("/", { state: { justLoggedIn: true } });
            }
        } catch (e: any) {
            setError(e?.message || 'Sign-in failed. Please try again.');
        }
    }

    return (
        <LoginPage
            showEmail={import.meta.env.VITE_AUTH_EMAIL === 'true'}
            showGoogleProvider={import.meta.env.VITE_AUTH_GOOGLE === 'true'}
            showGithubProvider={import.meta.env.VITE_AUTH_GITHUB === 'true'}
            showLinkedinProvider={import.meta.env.VITE_AUTH_LINKEDIN === 'true'}
            onEmailSubmit={loginWithEmail}
            onGoogleProviderSubmit={() => loginWithSocials('google')}
            onGithubProviderSubmit={() => loginWithSocials('github')}
            onLinkedinProviderSubmit={() => loginWithSocials('linkedin')}
            onSignUpClick={() => navigate('/sign-up')}
            onForgotPasswordClick={() => navigate('/forgot-password')}
            errorMessage={error}
        />
    )
}