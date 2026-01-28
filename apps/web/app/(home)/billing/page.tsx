
import { Skeleton } from '@workspace/ui/components/shadcn/skeleton'
import React, { Suspense } from 'react'

export default function BillingPage() {
  return (
    <div className='mx-auto p-4 space-y-8 w-full'>
      <h1 className='text-3xl font-bold'>Billing</h1>
      {/* <Suspense fallback={<Skeleton className='h-[166px] w-full'/>}>
        <BalanceCard />
      </Suspense>
      <CreditsPurchase/>
      <Suspense fallback={<Skeleton className='h-[300px] w-full'/>}>
        <CreditsUsageCard/>
      </Suspense>
      <Suspense fallback={<Skeleton className='h-[300px] w-full'/>}>
        <TransactionHistoryCard/>
      </Suspense> */}
    </div>
  )
}