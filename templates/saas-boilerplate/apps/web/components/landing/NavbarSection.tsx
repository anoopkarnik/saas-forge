"use client"
import { useEffect, useState } from "react";
import {
  NavigationMenu,
  NavigationMenuItem,
  NavigationMenuList,
} from "@workspace/ui/components/shadcn/navigation-menu";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@workspace/ui/components/shadcn/sheet";

import { GitHubLogoIcon } from "@radix-ui/react-icons";
import { Button, buttonVariants } from "@workspace/ui/components/shadcn/button";
import { MenuIcon, Coffee, ArrowRight } from "lucide-react";
import { useTheme } from 'next-themes';
import Image from 'next/image';
import { NavbarSectionProps } from "@/lib/ts-types/landing";
import { useRouter } from "next/navigation";

const NavbarSection = ({ navbarSection }: { navbarSection: NavbarSectionProps }) => {
  const [isOpen, setIsOpen] = useState<boolean>(false);
  const { theme } = useTheme();
  const [starCount, setStarCount] = useState<number>(0);
  const router = useRouter()

  useEffect(() => {
    const fetchStarCount = async () => {
      try {
        const response = await fetch("https://api.github.com/repos/" + navbarSection.githubUsername + "/" + navbarSection.githubRepositoryName);
        if (response.ok) {
          const data = await response.json();
          setStarCount(data.stargazers_count);
        } else {
          console.error("Failed to fetch star count");
        }
      } catch (error) {
        console.log("Error fetching star count:", error);
      }
    };
    if (navbarSection.githubLink) {
      fetchStarCount();
    }

  }, [theme, navbarSection.githubLink]);
  return (
    <header className="sticky border-b-[1px] top-0 z-40 w-full bg-background">
      <NavigationMenu className="mx-auto">
        <NavigationMenuList className="container h-14 px-4 w-screen flex justify-between ">
          <NavigationMenuItem className="font-bold flex">
            <a
              rel="noreferrer noopener"
              href="/"
              className="ml-2 font-bold text-xl flex items-center gap-2"
            >
              {theme === "dark" ? (
                navbarSection.darkLogo ? (
                  <Image src={navbarSection.darkLogo} alt={navbarSection.title} width={30} height={30} />
                ) : <span className="text-xl">🚀</span>
              ) : (
                navbarSection.logo ? (
                  <Image src={navbarSection.logo} alt={navbarSection.title} width={30} height={30} />
                ) : <span className="text-xl">🚀</span>
              )}
              <div className="hidden lg:flex">{navbarSection.title}</div>
            </a>
          </NavigationMenuItem>


          <span className="flex md:hidden">

            <Sheet
              open={isOpen}
              onOpenChange={setIsOpen}
            >
              <SheetTrigger className="px-2">
                <MenuIcon onClick={() => setIsOpen(true)} className="flex md:hidden h-5 w-5" />
              </SheetTrigger>

              <SheetContent side={"left"}>
                <SheetHeader>
                  <SheetTitle className="font-bold text-xl">
                    Shadcn/React
                  </SheetTitle>
                </SheetHeader>
                <nav className="flex flex-col justify-center items-center gap-2 mt-4">

                  <a
                    rel="noreferrer noopener" href={"#features"} onClick={() => setIsOpen(false)}
                    className={buttonVariants({ variant: "ghost" })}
                  >
                    Features
                  </a>
                  <a
                    rel="noreferrer noopener" href={"#testimonials"} onClick={() => setIsOpen(false)}
                    className={buttonVariants({ variant: "ghost" })}
                  >
                    Testimonials
                  </a>
                  <a
                    rel="noreferrer noopener" href={"#faq"} onClick={() => setIsOpen(false)}
                    className={buttonVariants({ variant: "ghost" })}
                  >
                    FAQ
                  </a>

                  <a
                    rel="noreferrer noopener"
                    href={navbarSection.githubLink}
                    target="_blank"
                    className={`w-[110px] border ${buttonVariants({
                      variant: "secondary",
                    })}`}
                  >
                    <GitHubLogoIcon className="mr-2 w-5 h-5" />

                    <svg
                      xmlns="http://www.w3.org/2000/svg"
                      fill="yellow"
                      className="w-4 h-4 mx-1 "
                      viewBox="0 0 24 24"
                    >
                      <path d="M12 .587l3.668 7.429 8.332 1.151-6.064 5.868 1.516 8.252-7.452-3.915-7.452 3.915 1.516-8.252-6.064-5.868 8.332-1.151z" />
                    </svg>
                    {starCount}
                  </a>
                </nav>
              </SheetContent>
            </Sheet>
          </span>

          {/* desktop */}
          <nav className="hidden md:flex gap-2">
            <a
              rel="noreferrer noopener" href={"#features"} onClick={() => setIsOpen(false)}
              className={buttonVariants({ variant: "ghost" })}
            >
              Features
            </a>
            <a
              rel="noreferrer noopener" href={"#testimonials"} onClick={() => setIsOpen(false)}
              className={buttonVariants({ variant: "ghost" })}
            >
              Testimonials
            </a>
            <a
              rel="noreferrer noopener" href={"#faq"} onClick={() => setIsOpen(false)}
              className={buttonVariants({ variant: "ghost" })}
            >
              FAQ
            </a>
          </nav>
          <div className="flex items-center gap-2">
            <div className="hidden md:flex gap-2">
              <a
                rel="noreferrer noopener"
                href={navbarSection.githubLink}
                target="_blank"
                className={`border flex items-center ${buttonVariants({ variant: "secondary" })}`}
              >
                <GitHubLogoIcon className=" w-5 h-5" />
                {starCount}
              </a>
            </div>
            <Button
              className="flex items-center gap-1"
              variant="default"
              size="sm"
              onClick={() => router.push("/sign-in")}
            >
              <p className="text-sm">Login</p>
            </Button>
          </div>
        </NavigationMenuList>
      </NavigationMenu>
    </header>
  );
};

export default NavbarSection;