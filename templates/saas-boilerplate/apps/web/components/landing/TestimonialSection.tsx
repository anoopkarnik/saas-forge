"use client";

import { useTranslations } from "next-intl";
import { useEffect, useRef, useState } from "react";
import {
  Carousel,
  CarouselContent,
  CarouselItem,
  type CarouselApi,
} from "@workspace/ui/components/shadcn/carousel";
import {
  Avatar,
  AvatarFallback,
  AvatarImage,
} from "@workspace/ui/components/shadcn/avatar";
import { TestimonialSectionProps } from "@/lib/ts-types/landing";
import { motion, useInView, useReducedMotion } from "framer-motion";
import { ReactElement } from "react";

const TestimonialSection = ({
  testimonialSection,
}: {
  testimonialSection: TestimonialSectionProps;
}): ReactElement => {
  const t = useTranslations("landing");
  const reducedMotion = useReducedMotion();
  const [api, setApi] = useState<CarouselApi>();
  const [hovered, setHovered] = useState(false);
  const [interacted, setInteracted] = useState(false);
  const carouselRef = useRef<HTMLDivElement>(null);
  const inView = useInView(carouselRef, { amount: 0.25 });
  const headingArray = testimonialSection.heading?.split(" ") ?? [];
  const testimonialCount = testimonialSection.testimonials?.length ?? 0;

  useEffect(() => {
    if (
      !api ||
      reducedMotion !== false ||
      !inView ||
      hovered ||
      interacted ||
      testimonialCount < 2
    )
      return;

    const timer = setInterval(() => {
      if (document.hidden || api.scrollSnapList().length < 2) return;
      if (api.canScrollNext()) api.scrollNext();
      else api.scrollTo(0);
    }, 4000);

    return () => clearInterval(timer);
  }, [api, reducedMotion, inView, hovered, interacted, testimonialCount]);

  return (
    <section
      id="testimonials"
      className="w-full py-24 sm:py-32 space-y-8 relative overflow-hidden"
    >
      <div className="container mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex flex-col gap-10">
          <motion.div
            initial={reducedMotion ? false : { opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.5 }}
          >
            <h2 className="text-3xl md:text-4xl font-bold text-left leading-tight">
              <span className="bg-gradient-to-b from-primary/60 to-primary text-transparent bg-clip-text">
                {headingArray
                  .slice(0, Math.ceil(headingArray.length / 2))
                  .join(" ")}
              </span>{" "}
              <span>
                {headingArray
                  .slice(Math.ceil(headingArray.length / 2))
                  .join(" ")}
              </span>
            </h2>

            <p className="text-xl text-muted-foreground pb-8 opacity-90 mt-4 max-w-2xl">
              {testimonialSection.description}
            </p>
          </motion.div>

          <motion.div
            ref={carouselRef}
            initial={reducedMotion ? false : { opacity: 0, scale: 0.95 }}
            whileInView={{ opacity: 1, scale: 1 }}
            viewport={{ once: true }}
            transition={{ duration: 0.5, delay: 0.2 }}
          >
            <Carousel
              setApi={setApi}
              opts={{ align: "start" }}
              className="w-full rounded-xl focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-4 focus-visible:ring-offset-background"
              aria-label={t("testimonials.label")}
              tabIndex={0}
              onMouseEnter={() => setHovered(true)}
              onMouseLeave={() => setHovered(false)}
              onFocusCapture={() => setInteracted(true)}
              onPointerDown={() => setInteracted(true)}
            >
              <CarouselContent
                aria-live={interacted || reducedMotion ? "polite" : "off"}
              >
                {testimonialSection.testimonials?.map((testimonial) => (
                  <CarouselItem
                    key={testimonial.id}
                    className="md:basis-1/2 lg:basis-1/4"
                  >
                    <figure className="bg-card/50 border border-border rounded-xl p-6 min-h-[200px] flex flex-col justify-between hover:border-primary/50 transition-colors duration-300 motion-reduce:transition-none">
                      <blockquote className="text-lg font-medium tracking-tight text-foreground italic">
                        {"“"}
                        {testimonial.comment
                          .trim()
                          .replace(/^["“”]+|["“”]+$/g, "")
                          .trim()}
                        {"”"}
                      </blockquote>
                      <figcaption className="flex gap-3 items-center mt-6">
                        <Avatar className="h-10 w-10 shrink-0 overflow-hidden border border-border">
                          <AvatarImage
                            src={testimonial.imageUrl}
                            alt=""
                            className="h-full w-full object-cover"
                          />
                          <AvatarFallback className="bg-primary/20 text-primary">
                            {testimonial.name.charAt(0)}
                          </AvatarFallback>
                        </Avatar>
                        <div className="min-w-0">
                          <div className="text-sm font-semibold text-foreground">
                            {testimonial.name}
                          </div>
                          <div className="text-xs text-muted-foreground">
                            {testimonial.position}
                          </div>
                        </div>
                      </figcaption>
                    </figure>
                  </CarouselItem>
                ))}
              </CarouselContent>
            </Carousel>
          </motion.div>
        </div>
      </div>
    </section>
  );
};

export default TestimonialSection;
