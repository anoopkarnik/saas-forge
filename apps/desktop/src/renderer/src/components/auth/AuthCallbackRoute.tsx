import React from 'react'
import { useNavigate } from 'react-router-dom'
import { authClient } from '@workspace/auth/better-auth/auth-client'

export default function AuthCallbackRoute() {
    const navigate = useNavigate();

    React.useEffect(() => {
        const baseURL = import.meta.env.VITE_API_URL?.replace('/api/trpc', '') || 'http://localhost:3000'

        let attempt = 0
        const maxAttempts = 5

        const tryGetSession = (): void => {
            authClient.getSession({ fetchOptions: { baseURL, credentials: 'include' } }).then(({ data }: { data: any }) => {
                if (data?.session) {
                    navigate('/', { replace: true })
                } else if (attempt < maxAttempts) {
                    // Cookie may not be available yet after OAuth redirect — retry
                    attempt++
                    setTimeout(tryGetSession, 500)
                } else {
                    navigate('/error', { replace: true })
                }
            }).catch(() => {
                if (attempt < maxAttempts) {
                    attempt++
                    setTimeout(tryGetSession, 500)
                } else {
                    navigate('/error', { replace: true })
                }
            })
        }

        tryGetSession()
    }, [navigate])

    return <div className="flex h-screen w-full items-center justify-center">Completing sign-in...</div>
}
