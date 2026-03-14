
import React from 'react'
import { useNavigate } from 'react-router-dom'
import RegisterPage from '@workspace/ui/blocks/auth/RegisterPage'
import { authClient } from '@workspace/auth/better-auth/auth-client'
import { z } from 'zod'
import { RegisterSchema } from '@workspace/auth/utils/zod'
import { useSearchParams } from 'react-router-dom'

export default function RegisterRoute() {
    const navigate = useNavigate();
    const [searchParams] = useSearchParams();
    const [urlError, setUrlError] = React.useState('');

    React.useEffect(() => {
        const error = searchParams.get('error')
        if (error === 'OAuthAccountNotLinked') {
            setUrlError('This email is already in use with another provider.')
        }
    }, [searchParams])

    const loginWithSocials = async (type: string) => {
        await authClient.signIn.social({
            provider: type as any,
            callbackURL: "myapp://auth-callback"
        })
    }

    const register = async (data: z.infer<typeof RegisterSchema>) => {
        const result = await authClient.signUp.email(data)
        return result as any;
    }

    return (
        <RegisterPage
            showEmail={import.meta.env.VITE_AUTH_EMAIL === 'true'}
            showGoogleProvider={import.meta.env.VITE_AUTH_GOOGLE === 'true'}
            showGithubProvider={import.meta.env.VITE_AUTH_GITHUB === 'true'}
            showLinkedinProvider={import.meta.env.VITE_AUTH_LINKEDIN === 'true'}
            onEmailSubmit={register}
            onGoogleProviderSubmit={() => loginWithSocials('google')}
            onGithubProviderSubmit={() => loginWithSocials('github')}
            onLinkedinProviderSubmit={() => loginWithSocials('linkedin')}
            onSignInClick={() => navigate('/sign-in')}
            onTermsOfServiceClick={() => { }}
            onPrivacyPolicyClick={() => { }}
            errorMessage={urlError}
        />
    )
}