"use client"

import {
  BookOpen,
  ChevronsUpDown,
  Laptop,
  LogOut,
  Moon,
  Settings,
  Sun,
} from "lucide-react"
import { useTheme } from "next-themes"
import React, { useEffect, useState } from "react"

import {
  Avatar,
  AvatarFallback,
  AvatarImage,
} from "@workspace/ui/components/shadcn/avatar"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuSub,
  DropdownMenuSubContent,
  DropdownMenuSubTrigger,
  DropdownMenuTrigger,
} from "@workspace/ui/components/shadcn/dropdown-menu"
import {
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  useSidebar,
} from "@workspace/ui/components/shadcn/sidebar"
import { useRouter } from "next/navigation"
import { useSession, authClient } from "@workspace/auth/better-auth/auth-client"
import { SettingsDialog } from "./SettingsDialog"

const SidebarUser = () => {

  const { data: session, status } = useSession();
  const { isMobile } = useSidebar()
  const { setTheme, theme } = useTheme()
  const [isSettingsOpen, setIsSettingsOpen] = useState(false)
  const [isDropdownOpen, setIsDropdownOpen] = useState(false)
  const [isSigningOut, setIsSigningOut] = useState(false)

  const handleSettingsClick = (e: React.MouseEvent) => {
    // Prevent the dropdown from closing
    e.preventDefault()
    e.stopPropagation()

    // Open the settings dialog
    setIsSettingsOpen(true)
  }
  const router = useRouter()
  const handleSignout = async () => {
    setIsSigningOut(true)
    await authClient.signOut({
      fetchOptions: {
        onSuccess: () => {
          router.push("/landing")
        }
      }
    })
  };

  if (!session || !session.user || !session.user.email || isSigningOut) {
    return <SidebarMenu>
      <SidebarMenuItem>
        <div className="flex items-center gap-2 p-2">
          <div className="h-8 w-8 rounded-lg bg-sidebar-accent/50 animate-pulse" />
          <div className="flex-1 space-y-2">
            <div className="h-4 w-24 bg-sidebar-accent/50 rounded animate-pulse" />
            <div className="h-3 w-32 bg-sidebar-accent/50 rounded animate-pulse" />
          </div>
        </div>
      </SidebarMenuItem>
    </SidebarMenu>
  }

  return (
    <SidebarMenu>
      <SidebarMenuItem>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <SidebarMenuButton
              size="lg"
              className="data-[state=open]:bg-sidebar-accent data-[state=open]:text-sidebar-accent-foreground transition-all duration-200 hover:bg-sidebar-accent/50"
            >
              <Avatar className="h-8 w-8 rounded-lg border border-border/50">
                <AvatarImage src={session?.user?.image ?? ''} alt={session?.user?.name ?? ''} className="object-cover" />
                <AvatarFallback className="rounded-lg">{session?.user?.name ? session?.user?.name[0]?.toUpperCase() : 'U'}</AvatarFallback>
              </Avatar>
              <div className="grid flex-1 text-left text-sm leading-tight">
                <span className="truncate font-semibold text-foreground/90">{session?.user?.name}</span>
                <span className="truncate text-xs text-muted-foreground/70">{session?.user?.email}</span>
              </div>
              <ChevronsUpDown className="ml-auto size-4 text-muted-foreground/50" />
            </SidebarMenuButton>
          </DropdownMenuTrigger>
          <DropdownMenuContent
            className="w-[--radix-dropdown-menu-trigger-width] min-w-56 rounded-xl border-border/50 shadow-lg"
            side={isMobile ? "bottom" : "right"}
            align="end"
            sideOffset={8}
          >
            <DropdownMenuLabel className="p-0 font-normal">
              <div className="flex items-center gap-2 px-1 py-1.5 text-left text-sm">
                <Avatar className="h-8 w-8 rounded-lg">
                  <AvatarImage src={session?.user?.image ?? ''} alt={session?.user?.name ?? ''} className="object-cover" />
                  <AvatarFallback className="rounded-lg">{session?.user?.name ? session?.user?.name[0]?.toUpperCase() : 'U'}</AvatarFallback>
                </Avatar>
                <div className="grid flex-1 text-left text-sm leading-tight">
                  <span className="truncate font-semibold">{session?.user?.name}</span>
                  <span className="truncate text-xs">{session?.user?.email}</span>
                </div>
              </div>
            </DropdownMenuLabel>
            <DropdownMenuSeparator />
            <DropdownMenuGroup>
              <SettingsDialog
                open={isSettingsOpen}
                onOpenChange={(open) => {
                  setIsSettingsOpen(open)
                  // Ensure dropdown remains open when dialog is closed
                  if (!open) {
                    setIsDropdownOpen(true)
                  }
                }}
              >
                <DropdownMenuItem
                  className="flex gap-2 cursor-pointer"
                  onClick={handleSettingsClick}
                >
                  <Settings size={20} />
                  Settings
                </DropdownMenuItem>
              </SettingsDialog>
            </DropdownMenuGroup>
            <DropdownMenuSeparator />
            <DropdownMenuGroup>
              <DropdownMenuSub>
                <DropdownMenuSubTrigger className="flex gap-2 cursor-pointer">
                  <Sun className="h-[1.2rem] w-[1.2rem] rotate-0 scale-100 transition-all dark:-rotate-90 dark:scale-0" />
                  <Moon className="absolute h-[1.2rem] w-[1.2rem] rotate-90 scale-0 transition-all dark:rotate-0 dark:scale-100" />
                  <span>Theme</span>
                </DropdownMenuSubTrigger>
                <DropdownMenuSubContent>
                  <DropdownMenuItem onClick={() => setTheme("light")} className="cursor-pointer gap-2">
                    <Sun className="h-4 w-4" />
                    <span>Light</span>
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => setTheme("dark")} className="cursor-pointer gap-2">
                    <Moon className="h-4 w-4" />
                    <span>Dark</span>
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => setTheme("system")} className="cursor-pointer gap-2">
                    <Laptop className="h-4 w-4" />
                    <span>System</span>
                  </DropdownMenuItem>
                </DropdownMenuSubContent>
              </DropdownMenuSub>
            </DropdownMenuGroup>
            <DropdownMenuSeparator />
            <DropdownMenuItem className="flex gap-2 cursor-pointer" onClick={handleSignout}>
              <LogOut size={20} />
              Log out
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </SidebarMenuItem>
    </SidebarMenu>
  )
}

export default SidebarUser;