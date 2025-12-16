"use client"
import FAQSection from '@/components/landing/FAQSection'
import FeatureSection from '@/components/landing/FeatureSection'
import FooterSection from '@/components/landing/FooterSection'
import HeroSection from '@/components/landing/HeroSection'
import NavbarSection from '@/components/landing/NavbarSection'
import PricingSection from '@/components/landing/PricingSection'
import TestimonialSection from '@/components/landing/TestimonialSection'
import { useTRPC } from '@/trpc/client'
import { useSuspenseQuery } from '@tanstack/react-query'
import { Spotlight } from '@workspace/ui/components/aceternity/spotlight-new'
import React from 'react'

const LandingPage = () => {
      const trpc = useTRPC()
      const { data} = useSuspenseQuery(trpc.landing.getLandingInfoFromNotion.queryOptions())
  return (
    <div className='flex flex-col items-center justify-center relative overflow-x-hidden'>
        <NavbarSection navbarSection={data.navbarSection}/>
        <Spotlight />
        <HeroSection heroSection={data.heroSection} />
        <FeatureSection featureSection={data.featureSection} />
        <TestimonialSection testimonialSection={data.testimonialSection}/>
        <PricingSection pricingSection={data.pricingSection} />
        <FAQSection  FAQSection={data.faqSection} />
        <FooterSection  footerSection={data.footerSection} />
    </div>
  )
}

export default LandingPage