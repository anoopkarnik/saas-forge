"use client"
import type { ReactElement, ReactNode } from "react"
import NavbarSection from "@/components/landing/NavbarSection"
import FooterSection from "@/components/landing/FooterSection"
import { useTRPC } from "@/trpc/client"
import { useSuspenseQuery } from "@tanstack/react-query"

// Landing navbar and footer around the server-rendered blog pages.
const BlogShell = ({ children }: { children: ReactNode }): ReactElement => {
    const trpc = useTRPC()
    const { data } = useSuspenseQuery(trpc.landing.getLandingInfo.queryOptions())

    return (
        <div className="min-h-screen bg-background text-foreground flex flex-col">
            <NavbarSection navbarSection={data.navbarSection} />
            <main id="main-content" tabIndex={-1} className="flex-1 w-full pt-24 pb-16">
                {children}
            </main>
            <FooterSection footerSection={data.footerSection} />
        </div>
    )
}

export default BlogShell
