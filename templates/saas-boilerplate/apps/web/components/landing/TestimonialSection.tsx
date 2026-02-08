"use client";

import { useEffect, useState } from "react";
import {
  Carousel,
  CarouselApi,
  CarouselContent,
  CarouselItem,
} from "@workspace/ui/components/shadcn/carousel";
import { Avatar, AvatarFallback, AvatarImage } from "@workspace/ui/components/shadcn/avatar";
import { TestimonialSectionProps } from "@/lib/ts-types/landing";
import { motion } from "framer-motion";

const TestimonialSection = ({ testimonialSection }: { testimonialSection: TestimonialSectionProps }) => {
  const [api, setApi] = useState<CarouselApi>();
  const [current, setCurrent] = useState(0);

  const [headingArray, setHeadingArray] = useState<string[]>([])
  useEffect(() => {
    if (testimonialSection.heading) {
      setHeadingArray(testimonialSection.heading.split(" "))
    }
  }, [testimonialSection.heading])

  useEffect(() => {
    if (!api) {
      return;
    }

    setTimeout(() => {
      if (api.selectedScrollSnap() + 1 === api.scrollSnapList().length) {
        setCurrent(0);
        api.scrollTo(0);
      } else {
        api.scrollNext();
        setCurrent(current + 1);
      }
    }, 4000);
  }, [api, current]);

  return (
    <section id="testimonials" className="w-full  py-24 sm:py-32 space-y-8 relative overflow-hidden">
      <div className="container mx-auto">
        <div className="flex flex-col gap-10">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
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

            <p className="text-xl text-zinc-400 pb-8 opacity-90 mt-4 max-w-2xl">
              {testimonialSection.description}
            </p>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            whileInView={{ opacity: 1, scale: 1 }}
            viewport={{ once: true }}
            transition={{ duration: 0.5, delay: 0.2 }}
          >
            <Carousel setApi={setApi} className="w-full">
              <CarouselContent>
                {testimonialSection.testimonials?.map((testimonial) => (
                  <CarouselItem className="lg:basis-1/4" key={testimonial.name}>
                    <div className="bg-zinc-900/50 border border-white/10 rounded-xl p-6 min-h-[200px] flex flex-col justify-between hover:border-primary/50 transition-colors duration-300">
                      <div className="flex flex-col">
                        <h3 className="text-lg font-medium tracking-tight text-zinc-100 italic">
                          "{testimonial.comment}"
                        </h3>
                      </div>
                      <div className="flex flex-row gap-3 items-center mt-6">
                        <Avatar className="h-10 w-10 overflow-hidden border border-white/10">
                          <AvatarImage src={testimonial.imageUrl} className="h-full w-full object-cover" />
                          <AvatarFallback className="bg-primary/20 text-primary">{testimonial.name.charAt(0)}</AvatarFallback>
                        </Avatar>
                        <div className="flex flex-col items-start text-">
                          <div className="text-sm font-semibold text-zinc-200">{testimonial.name}</div>
                          <div className="text-xs text-zinc-400">{testimonial.title}</div>
                        </div>

                      </div>
                    </div>
                  </CarouselItem>
                ))}
              </CarouselContent>
            </Carousel>
          </motion.div>
        </div>
      </div>
      {/* Shadow effect */}
      <div className="shadow "></div>
    </section>
  );
};

export default TestimonialSection;