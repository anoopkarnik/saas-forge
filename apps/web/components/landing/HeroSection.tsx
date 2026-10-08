"use client"
import { ArrowRight, BookIcon } from "lucide-react";
import { Button } from "@workspace/ui/components/shadcn/button";
import { useEffect, useState } from "react";
import { HeroSectionProps } from "@/lib/ts-types/landing";
import { useRouter } from "next/navigation";
import dynamic from "next/dynamic";
import { Carousel, CarouselContent, CarouselItem, CarouselNext, CarouselPrevious } from "@workspace/ui/components/shadcn/carousel";
import Image from "next/image";
import { ContainerScroll } from "@workspace/ui/components/aceternity/container-scroll-animation";
import { HeroCodeBlock } from "@workspace/ui/components/misc/HeroCodeBlock";
import { motion, useReducedMotion } from "framer-motion";
import { ReactElement } from "react";

const BackgroundBeams = dynamic(
  () =>
    import("@workspace/ui/components/aceternity/background-beams").then(
      (mod) => mod.BackgroundBeams,
    ),
  { ssr: false },
);

const HeroSection = ({ heroSection }: { heroSection: HeroSectionProps }): ReactElement => {
  const [isClientReady, setIsClientReady] = useState(false);
  const router = useRouter()
  const reducedMotion = useReducedMotion();
  const [demoPending, setDemoPending] = useState(false);
  const [demoError, setDemoError] = useState<string | null>(null);

  const openDemo = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setDemoPending(true);
    setDemoError(null);
    try {
      const response = await fetch("/api/demo-login", { method: "POST" });
      if (!response.ok) throw new Error("Demo unavailable");
      window.location.assign(response.url);
    } catch {
      setDemoError("The demo is temporarily unavailable. Please try again later or browse the documentation.");
      setDemoPending(false);
    }
  };

  useEffect(() => {
    const frameId = window.requestAnimationFrame(() => setIsClientReady(true));
    return () => window.cancelAnimationFrame(frameId);
  }, [])

  const tagline = heroSection.tagline?.trim() || "Build and launch your SaaS faster";
  const description = heroSection.description?.trim() || "Ship your product with a production-ready SaaS foundation.";
  const taglineArray = tagline.split(/\s+/);

  // Simple string replacer for basic youtube links to convert them to embed format
  const getYoutubeEmbedUrl = (url?: string) => {
    if (!url) return null;
    try {
      if (url.includes('youtube.com/watch')) {
        const urlObj = new URL(url);
        const videoId = urlObj.searchParams.get('v');
        return videoId ? `https://www.youtube.com/embed/${videoId}` : url;
      }
      if (url.includes('youtu.be/')) {
        const videoId = url.split('youtu.be/')[1]?.split('?')[0];
        return videoId ? `https://www.youtube.com/embed/${videoId}` : url;
      }
    } catch {
      // Just fallback to the raw url
    }
    return url;
  };
  const embedUrl = getYoutubeEmbedUrl(heroSection.videoLink);

  return (
    <section className="container mx-auto px-4 sm:px-6 lg:px-8 flex flex-col justify-center items-center py-12 md:py-20  gap-10 relative ">

      <div className="w-full max-w-5xl text-center space-y-6 justify-center flex flex-col items-center">
        <motion.div
          initial={reducedMotion ? false : { opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="text-4xl sm:text-5xl md:text-6xl text-center leading-tight"
        >
          <h1 className="inline-block font-bold text-balance">
            <span className="bg-gradient-to-r from-fuchsia-700 to-pink-700 dark:from-[#F596D3] dark:to-[#D247BF] text-transparent bg-clip-text">
              {taglineArray.slice(0, Math.ceil(taglineArray.length / 3)).join(" ")}
            </span>{" "}
            <span>
              {taglineArray
                .slice(Math.ceil(taglineArray.length / 3), Math.ceil((2 * taglineArray.length) / 3))
                .join(" ")}
            </span>{" "}
            <span className="bg-gradient-to-r from-sky-700 to-cyan-700 dark:from-[#61DAFB] dark:via-[#1fc0f1] dark:to-[#03a3d7] text-transparent bg-clip-text">
              {taglineArray.slice(Math.ceil((2 * taglineArray.length) / 3)).join(" ")}
            </span>
          </h1>
        </motion.div>


        <motion.div
          initial={reducedMotion ? false : { opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.3, duration: 0.5 }}
          className="text-lg sm:text-xl text-muted-foreground max-w-2xl mx-auto lg:mx-0"
        >
          <p>{description}</p>
        </motion.div>
        <motion.div
          initial={reducedMotion ? false : { opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: 0.5, duration: 0.5 }}
          className="w-full max-w-[400px]"
        >
          <HeroCodeBlock

            language="bash"
            code={heroSection.codeSnippet || "Coming Soon"}
          />
        </motion.div>
        <motion.div
          initial={reducedMotion ? false : { opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.7, duration: 0.5 }}
          className="flex flex-wrap items-center justify-center gap-3"
        >

          <Button
            className="flex items-center gap-1"
            variant="secondary"
            size="default"
            onClick={() => router.push("/landing/doc")}
          >
            <BookIcon size={15} />
            <p className="text-sm">Documentation</p>
          </Button>
          <form method="post" action="/api/demo-login" onSubmit={openDemo}>
            <Button
              type="submit" disabled={demoPending}
              className="flex items-center gap-1"
              variant="outline"
              size="default"
            >
              <p className="text-sm">{demoPending ? "Opening demo…" : "Try demo"}</p>
            </Button>
          </form>
          <Button
            className="flex items-center gap-1"
            variant="default"
            size="default"
            onClick={() => router.push("/sign-up")}
          >
            <p className="text-sm">Getting Started</p>
            <ArrowRight size={15} />
          </Button>
        </motion.div>
        {demoError && <p role="alert" className="max-w-lg text-sm text-destructive">{demoError}</p>}
      </div>
      {/* Hero cards sections */}
      <div className="flex justify-center w-full group">
        {/* <div className="absolute inset-0  scale-[0.80] transform rounded-full  bg-gradient-to-r from-[#F596D3] 
      to-[#03a3d7] blur-3xl max-w-5xl top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 " /> */}

        <Carousel className="w-full z-10   ">
          <ContainerScroll titleComponent={<></>}>
            <CarouselContent className="">
              {embedUrl && isClientReady && (
                <CarouselItem className="flex items-center justify-center relative w-full aspect-video">
                  <iframe
                    src={embedUrl}
                    title="Product Video"
                    width="100%"
                    height="100%"
                    allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                    allowFullScreen
                    className="rounded-lg mx-auto w-full h-full aspect-video border-none"
                  />
                </CarouselItem>
              )}

              {heroSection.heroImages?.map((image, index) => (
                <CarouselItem key={index} className="flex items-center justify-center relative ">
                  {image.imageUrl ? (
                    <Image
                      src={image.imageUrl}
                      alt={image.title || "Hero Slide"}
                      width={1920}
                      height={1080}
                      className="rounded-lg mx-auto object-cover h-full aspect-video"
                      priority={index === 0}
                      quality={90}
                    />
                  ) : (
                    <div className="w-full aspect-video rounded-lg mx-auto bg-gradient-to-br from-white/5 to-white/0 border border-white/10 backdrop-blur-md flex flex-col items-center justify-center gap-4 group/placeholder">
                      <div className="p-4 rounded-full bg-white/5 group-hover/placeholder:scale-110 transition-transform duration-500">
                        <span className="text-4xl">✨</span>
                      </div>
                      <p className="text-zinc-400 font-light">Add your product screenshots in the CMS</p>
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
            <CarouselPrevious className="left-2" />
            <CarouselNext className="right-2" />
          </ContainerScroll>
        </Carousel>

      </div>

      {isClientReady && !reducedMotion ? <BackgroundBeams /> : null}
    </section>
  );
};

export default HeroSection;
