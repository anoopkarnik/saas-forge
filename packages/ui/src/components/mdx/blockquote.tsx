import React from 'react'

const blockquote = ({ children }: { children: React.ReactNode }) => {
  return (
    <blockquote className="border-l-[1px] border-primary pl-4 italic text-foreground/60 my-4">
      {children}
    </blockquote>
  )
}

export default blockquote