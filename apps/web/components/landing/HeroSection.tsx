"use client"
import { ArrowRight, BookIcon } from "lucide-react";
import { Button } from "@workspace/ui/components/shadcn/button";
import { useEffect, useState } from "react";
import { HeroSectionProps } from "@/lib/ts-types/landing";
import { useRouter } from "next/navigation";
import TypewriterComponent from 'typewriter-effect';
import { Carousel, CarouselContent, CarouselItem, CarouselNext, CarouselPrevious } from "@workspace/ui/components/shadcn/carousel";
import { BackgroundBeams } from "@workspace/ui/components/aceternity/background-beams";
import Image from "next/image";
import { ContainerScroll } from "@workspace/ui/components/aceternity/container-scroll-animation";
import { HeroCodeBlock } from "@workspace/ui/components/misc/HeroCodeBlock";
import { motion } from "framer-motion";

const HeroSection = ({ heroSection }: { heroSection: HeroSectionProps }) => {
  const [taglineArray, setTaglineArray] = useState<string[]>([])
  const router = useRouter()
  useEffect(() => {
    if (heroSection.tagline) {
      setTaglineArray(heroSection.tagline.split(" "))
    }
  }, [heroSection.tagline])
  return (
    <section className="container flex flex-col justify-center items-center py-20 md:py-32  gap-10 relative ">

      <div className="text-center space-y-6 lg:mt-28 justify-center flex flex-col items-center">
        <motion.main
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="text-5xl md:text-6xl text-center leading-tight"
        >
          <h1 className="inline-block">
            <span className="bg-gradient-to-r from-[#F596D3] to-[#D247BF] text-transparent bg-clip-text">
              {taglineArray.slice(0, Math.ceil(taglineArray.length / 3)).join(" ")}
            </span>{" "}
            <span>
              {taglineArray
                .slice(Math.ceil(taglineArray.length / 3), Math.ceil((2 * taglineArray.length) / 3))
                .join(" ")}
            </span>{" "}
            <span className="bg-gradient-to-r from-[#61DAFB] via-[#1fc0f1] to-[#03a3d7] text-transparent bg-clip-text">
              {taglineArray.slice(Math.ceil((2 * taglineArray.length) / 3)).join(" ")}
            </span>
          </h1>
        </motion.main>


        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.3, duration: 0.5 }}
          className="text-xl text-zinc-300 md:w-10/12 mx-auto lg:mx-0"
        >
          <TypewriterComponent
            options={{
              strings: heroSection.description,
              autoStart: true,
              loop: true,
            }} />
        </motion.div>
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: 0.5, duration: 0.5 }}
        >
          <HeroCodeBlock

            language="bash"
            code={heroSection.codeSnippet || "Coming Soon"}
          />
        </motion.div>
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.7, duration: 0.5 }}
          className="flex items-center justify-center space-y-4 md:space-y-0 md:space-x-4"
        >

          <Button
            className="flex items-center gap-1"
            variant="secondary"
            size="sm"
            onClick={() => router.push("/landing/doc")}
          >
            <BookIcon size={15} />
            <p className="text-sm">Documentation</p>
          </Button>
          <Button
            className="flex items-center gap-1"
            variant="default"
            size="sm"
            onClick={() => router.push("/sign-up")}
          >
            <p className="text-sm">Getting Started</p>
            <ArrowRight size={15} />
          </Button>
        </motion.div>
      </div>
      {/* Hero cards sections */}
      <div className=" flex justify-center  w-full px-4 group ">
        {/* <div className="absolute inset-0  scale-[0.80] transform rounded-full  bg-gradient-to-r from-[#F596D3] 
      to-[#03a3d7] blur-3xl max-w-5xl top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 " /> */}

        <Carousel className="w-full z-10   ">
          <ContainerScroll titleComponent={<></>}>
            <CarouselContent className="">

              {heroSection.heroImages?.map((image, index) => (
                <CarouselItem key={index} className="flex items-center justify-center relative ">
                  {image.imageUrl ? (
                    <Image
                      src={image.imageUrl}
                      alt={"alt"}
                      width={1920}
                      height={1080}
                      className="rounded-lg mx-auto object-cover h-full aspect-video"
                    />
                  ) : (
                    <div className="w-full aspect-video rounded-lg mx-auto bg-gradient-to-br from-white/5 to-white/0 border border-white/10 backdrop-blur-md flex flex-col items-center justify-center gap-4 group/placeholder">
                      <div className="p-4 rounded-full bg-white/5 group-hover/placeholder:scale-110 transition-transform duration-500">
                        <span className="text-4xl">✨</span>
                      </div>
                      <p className="text-zinc-400 font-light">Add your product screenshots in Notion</p>
                    </div>
                  )}
                  <div className="absolute top-8 left-1/2 -translate-x-1/2 -translate-y-1/2 
                              text-3xl font-light bg-gradient-to-r from-[#F596D3] to-[#03a3d7] text-transparent
                              bg-clip-text group-hover:opacity-100 opacity-0 ">
                    {image.title}
                  </div>
                </CarouselItem>
              ))}
            </CarouselContent>
            <CarouselPrevious />
            <CarouselNext />
          </ContainerScroll>
        </Carousel>

      </div>

      <BackgroundBeams />
    </section>
  );
};

export default HeroSection;