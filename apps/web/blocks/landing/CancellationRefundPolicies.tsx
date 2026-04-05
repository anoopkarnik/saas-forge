"use client"
import React from 'react'
import { useTRPC } from '@/trpc/client'
import { useSuspenseQuery } from '@tanstack/react-query'
import LegalPageLayout from '@/components/landing/LegalPageLayout'

const CancellationRefundPolicies = () => {
    const trpc = useTRPC()
    const { data } = useSuspenseQuery(trpc.landing.getLandingInfoFromNotion.queryOptions())

    const tableOfContents = [
        { id: "interpretation", label: "Interpretation" },
        { id: "definitions", label: "Definitions" },
        { id: "nature-of-credits", label: "Nature of Credits" },
        { id: "no-refund-policy", label: "No Refund Policy" },
        { id: "payment-issues", label: "Payment Issues" },
        { id: "account-termination", label: "Account Termination" },
        { id: "exceptions", label: "Exceptions" },
        { id: "contact-us", label: "Contact Us" },
    ];

    return (
        <LegalPageLayout
            title="Cancellation and Refund Policy"
            lastUpdated={data.cancellationRefundPolicies.lastUpdated}
            navbarSection={data.navbarSection}
            footerSection={data.footerSection}
            tableOfContents={tableOfContents}
        >
            <p className="mb-4 lead">
                Thank you for using {data.cancellationRefundPolicies.siteName}. This Cancellation and Refund Policy outlines our policy regarding the purchase of credits on our platform.
            </p>

            <h2 id="interpretation">Interpretation and Definitions</h2>

            <h3 id="definitions">Interpretation</h3>
            <p className="mb-4">The words of which the initial letter is capitalized have meanings defined under the following conditions. The following definitions shall have the same meaning regardless of whether they appear in singular or in plural.</p>

            <h3>Definitions</h3>
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

            <h2 id="nature-of-credits">Nature of Credits</h2>
            <p className="mb-4">Credits purchased on {data.cancellationRefundPolicies.siteName} are digital goods that are delivered instantly upon successful payment. Once credits are added to your account, they are immediately available for use.</p>

            <h2 id="no-refund-policy">No Refund Policy</h2>
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

            <h2 id="payment-issues">Payment Issues</h2>
            <p className="mb-4">If you experience a payment issue where you were charged but did not receive your credits, please contact us immediately at {data.cancellationRefundPolicies.supportEmailAddress} with your transaction details. We will investigate and resolve legitimate payment processing errors.</p>

            <h2 id="account-termination">Account Termination</h2>
            <p className="mb-4">If your account is terminated for any reason, any remaining credits in your account will be forfeited and no refund will be provided.</p>

            <h2 id="exceptions">Exceptions</h2>
            <p className="mb-4">The only exception to this no-refund policy is if required by applicable law in your jurisdiction. In such cases, refunds will be provided only to the extent required by law.</p>

            <h2 id="contact-us">Contact Us</h2>
            <p className="mb-4">If you have any questions about our Cancellation and Refund Policy, please contact us:</p>
            <ul className="list-disc ml-8 mb-4">
                <li className="mb-2">By email: {data.cancellationRefundPolicies.supportEmailAddress}</li>
            </ul>
        </LegalPageLayout>
    )
}

export default CancellationRefundPolicies