"use client";

import { useEffect, useState } from "react";
import {
  Carousel,
  CarouselApi,
  CarouselContent,
  CarouselItem,
  CarouselNext,
  CarouselPrevious,
} from "@workspace/ui/components/shadcn/carousel";
import { Avatar, AvatarFallback, AvatarImage } from "@workspace/ui/components/shadcn/avatar";
import { TestimonialSectionProps } from "@/lib/ts-types/landing";
import { Button } from "@workspace/ui/components/shadcn/button";
import { motion, useReducedMotion } from "framer-motion";
import { ReactElement } from "react";

const TestimonialSection = ({ testimonialSection }: { testimonialSection: TestimonialSectionProps }): ReactElement => {
  const [api, setApi] = useState<CarouselApi>();
  const [playing, setPlaying] = useState(false);
  const reducedMotion = useReducedMotion();

  const [headingArray, setHeadingArray] = useState<string[]>([])
  useEffect(() => {
    if (testimonialSection.heading) {
      setHeadingArray(testimonialSection.heading.split(" "))
    }
  }, [testimonialSection.heading])

  useEffect(() => {
    if (!api || !playing || reducedMotion) return;
    const timer = setInterval(() => {
      if (api.canScrollNext()) api.scrollNext();
      else api.scrollTo(0);
    }, 4000);
    return () => clearInterval(timer);
  }, [api, playing, reducedMotion]);
  useEffect(() => { if (reducedMotion) setPlaying(false); }, [reducedMotion]);

  return (
    <section id="testimonials" className="w-full  py-16 sm:py-24 space-y-8 relative overflow-hidden">
      <div className="container mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex flex-col gap-10">
          <motion.div
            initial={reducedMotion ? false : { opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
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

            <p className="text-xl text-muted-foreground pb-8  mt-4 max-w-2xl">
              {testimonialSection.description}
            </p>
          </motion.div>

          <motion.div
            initial={reducedMotion ? false : { opacity: 0, scale: 0.95 }}
            whileInView={{ opacity: 1, scale: 1 }}
            viewport={{ once: true }}
            transition={{ duration: 0.5, delay: 0.2 }}
          >
            <Carousel setApi={setApi} className="w-full" aria-label="Customer testimonials" onFocusCapture={() => setPlaying(false)} onMouseEnter={() => setPlaying(false)}>
              <CarouselContent>
                {testimonialSection.testimonials?.map((testimonial) => (
                  <CarouselItem className="lg:basis-1/4" key={testimonial.name}>
                    <div className="bg-card border border-border rounded-xl p-6 min-h-[200px] flex flex-col justify-between hover:border-primary/50 transition-colors duration-300">
                      <div className="flex flex-col">
                        <blockquote className="text-lg font-medium tracking-tight text-foreground italic">
                          "{testimonial.comment}"
                        </blockquote>
                      </div>
                      <div className="flex flex-row gap-3 items-center mt-6">
                        <Avatar className="h-10 w-10 overflow-hidden border border-border">
                          <AvatarImage src={testimonial.imageUrl} className="h-full w-full object-cover" />
                          <AvatarFallback className="bg-primary/20 text-primary">{testimonial.name.charAt(0)}</AvatarFallback>
                        </Avatar>
                        <div className="flex flex-col items-start text-">
                          <div className="text-sm font-semibold text-foreground">{testimonial.name}</div>
                          <div className="text-xs text-muted-foreground">{testimonial.position}</div>
                        </div>

                      </div>
                    </div>
                  </CarouselItem>
                ))}
              </CarouselContent>
              <div className="mt-4 flex gap-3">
                <CarouselPrevious className="static size-11 translate-y-0" />
                <CarouselNext className="static size-11 translate-y-0" />
              </div>
            </Carousel>
            <Button type="button" variant="outline" className="mt-3 min-h-11" disabled={!!reducedMotion || !api || (testimonialSection.testimonials?.length ?? 0) < 2} onClick={() => setPlaying(value => !value)} aria-pressed={playing}>
              {playing ? "Pause testimonials" : "Play testimonials"}
            </Button>
          </motion.div>
        </div>
      </div>
      {/* Shadow effect */}
      <div className="shadow "></div>
    </section>
  );
};

export default TestimonialSection;