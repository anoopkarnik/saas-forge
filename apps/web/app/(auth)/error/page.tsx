"use client"


import React from 'react'
import ErrorCard from '@/components/auth/ErrorCard'
import Quote from '@/components/auth/Quote'

const ErrorTemp = () => {

  return (
    <div className='grid grid-cols-1 lg:grid-cols-2 '>
          <div className='flex items-center justify-center bg-gradient-to-br from-violet-400/30 to-black/90 dark:bg-gradient-to-br'>
              <ErrorCard errorMessage={"Oops! Something went wrong!"}/>
          </div>
          <div className='invisible lg:visible bg-white'>
              <Quote  />
          </div>
    </div>
  )
}

export default ErrorTemp;