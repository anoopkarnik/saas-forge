import { FAQSectionProps } from "@/lib/ts-types/landing";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@workspace/ui/components/shadcn/accordion";
import { useEffect, useState } from "react";
import { motion } from "framer-motion";


const FAQ = ({ FAQSection }: { FAQSection: FAQSectionProps }) => {

  const [headingArray, setHeadingArray] = useState<string[]>([])
  useEffect(() => {
    if (FAQSection.heading) {
      setHeadingArray(FAQSection.heading.split(" "))
    }
  }, [FAQSection.heading])

  return (
    <section
      id="faq"
      className="container py-24 sm:py-32"
    >
      <motion.h2
        initial={{ opacity: 0, y: 20 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true }}
        transition={{ duration: 0.5 }}
        className="text-3xl md:text-4xl font-bold text-left leading-tight mb-12"
      >
        <span className="bg-gradient-to-b from-primary/60 to-primary text-transparent bg-clip-text">
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
            initial={{ opacity: 0, y: 10 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.3, delay: index * 0.1 }}
          >
            <AccordionItem
              value={faq.question}
              className="border border-white/5 bg-zinc-900/30 rounded-lg px-4"
            >
              <AccordionTrigger className="text-left py-4 hover:no-underline hover:text-primary transition-colors">
                {faq.question}
              </AccordionTrigger>

              <AccordionContent className="text-zinc-400 pb-4">{faq.answer}</AccordionContent>
            </AccordionItem>
          </motion.div>
        ))}
      </Accordion>
    </section>
  );
};

export default FAQ;