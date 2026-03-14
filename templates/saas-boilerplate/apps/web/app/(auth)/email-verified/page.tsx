'use client'

import VerificationPage from '@workspace/ui/blocks/auth/VerificationPage'
import { useRouter } from 'next/navigation'

const Verification = () => {
  const router = useRouter()


  return (
    <VerificationPage
      errorMessage={"Email Not Verified"}
      successMessage={"Email Verified"}
      onBackToLoginClick={() => router.push('/sign-in')}
    />
  )
}


export default Verification
