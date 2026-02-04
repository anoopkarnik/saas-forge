"use client";
import {
    Sidebar,
    SidebarContent,
    SidebarFooter,
    SidebarGroup,
    SidebarGroupLabel,
    SidebarHeader,
    SidebarMenu,
    SidebarMenuButton,
    SidebarMenuItem,
} from "@workspace/ui/components/shadcn/sidebar";
import Image from "next/image";
import { useTheme } from "next-themes";
import { useTRPC } from "@/trpc/client";
import { useSuspenseQuery } from "@tanstack/react-query";
import { usePathname, useRouter } from "next/navigation";
import { cn } from "@workspace/ui/lib/utils";
import { HomeIcon } from "lucide-react";
import { CiMoneyBill } from "react-icons/ci";
import { useSession} from "@workspace/auth/better-auth/auth-client";
import ProgressWithCredits from "@/components/home/ProgressWithCredits";
import SidebarUser from "./SidebarUser";


export function AppSidebar() {
    const {theme} = useTheme();
    const trpc = useTRPC();
    const { data} = useSuspenseQuery(trpc.landing.getLandingInfoFromNotion.queryOptions());
    const router = useRouter()
    const pathname = usePathname();
    return (
        <Sidebar>
            <SidebarHeader>
                <SidebarMenu>
                    <SidebarMenuItem>
                        <a
                        rel="noreferrer noopener"
                        href="/"
                        className="flex items-center gap-2 font-cyberdyne "
                        >
                            {theme === "dark" ?
                            <Image src={data.navbarSection?.darkLogo} alt={data.navbarSection?.title} width={30} height={30} /> : 
                            <Image src={data.navbarSection?.logo} alt={data.navbarSection?.title} width={30} height={30} />}
                            <div className="hidden lg:flex flex-col items-start text-md leading-none bg-linear-to-r from-white to-white bg-clip-text text-transparent ">
                                {data.navbarSection?.title}
                            </div>
                        </a>
                    </SidebarMenuItem>
                </SidebarMenu>
            </SidebarHeader>
           <SidebarContent>
                <SidebarGroup>
                    <SidebarGroupLabel>Application</SidebarGroupLabel>
                    <SidebarMenu>
                        <SidebarMenuItem>
                            <SidebarMenuButton asChild tooltip={"Home"} 
                        className={cn("cursor-pointer",pathname==="/" && "bg-sidebar-accent")}
                        onClick={() => router.push("/")}>
                            <div className="flex items-center ">
                                <HomeIcon className="mr-2 h-4 w-4" />
                                <span>{"Home"}</span>
                            </div>
                            </SidebarMenuButton>
                        </SidebarMenuItem>
                        <SidebarMenuItem>
                            <SidebarMenuButton asChild tooltip={"Billing"} 
                        className={cn("cursor-pointer",pathname==="/billing" && "bg-sidebar-accent")}
                        onClick={() => router.push("/billing")}>
                            <div className="flex items-center ">
                                <CiMoneyBill className="mr-2 h-4 w-4" />
                                <span>{"Billing"}</span>
                            </div>
                            </SidebarMenuButton>
                        </SidebarMenuItem>
                    </SidebarMenu>
                </SidebarGroup>
           </SidebarContent>
            <SidebarFooter className="bg-accent rounded-2xl p-4 m-2">
               <ProgressWithCredits/>
               <SidebarUser/>
            </SidebarFooter>
        </Sidebar>
    );
}
  