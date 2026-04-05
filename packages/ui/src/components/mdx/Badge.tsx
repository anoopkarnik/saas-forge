import React from 'react'
import {Badge} from '@workspace/ui/components/shadcn/badge'

const MdxBadge = ({children}:{children:React.ReactNode}) => {
  return (
    <Badge className="my-2 inline-block">{children}</Badge>
  )
}

export default MdxBadge