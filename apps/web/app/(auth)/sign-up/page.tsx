'use client'

import { useSearchParams } from 'next/navigation'
import React, { Suspense, useEffect, useState } from 'react'

import { authClient } from '@workspace/auth/better-auth/auth-client'
import { z } from 'zod'
import { RegisterSchema } from '@workspace/auth/utils/zod'
import RegisterPage from '@workspace/ui/blocks/auth/RegisterPage'
import LoadingCard from '@workspace/ui/components/auth/LoadingCard'
import { useRouter } from 'next/navigation'
import { useTRPC } from '@/trpc/client'
import { useQuery } from '@tanstack/react-query'
import { useSiteConfig } from '@/components/site-config/SiteConfigProvider'

const RegisterContent = () => {
  const router = useRouter()
  const searchParams = useSearchParams()

  const inviteToken = searchParams.get('invite') ?? ''
  const invitedEmail = searchParams.get('email') ?? ''

  const trpc = useTRPC()
  const config = useSiteConfig()
  const inviteQuery = useQuery(
    trpc.admin.invites.validate.queryOptions(
      { token: inviteToken },
      { enabled: !!inviteToken },
    ),
  )

  const isInviteOnly = config['registration.mode'] === 'INVITE_ONLY'
  const hasValidInvite = !!inviteQuery.data?.valid
  const blockedByInviteOnly = isInviteOnly && !hasValidInvite

  const [urlError, setUrlError] = useState('')

  useEffect(() => {
    const error = searchParams.get('error')
    if (error === 'OAuthAccountNotLinked') {
      setUrlError('This email is already in use with another provider.')
    }
  }, [searchParams])

  const loginWithSocials = async (type: string) => {
    await authClient.signIn.social({
      provider: type as any,
      callbackURL: "/auth-callback"
    })
  }

  const register = async (data: z.infer<typeof RegisterSchema>) => {
    const result = await authClient.signUp.email(data)
    return result
  }

  return (
    <RegisterPage
      showEmail={config['auth.email.visible'] && !blockedByInviteOnly}
      showGoogleProvider={config['auth.google.visible'] && !blockedByInviteOnly}
      showGithubProvider={config['auth.github.visible'] && !blockedByInviteOnly}
      showLinkedinProvider={config['auth.linkedin.visible'] && !blockedByInviteOnly}
      prefillEmail={hasValidInvite ? (inviteQuery.data?.email ?? invitedEmail) : ''}
      onEmailSubmit={register}
      onGoogleProviderSubmit={() => loginWithSocials('google')}
      onGithubProviderSubmit={() => loginWithSocials('github')}
      onLinkedinProviderSubmit={() => loginWithSocials('linkedin')}
      onSignInClick={() => router.push('/sign-in')}
      onTermsOfServiceClick={() => router.push('/terms')}
      onPrivacyPolicyClick={() => router.push('/privacy')}
      errorMessage={blockedByInviteOnly ? 'Sign-ups are invite-only. Please use your invitation link.' : urlError}
    />
  )
}

const Register = () => {
  return (
    <Suspense fallback={<LoadingCard />}>
      <RegisterContent />
    </Suspense>
  )
}

export default Register
