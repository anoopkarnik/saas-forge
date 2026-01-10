"use client"
import {  ArrowBigRight, ArrowRight, BookIcon, CircleArrowRight, LogIn } from "lucide-react";
import { Button } from "@workspace/ui/components/shadcn/button";
import { useEffect, useState } from "react";
import { HeroSectionProps } from "@/lib/ts-types/landing";
import { useRouter } from "next/navigation";
import TypewriterComponent from 'typewriter-effect';
import { Carousel, CarouselContent, CarouselItem, CarouselNext, CarouselPrevious } from "@workspace/ui/components/shadcn/carousel";
import { BackgroundBeams } from "@workspace/ui/components/aceternity/background-beams";
import Image from "next/image";
import { ContainerScroll } from "@workspace/ui/components/aceternity/container-scroll-animation";


const HeroSection = ({heroSection}:{heroSection:HeroSectionProps }) => {
    const [taglineArray,setTaglineArray] = useState<string[]>([])
    const router = useRouter()
    useEffect(()=>{
        if(heroSection.tagline){
            setTaglineArray(heroSection.tagline.split(" "))
        }
    },[heroSection.tagline])
  return (
    <section className="container flex flex-col justify-center items-center py-20 md:py-32  gap-10 relative ">

        <div className="text-center space-y-6 lg:mt-28">
            <main className="text-5xl md:text-6xl text-center leading-tight">
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
            </main>


            <div className="text-xl text-muted-foreground md:w-10/12 mx-auto lg:mx-0">
              <TypewriterComponent 
                options={{
                  strings: heroSection.description,
                  autoStart: true,
                  loop: true,
                }}/>
            </div>

            <div className="flex items-center justify-center space-y-4 md:space-y-0 md:space-x-4">

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
            </div>
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
                            <Image 
                                src={image.imageUrl}
                                alt={"alt"}
                                width={1500}
                                height={450}
                                className="rounded-lg mx-auto object-cover h-full"/>
                            <div className="absolute top-8 left-1/2 -translate-x-1/2 -translate-y-1/2 
                              text-3xl font-light bg-gradient-to-r from-[#F596D3] to-[#03a3d7] text-transparent
                              bg-clip-text group-hover:opacity-100 opacity-0 ">
                              {image.title}
                            </div>
                        </CarouselItem>
                    ))}
                </CarouselContent>
                <CarouselPrevious />
                <CarouselNext/>
            </ContainerScroll>
        </Carousel>

      </div>

      <BackgroundBeams />
    </section>
  );
};

export default HeroSection;