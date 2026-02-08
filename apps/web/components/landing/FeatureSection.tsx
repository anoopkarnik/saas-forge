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
import { motion } from "framer-motion";
import { Layers } from "lucide-react";

const FeatureSection = ({ featureSection }: { featureSection: FeatureSectionProps }) => {

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
      className="container py-24 sm:py-32 relative overflow-hidden"
    >
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true, margin: "-100px" }}
        transition={{ duration: 0.5 }}
      >
        <h2 className="text-3xl md:text-4xl font-bold text-left leading-tight">
          <span className="bg-gradient-to-b from-primary/60 to-primary text-transparent bg-clip-text">
            {headingArray.slice(0, Math.ceil(headingArray.length / 2)).join(" ")}
          </span>{" "}
          <span>
            {headingArray.slice(Math.ceil(headingArray.length / 2)).join(" ")}
          </span>
        </h2>
        <p className="text-zinc-400 text-xl mb-12 opacity-90  mt-4">
          {featureSection.description}
        </p>
      </motion.div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-10 lg:gap-20 items-center">
        <motion.div
          initial={{ opacity: 0, x: -20 }}
          whileInView={{ opacity: 1, x: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.5, delay: 0.2 }}
        >
          <Accordion type="single" collapsible className="w-full" defaultValue="item-0">
            {featureSection.features?.map((feature, index) => (
              <AccordionItem value={`item-${index}`} key={feature.title} onClick={() => setFeatureImage(index)} className="border-white/10">
                <AccordionTrigger className="text-lg hover:text-primary transition-colors">{feature.title}</AccordionTrigger>
                <AccordionContent>
                  {feature.description && <p className="text-zinc-400 leading-relaxed">{feature.description}</p>}
                </AccordionContent>
              </AccordionItem>
            ))}
          </Accordion>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          whileInView={{ opacity: 1, scale: 1 }}
          viewport={{ once: true }}
          transition={{ duration: 0.5, delay: 0.4 }}
          className="relative h-[400px] w-full rounded-2xl overflow-hidden border border-white/10 shadow-2xl bg-zinc-900/50"
        >
          {featureSection.features?.[featureImage]?.imageUrl ? (
            <Image
              src={featureSection.features[featureImage].imageUrl!}
              alt={featureSection.features[featureImage].title || "Feature Image"}
              fill
              className="object-cover transition-opacity duration-500"
            />
          ) : (
            <div className="absolute inset-0 flex flex-col items-center justify-center bg-gradient-to-br from-primary/5 via-transparent to-primary/5">
              <Layers className="w-20 h-20 text-primary/20 mb-4 animate-pulse" />
              <p className="text-zinc-500 font-medium">Visual Preview</p>
            </div>
          )}
        </motion.div>
      </div>
    </section>
  );
};

export default FeatureSection;