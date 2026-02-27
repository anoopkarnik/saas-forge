"use client"

import { Button } from '@workspace/ui/components/shadcn/button'
import React from 'react'

const InvoiceBtn = ({ receiptUrl }: { receiptUrl: string | null }) => {

  if (!receiptUrl) return null;

  return (
    <a href={receiptUrl} target='_blank'>
      <Button variant={"ghost"} size={"sm"} className='text-xs gap-2 text-muted-foreground px-1' >
        Invoice
      </Button>
    </a>
  )
}

export default InvoiceBtn