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
import { motion, useReducedMotion } from "framer-motion";
import { Layers } from "lucide-react";
import { ReactElement } from "react";

const FeatureSection = ({ featureSection }: { featureSection: FeatureSectionProps }): ReactElement => {
  const reducedMotion = useReducedMotion();

  const [headingArray, setHeadingArray] = useState<string[]>([])
  const [featureImage, setFeatureImage] = useState<number>(0);

  useEffect(() => {
    if (featureSection.heading) {
      setHeadingArray(featureSection.heading.split(" "))
    }
  }, [featureSection.heading])
  return (
    <section
      id="features"
      className="container mx-auto px-4 sm:px-6 lg:px-8 py-16 sm:py-24 relative overflow-hidden"
    >
      <motion.div
        initial={reducedMotion ? false : { opacity: 0, y: 20 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true, margin: "-100px" }}
        transition={{ duration: 0.5 }}
      >
        <h2 className="text-3xl md:text-4xl font-bold text-left leading-tight">
          <span className="text-primary">
            {headingArray.slice(0, Math.ceil(headingArray.length / 2)).join(" ")}
          </span>{" "}
          <span>
            {headingArray.slice(Math.ceil(headingArray.length / 2)).join(" ")}
          </span>
        </h2>
        <p className="text-muted-foreground text-xl mb-12   mt-4">
          {featureSection.description}
        </p>
      </motion.div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-10 lg:gap-20 items-center">
        <motion.div
          initial={reducedMotion ? false : { opacity: 0, x: -20 }}
          whileInView={{ opacity: 1, x: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.5, delay: 0.2 }}
        >
          <Accordion type="single" collapsible className="w-full" defaultValue="item-0">
            {featureSection.features?.map((feature, index) => (
              <AccordionItem value={`item-${index}`} key={feature.title} onClick={() => setFeatureImage(index)} className="border-border">
                <AccordionTrigger className="text-lg hover:text-primary transition-colors">{feature.title}</AccordionTrigger>
                <AccordionContent>
                  {feature.description && <p className="text-muted-foreground leading-relaxed">{feature.description}</p>}
                </AccordionContent>
              </AccordionItem>
            ))}
          </Accordion>
        </motion.div>

        <motion.div
          initial={reducedMotion ? false : { opacity: 0, scale: 0.95 }}
          whileInView={{ opacity: 1, scale: 1 }}
          viewport={{ once: true }}
          transition={{ duration: 0.5, delay: 0.4 }}
          className="relative h-[400px] w-full rounded-2xl overflow-hidden border border-border shadow-2xl bg-card"
        >
          {featureSection.features?.map((feature, index) => {
            const isActive = index === featureImage;
            return (
              <div
                key={`feature-img-${index}`}
                className={`absolute inset-0 transition-opacity duration-500 ${isActive ? 'opacity-100 z-10' : 'opacity-0 z-0 pointer-events-none'}`}
              >
                {feature.imageUrl ? (
                  <Image
                    src={feature.imageUrl}
                    alt={feature.title || "Feature Image"}
                    fill
                    sizes="(max-width: 768px) 100vw, 50vw"
                    className="object-cover"
                  />
                ) : (
                  <div className="absolute inset-0 flex flex-col items-center justify-center bg-gradient-to-br from-primary/5 via-transparent to-primary/5 border border-border">
                    <Layers className="w-20 h-20 text-primary/20 mb-4 animate-pulse" />
                    <p className="text-muted-foreground font-medium">Visual Preview</p>
                  </div>
                )}
              </div>
            );
          })}
        </motion.div>
      </div>
    </section>
  );
};

export default FeatureSection;