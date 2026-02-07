'use client'

import React from 'react'
import VerificationCard from '@/components/auth/VerificationCard'
import Quote from '@/components/auth/Quote'


const Verification = () => {


  return (
    <div className='min-h-screen grid grid-cols-1 lg:grid-cols-2 '>
        <div className='flex items-center justify-center bg-gradient-to-br from-primary to-black dark:bg-gradient-to-br'>
            <VerificationCard errorMessage={"Email Not Verified"} successMessage={"Email Verified"}/>
        </div>
        <div className='hidden lg:block bg-white'>
            <Quote/>
        </div>
    </div>
  )
}


export default Verification
