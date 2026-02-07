'use client'

import { useSearchParams } from 'next/navigation'
import React, { Suspense,  useState } from 'react'

import { authClient } from '@workspace/auth/better-auth/auth-client'
import ErrorCard from '@/components/auth/ErrorCard'
import Quote from '@/components/auth/Quote'
import ResetPasswordCard from '@/components/auth/ResetPasswordCard'
import LoadingCard from '@/components/auth/LoadingCard'

const ResetPasswordContent = () => {

    const [error, setError] = useState<string | undefined>(undefined)
    const [success, setSuccess] = useState<string | undefined>(undefined)
    const searchParams = useSearchParams();
    const token = searchParams?.get('token');
    


    const resetPassword = async (token:string,password:string) =>{
        try {
            const {error} = await authClient.resetPassword({token,newPassword:password})
            if(error){
                setSuccess(undefined)
                setError(error)
                return
            }
            setSuccess("Password reset successfully")
        } catch  {
            setError("Something went wrong!")
        }
    } 
    

  if (error){
    return (
        <div className='grid grid-cols-1 lg:grid-cols-2 '>
          <div className='flex items-center justify-center bg-gradient-to-br from-primary to-sidebar dark:bg-gradient-to-br'>
              <ErrorCard errorMessage={error}/>
          </div>
          <div className='invisible lg:visible '>
              <Quote />
          </div>
    </div>
    )
    
  }
  else {
    return (
      <div className='min-h-screen grid grid-cols-1 lg:grid-cols-2 '>
      <div className='flex items-center justify-center bg-gradient-to-br from-primary to-sidebar dark:bg-gradient-to-br'>
          <ResetPasswordCard token={token as string} resetFunction={resetPassword} 
          errorMessage={error} successMessage={success}/>
      </div>
      <div className='hidden lg:block'>
          <Quote />
      </div>
  </div>
    )
  }
}

const ResetPassword = () => {
  return (
    <Suspense fallback={<LoadingCard/>}>
      <ResetPasswordContent/>
    </Suspense>
  )
}

export default ResetPassword
