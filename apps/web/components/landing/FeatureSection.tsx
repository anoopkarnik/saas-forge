import { FeatureSectionProps } from "@/lib/ts-types/landing";
import { Badge } from "@workspace/ui/components/shadcn/badge";
import {
  Card,
  CardContent,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@workspace/ui/components/shadcn/card";
import { useEffect, useState } from "react";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@workspace/ui/components/shadcn/accordion";
import Image from "next/image";

const FeatureSection = ({featureSection}:{featureSection:FeatureSectionProps}) => {

  const [headingArray,setHeadingArray] = useState<string[]>([])
  const [featureImage, setFeatureImage] = useState<number>(0);

  useEffect(()=>{
      if(featureSection.heading){
          setHeadingArray(featureSection.heading.split(" "))
      }
  },[featureSection.heading])
  return (
    <section
      id="features"
      className="container py-24 sm:py-32 relative"
    >
      <h2 className="text-3xl md:text-4xl font-bold text-left leading-tight">
        <span className="bg-gradient-to-b from-primary/60 to-primary text-transparent bg-clip-text">
          {headingArray.slice(0, Math.ceil(headingArray.length / 2)).join(" ")}
        </span>{" "}
        <span>
          {headingArray.slice(Math.ceil(headingArray.length / 2)).join(" ")}
        </span>
      </h2>
      <p className="text-muted-foreground text-xl mb-8 opacity-70">
        {featureSection.description}
      </p>
        <div className="grid grid-cols-2 gap-10">
            <Accordion type="single" collapsible className="" defaultValue="item-1">
                {featureSection.features?.map((feature,index) => (
                    <AccordionItem value={feature.title} key={feature.title} onClick={()=>setFeatureImage(index)}>
                        <AccordionTrigger>{feature.title}</AccordionTrigger>
                        <AccordionContent>
                            {feature.description && <p className="text-muted-foreground">{feature.description}</p>}
                        </AccordionContent>
                    </AccordionItem>
                ))}
            </Accordion>
            <Image 
                src={featureSection.features?.[featureImage]?.imageUrl || "/loading.webp"}
                alt={featureSection.features?.[featureImage]?.title || "Feature Image"}
                width={350}
                height={200}
                className="object-cover rounded-lg"
                loading="lazy"
            />
        </div>
    </section>
  );
};

export default FeatureSection;