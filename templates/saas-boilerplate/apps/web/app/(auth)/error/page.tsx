"use client"


import ErrorPage from '@workspace/ui/blocks/auth/ErrorPage'
import { useRouter } from 'next/navigation'

const ErrorTemp = () => {
  const router = useRouter()

  return (
    <ErrorPage
      errorMessage={"Oops! Something went wrong!"}
      onBackToLoginClick={() => router.push('/sign-in')}
    />
  )
}

export default ErrorTemp;