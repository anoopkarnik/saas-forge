'use client'

import { useSearchParams } from 'next/navigation'
import React, { Suspense, useEffect, useState } from 'react'

import { authClient } from '@workspace/auth/better-auth/auth-client'
import { z } from 'zod'
import { RegisterSchema } from '@workspace/auth/utils/zod'
import RegisterPage from '@workspace/ui/blocks/auth/RegisterPage'
import LoadingCard from '@workspace/ui/components/auth/LoadingCard'
import { useRouter } from 'next/navigation'
import { useLocale, useTranslations } from 'next-intl'
import { useTRPC } from '@/trpc/client'
import { useQuery } from '@tanstack/react-query'
import { useSiteConfig } from '@/components/site-config/SiteConfigProvider'

const RegisterContent = () => {
  const router = useRouter()
  const t = useTranslations('auth.register')
  const locale = useLocale()
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
      setUrlError(t('accountNotLinked'))
    }
  }, [searchParams, t])

  const loginWithSocials = async (type: string) => {
    await authClient.signIn.social({
      provider: type as any,
      callbackURL: "/auth-callback"
    })
  }

  const register = async (data: z.infer<typeof RegisterSchema>) => {
    // The locale is saved on the new user, so the verification email is in this language.
    const result = await authClient.signUp.email({ ...data, locale })
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
      errorMessage={blockedByInviteOnly ? t('inviteOnly') : urlError}
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
