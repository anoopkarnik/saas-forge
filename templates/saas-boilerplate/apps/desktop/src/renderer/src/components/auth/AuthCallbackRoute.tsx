import React from 'react'
import { useNavigate } from 'react-router-dom'
import { authClient } from '@workspace/auth/better-auth/auth-client'

export default function AuthCallbackRoute() {
    const navigate = useNavigate();

    React.useEffect(() => {
        let attempt = 0
        const maxAttempts = 5

        const tryGetSession = (): void => {
            // Don't pass baseURL in fetchOptions — it overrides better-fetch's URL
            // construction and strips the /api/auth prefix. The authClient already
            // has the correct baseURL configured.
            authClient.getSession().then(({ data, error }: { data: any; error: any }) => {

                if (data?.session) {
                    navigate('/', { replace: true })
                } else if (attempt < maxAttempts) {
                    attempt++
                    setTimeout(tryGetSession, 500)
                } else {
                    console.error('[auth-callback] All attempts failed — no session found')
                    navigate('/error', { replace: true })
                }
            }).catch((err: any) => {
                console.error(`[auth-callback] getSession error (attempt ${attempt + 1}):`, err)
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
