"use client"
import { usePathname } from "next/navigation"
import Link from "next/link"
import { Breadcrumb, BreadcrumbItem, BreadcrumbLink, BreadcrumbList, BreadcrumbPage, BreadcrumbSeparator } from "@workspace/ui/components/shadcn/breadcrumb"
import React from "react"

export const BreadcrumbsHeader = () => {
  const segments = usePathname().split("/").filter(Boolean)
  return (
    <Breadcrumb>
      <BreadcrumbList>
        <BreadcrumbItem>
          <BreadcrumbLink asChild><Link href="/" className="inline-flex min-h-11 items-center">Home</Link></BreadcrumbLink>
        </BreadcrumbItem>
        {segments.map((segment, index) => (
          <React.Fragment key={index}>
            <BreadcrumbSeparator />
            <BreadcrumbItem>
              {index === segments.length - 1
                ? <BreadcrumbPage className="capitalize">{segment.replaceAll("-", " ").replace(/^./, char => char.toUpperCase())}</BreadcrumbPage>
                : <span className="capitalize">{segment.replaceAll("-", " ").replace(/^./, char => char.toUpperCase())}</span>}
            </BreadcrumbItem>
          </React.Fragment>
        ))}
      </BreadcrumbList>
    </Breadcrumb>
  )
}
