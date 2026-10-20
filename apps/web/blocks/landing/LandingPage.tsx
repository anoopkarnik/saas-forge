"use client"
import dynamic from 'next/dynamic'

const FeatureSection = dynamic(() => import('@/components/landing/FeatureSection'))
const FooterSection = dynamic(() => import('@/components/landing/FooterSection'))
const PricingSection = dynamic(() => import('@/components/landing/PricingSection'))
const TestimonialSection = dynamic(() => import('@/components/landing/TestimonialSection'))
const FAQSection = dynamic(() => import('@/components/landing/FAQSection'))

import HeroSection from '@/components/landing/HeroSection'
import NavbarSection from '@/components/landing/NavbarSection'
import { useTRPC } from '@/trpc/client'
import { useSuspenseQuery } from '@tanstack/react-query'
import { Spotlight } from '@workspace/ui/components/aceternity/spotlight-new'
import React from 'react'

const LandingPage = () => {
  const trpc = useTRPC()
  const { data } = useSuspenseQuery(trpc.landing.getLandingInfo.queryOptions())
  return (
    <div className='flex flex-col items-center justify-center relative overflow-x-hidden'>
      <NavbarSection navbarSection={data.navbarSection} />
      <main id="main-content" tabIndex={-1} className="w-full flex flex-col items-center">
      <Spotlight />
      <HeroSection heroSection={data.heroSection} />
      <FeatureSection featureSection={data.featureSection} />
      <TestimonialSection testimonialSection={data.testimonialSection} />
      {data.pricingSection.plans.length > 0 && <PricingSection pricingSection={data.pricingSection} />}
      <FAQSection FAQSection={data.faqSection} />
      </main>
      <FooterSection footerSection={data.footerSection} />
    </div>
  )
}

export default LandingPage