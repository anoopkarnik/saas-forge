"use client"
import NavbarSection from "@/components/landing/NavbarSection"
import { useTRPC } from "@/trpc/client"
import { useSuspenseQuery } from "@tanstack/react-query"

const CancellationRefundPolicies = () => {
    const trpc = useTRPC()
    const { data } = useSuspenseQuery(trpc.landing.getLandingInfoFromNotion.queryOptions())
    return (
        <div className='flex flex-col items-center justify-center relative overflow-x-hidden'>
            <NavbarSection navbarSection={data.navbarSection} />
            <div className='p-6 mx-[20%]'>
                <h2 className='text-title-h1'>Cancellation and Refund Policy</h2>

                <p className="text-xs opacity-50 mb-6">Last updated: {data.cancellationRefundPolicies.lastUpdated}</p>
                <p className="mb-4">Thank you for using {data.cancellationRefundPolicies.siteName}.</p>
                <p className="mb-4">This Cancellation and Refund Policy outlines our policy regarding the purchase of credits on our platform.</p>

                <h2 className="text-title-h2 mt-6 mb-2">Interpretation and Definitions</h2>

                <h3 className="text-title-h3 mt-4 mb-2">Interpretation</h3>
                <p className="mb-4">The words of which the initial letter is capitalized have meanings defined under the following conditions. The following definitions shall have the same meaning regardless of whether they appear in singular or in plural.</p>

                <h3 className="text-title-h3 mt-4 mb-2">Definitions</h3>
                <p className="mb-4">For the purposes of this Cancellation and Refund Policy:</p>

                <ul className="list-disc ml-8 mb-4">
                    <li className="mb-2">
                        <p><strong>Company</strong> (referred to as either &quot;the Company&quot;, &quot;We&quot;, &quot;Us&quot; or &quot;Our&quot; in this Agreement) refers to {data.cancellationRefundPolicies.companyLegalName}.</p>
                    </li>
                    <li className="mb-2">
                        <p><strong>Credits</strong> refer to the digital currency units offered for sale on the Service that can be used to access features and functionality within the platform.</p>
                    </li>
                    <li className="mb-2">
                        <p><strong>Service</strong> refers to the Website and all associated services.</p>
                    </li>
                    <li className="mb-2">
                        <p><strong>Website</strong> refers to {data.cancellationRefundPolicies.siteName}, accessible from <a href={data.cancellationRefundPolicies.websiteUrl} rel="external nofollow noopener" target="_blank">{data.cancellationRefundPolicies.websiteUrl}</a></p>
                    </li>
                    <li className="mb-2">
                        <p><strong>You</strong> means the individual accessing or using the Service, or the company, or other legal entity on behalf of which such individual is accessing or using the Service, as applicable.</p>
                    </li>
                </ul>

                <h2 className="text-title-h2 mt-6 mb-2">Nature of Credits</h2>
                <p className="mb-4">Credits purchased on {data.cancellationRefundPolicies.siteName} are digital goods that are delivered instantly upon successful payment. Once credits are added to your account, they are immediately available for use.</p>

                <h2 className="text-title-h2 mt-6 mb-2">No Refund Policy</h2>
                <p className="mb-4"><strong>All credit purchases are final and non-refundable.</strong></p>
                <p className="mb-4">Due to the digital nature of our credits and their instant delivery, we do not offer refunds, returns, or exchanges for credit purchases under any circumstances. This includes but is not limited to:</p>

                <ul className="list-disc ml-8 mb-4">
                    <li className="mb-2">Accidental purchases</li>
                    <li className="mb-2">Change of mind after purchase</li>
                    <li className="mb-2">Unused credits</li>
                    <li className="mb-2">Credits purchased in error</li>
                    <li className="mb-2">Dissatisfaction with the Service</li>
                </ul>

                <p className="mb-4">By purchasing credits, you acknowledge and agree that all sales are final.</p>

                <h2 className="text-title-h2 mt-6 mb-2">Payment Issues</h2>
                <p className="mb-4">If you experience a payment issue where you were charged but did not receive your credits, please contact us immediately at {data.cancellationRefundPolicies.supportEmailAddress} with your transaction details. We will investigate and resolve legitimate payment processing errors.</p>

                <h2 className="text-title-h2 mt-6 mb-2">Account Termination</h2>
                <p className="mb-4">If your account is terminated for any reason, any remaining credits in your account will be forfeited and no refund will be provided.</p>

                <h2 className="text-title-h2 mt-6 mb-2">Exceptions</h2>
                <p className="mb-4">The only exception to this no-refund policy is if required by applicable law in your jurisdiction. In such cases, refunds will be provided only to the extent required by law.</p>

                <h3 className="text-title-h3 mt-4 mb-2">Contact Us</h3>
                <p className="mb-4">If you have any questions about our Cancellation and Refund Policy, please contact us:</p>
                <ul className="list-disc ml-8 mb-4">
                    <li className="mb-2">By email: {data.cancellationRefundPolicies.supportEmailAddress}</li>
                </ul>
            </div>
        </div>
    )
}

export default CancellationRefundPolicies