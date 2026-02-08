"use client"
import NavbarSection from "@/components/landing/NavbarSection"
import { useTRPC } from "@/trpc/client"
import { useSuspenseQuery } from "@tanstack/react-query"

const ContactUs = () => {
    const trpc = useTRPC()
    const { data } = useSuspenseQuery(trpc.landing.getLandingInfoFromNotion.queryOptions())

    return (
        <div className="min-h-screen bg-background text-foreground flex flex-col">
            <NavbarSection navbarSection={data.navbarSection} />
            <main className="flex-1 container mx-auto px-4 py-24 flex flex-col items-center justify-center">

                <div className="text-center mb-16 space-y-4">
                    <h1 className="text-4xl md:text-5xl lg:text-6xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-foreground to-foreground/70">
                        Get in Touch
                    </h1>
                    <p className="text-muted-foreground text-lg max-w-2xl mx-auto">
                        We'd love to hear from you. Please reach out with any questions, feedback, or inquiries.
                    </p>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8 w-full max-w-5xl">
                    {/* Contact Card 1: Email */}
                    <div className="p-8 rounded-2xl border bg-card text-card-foreground shadow-sm hover:shadow-md transition-shadow flex flex-col items-center text-center space-y-4">
                        <div className="p-3 bg-primary/10 rounded-full text-primary">
                            <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="lucide lucide-mail"><rect width="20" height="16" x="2" y="4" rx="2" /><path d="m22 7-8.97 5.7a1.94 1.94 0 0 1-2.06 0L2 7" /></svg>
                        </div>
                        <h3 className="text-xl font-semibold">Email Support</h3>
                        <p className="text-muted-foreground text-sm">
                            Our friendly team is here to help.
                        </p>
                        <a href={`mailto:${data.contactUs?.supportEmailAddress}`} className="text-primary font-medium hover:underline">
                            {data.contactUs?.supportEmailAddress}
                        </a>
                    </div>

                    {/* Contact Card 2: Office */}
                    <div className="p-8 rounded-2xl border bg-card text-card-foreground shadow-sm hover:shadow-md transition-shadow flex flex-col items-center text-center space-y-4">
                        <div className="p-3 bg-primary/10 rounded-full text-primary">
                            <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="lucide lucide-map-pin"><path d="M20 10c0 6-9 13-9 13s-9-7-9-13a9 9 0 0 1 18 0Z" /><circle cx="12" cy="10" r="3" /></svg>
                        </div>
                        <h3 className="text-xl font-semibold">Our Office</h3>
                        <p className="text-muted-foreground text-sm">
                            Come say hello at our office HQ.
                        </p>
                        <div className="text-foreground font-medium">
                            {data.contactUs?.address}
                        </div>
                    </div>

                    {/* Contact Card 3: Phone */}
                    <div className="p-8 rounded-2xl border bg-card text-card-foreground shadow-sm hover:shadow-md transition-shadow flex flex-col items-center text-center space-y-4">
                        <div className="p-3 bg-primary/10 rounded-full text-primary">
                            <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="lucide lucide-phone"><path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z" /></svg>
                        </div>
                        <h3 className="text-xl font-semibold">Phone</h3>
                        <p className="text-muted-foreground text-sm">
                            Mon-Fri from 8am to 5pm.
                        </p>
                        <div className="text-foreground font-medium">
                            {data.contactUs?.contactNumber}
                        </div>
                    </div>
                </div>

                <div className="mt-16 pt-8 border-t border-border w-full max-w-2xl text-center text-sm text-muted-foreground">
                    <p>Merchant Legal Entity Name: <span className="text-foreground">{data.contactUs?.companyLegalName}</span></p>
                    <p className="mt-2">Last updated: {data.contactUs?.lastUpdated}</p>
                </div>

            </main>
            {/* Footer could go here if layout allows, but usually ContactUs is main content. 
            Since NavbarSection typically handles global wrapping, we might need manual footer. 
            However, current implementation just didn't have footer. 
            Wait, data.footerSection exists? 
            Currently not used in ContactUs. 
            Let's stick to what was there (Navbar only) but make it look good. 
        */}
        </div>
    )
}

export default ContactUs