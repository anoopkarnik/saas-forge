import { useEffect, useState } from "react";
import { PricingSectionProps } from "@/lib/ts-types/landing";
import PricingItem from "./PricingItem";


const PricingSection = ({pricingSection}:{pricingSection:PricingSectionProps}) => {
  const [headingArray,setHeadingArray] = useState<string[]>([])
  useEffect(()=>{
      if(pricingSection.heading){
          setHeadingArray(pricingSection.heading.split(" "))
      }
  },[pricingSection.heading])
  return (
    <section
      id="pricing"
      className="container py-24 sm:py-32"
    >
     <h2 className="text-3xl md:text-4xl font-bold text-left leading-tight">
      <span className="bg-gradient-to-b from-primary/60 to-primary text-transparent bg-clip-text">
        {headingArray.slice(0, Math.ceil(headingArray.length / 2)).join(" ")}
      </span>{" "}
      <span>
        {headingArray.slice(Math.ceil(headingArray.length / 2)).join(" ")}
      </span>
    </h2>
      <h3 className="text-xl text-left text-muted-foreground pt-4 pb-8">
        {pricingSection.description}
      </h3>
      <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
        {pricingSection.plans?.map((pricingPlan) => (
          <PricingItem key={pricingPlan.title} pricingPlan={pricingPlan} />
        ))}
      </div>
    </section>
  );
};

export default PricingSection;