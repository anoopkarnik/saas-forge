"use client"
import NavbarSection from "@/components/landing/NavbarSection"
import { useTRPC } from "@/trpc/client"
import { useSuspenseQuery } from "@tanstack/react-query"

const ContactUs = () => {
        const trpc = useTRPC()
        const { data} = useSuspenseQuery(trpc.landing.getLandingInfoFromNotion.queryOptions())
  return (
        <div className='flex flex-col items-center justify-center relative overflow-x-hidden'>
            <NavbarSection navbarSection={data.navbarSection}/>
            <div className='p-6 mx-[20%]'>
                <h2 className='text-title-h1'>Contact Us</h2>
                <p className="text-xs opacity-50 mb-6">Last updated: {data.contactUs?.lastUpdated}</p>
                <p className="mb-4">Merchant Legal entiy name: {data.contactUs?.companyLegalName}</p>
                <p className="mb-4">Registered Address: {data.contactUs?.address}</p>
                <p className="mb-4">Operational Address: {data.contactUs?.address}</p>
                <p className="mb-4">Contact Number: {data.contactUs?.contactNumber}</p>
                <p className="mb-4"> Email Id: &nbsp; 
                <a href={`https://mail.google.com/mail?view=cm&fs=1&to=${data.contactUs?.supportEmailAddress}&su=SupportEmail`} className='text-blue-500 cursor-pointer'>
                    {data.contactUs?.supportEmailAddress}
                </a>
                </p>
            </div>
        </div>
  )
}

export default ContactUs