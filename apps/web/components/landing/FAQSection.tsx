import { FAQSectionProps } from "@/lib/ts-types/landing";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@workspace/ui/components/shadcn/accordion";
import { useEffect, useState } from "react";
import { motion, useReducedMotion } from "framer-motion";
import { ReactElement } from "react";


const FAQ = ({ FAQSection }: { FAQSection: FAQSectionProps }): ReactElement => {
  const reducedMotion = useReducedMotion();

  const [headingArray, setHeadingArray] = useState<string[]>([])
  useEffect(() => {
    if (FAQSection.heading) {
      setHeadingArray(FAQSection.heading.split(" "))
    }
  }, [FAQSection.heading])

  return (
    <section
      id="faq"
      className="container mx-auto px-4 sm:px-6 lg:px-8 py-16 sm:py-24"
    >
      <motion.h2
        initial={reducedMotion ? false : { opacity: 0, y: 20 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true }}
        transition={{ duration: 0.5 }}
        className="text-3xl md:text-4xl font-bold text-left leading-tight mb-12"
      >
        <span className="text-primary">
          {headingArray.slice(0, Math.ceil(headingArray.length / 2)).join(" ")}
        </span>{" "}
        <span>
          {headingArray.slice(Math.ceil(headingArray.length / 2)).join(" ")}
        </span>
      </motion.h2>

      <Accordion
        type="single"
        collapsible
        className="w-full AccordionRoot space-y-4"
      >
        {FAQSection.faqs?.map((faq, index) => (
          <motion.div
            key={faq.question}
            initial={reducedMotion ? false : { opacity: 0, y: 10 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.3, delay: index * 0.1 }}
          >
            <AccordionItem
              value={faq.question}
              className="border border-border bg-card rounded-lg px-4"
            >
              <AccordionTrigger className="text-left py-4 hover:no-underline hover:text-primary transition-colors">
                {faq.question}
              </AccordionTrigger>

              <AccordionContent className="text-muted-foreground pb-4">{faq.answer}</AccordionContent>
            </AccordionItem>
          </motion.div>
        ))}
      </Accordion>
    </section>
  );
};

export default FAQ;