"use client"

import React from "react"
import {
  BadgeCheck, CircleUserIcon, Laptop, LogOut, Moon, RadioIcon, Settings, Sun,
} from "lucide-react"

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogTitle,
  DialogTrigger,
} from "@workspace/ui/components/shadcn/dialog"
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarProvider,
} from "@workspace/ui/components/shadcn/sidebar"
import { useSession } from "@workspace/auth/better-auth/auth-client"
import { Avatar, AvatarFallback, AvatarImage } from "@workspace/ui/components/shadcn/avatar"
import { cn } from "@workspace/ui/lib/utils"
import MyAccountSettings from "./MyAccountSettings"
import SessionSettings from "./SessionSettings"

const data = {
  nav: [
    { name: "My Account", icon: CircleUserIcon },
    { name: "Sessions", icon: RadioIcon },
  ],
}


export interface SettingsDialogProps {
  children?: React.ReactNode;
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
  openedTab?: string;
  onNavigate?: (path: string) => void;
  onSetPassword?: (data: { newPassword: string, confirmPassword: string }) => Promise<{ error?: string }>;
  onUpdateAvatar?: (file: File) => Promise<{ url?: string, error?: string }>;
  guestMail?: string;
  adminMail?: string;
  paymentGateway?: string;
  creditsData?: { creditsTotal: number; creditsUsed: number };
  purchases?: any[];
  isBillingLoading?: boolean;
  onCreateCheckoutSession?: (credits: number) => Promise<{ checkoutUrl?: string }>;
}

export function SettingsDialog({
  children,
  open: controlledOpen,
  onOpenChange: setControlledOpen,
  openedTab,
  onNavigate,
  onSetPassword,
  onUpdateAvatar,
  guestMail,
  adminMail,
}: SettingsDialogProps) {

  const { data: session } = useSession();

  const [internalOpen, setInternalOpen] = React.useState(false)
  const isOpen = controlledOpen !== undefined ? controlledOpen : internalOpen
  const setOpen = setControlledOpen || setInternalOpen
  const [currentOpenedTab, setCurrentOpenedTab] = React.useState(openedTab || "My Account")

  return (
    <Dialog open={isOpen} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {children || (
          <>
            <BadgeCheck />
            Account
          </>)}
      </DialogTrigger>
      <DialogContent className="overflow-hidden p-0 h-[85vh] w-full max-w-5xl sm:max-w-5xl md:rounded-2xl border-none shadow-2xl bg-card">
        <DialogTitle className="sr-only">Settings</DialogTitle>
        <DialogDescription className="sr-only">
          Customize your settings here.
        </DialogDescription>
        <SidebarProvider className="w-full h-full min-h-0">
          <Sidebar collapsible="none" className="min-w-[280px] hidden md:flex bg-muted/30 border-r border-border/50 h-full">
            <SidebarContent className="p-4">
              <SidebarGroup>
                <div className="flex items-center gap-3 px-2 py-4 mb-4 border-b border-border/40">
                  <Avatar className="h-10 w-10 rounded-full border border-border/50 shadow-sm">
                    <AvatarImage src={session?.user?.image ?? ''} alt={session?.user?.name ?? ''} className="object-cover" />
                    <AvatarFallback className="rounded-full bg-secondary text-primary font-medium">{session?.user?.name ? session?.user?.name[0]?.toUpperCase() : 'U'}</AvatarFallback>
                  </Avatar>
                  <div className="grid flex-1 text-left">
                    <span className="truncate font-semibold text-sm text-foreground">{session?.user?.name}</span>
                    <span className="truncate text-xs text-muted-foreground">{session?.user?.email}</span>
                  </div>
                </div>
                <SidebarGroupContent>
                  <SidebarMenu className="gap-2">
                    {data.nav.map((item) => (
                      <SidebarMenuItem key={item.name}>
                        <SidebarMenuButton
                          asChild
                          isActive={item.name === currentOpenedTab}
                          onClick={() => setCurrentOpenedTab(item.name)}
                          className={cn(
                            "flex items-center gap-3 px-3 py-2 h-10 rounded-lg transition-all duration-200 cursor-pointer font-medium",
                            item.name === currentOpenedTab
                              ? "bg-primary/10 text-primary shadow-sm hover:bg-primary/15"
                              : "text-muted-foreground hover:bg-muted hover:text-foreground"
                          )}
                        >
                          <div className="flex items-center gap-3 w-full">
                            <item.icon className={cn("h-4 w-4", item.name === currentOpenedTab ? "text-primary" : "text-muted-foreground/70")} />
                            <span>{item.name}</span>
                          </div>
                        </SidebarMenuButton>
                      </SidebarMenuItem>
                    ))}
                  </SidebarMenu>
                </SidebarGroupContent>
              </SidebarGroup>
            </SidebarContent>
          </Sidebar>
          <main className="flex flex-1 flex-col overflow-auto h-full bg-background/50">
            {currentOpenedTab === "My Account" &&
              <MyAccountSettings
                onNavigate={onNavigate}
                onSetPassword={onSetPassword}
                onUpdateAvatar={onUpdateAvatar}
                guestMail={guestMail}
                adminMail={adminMail}
              />
            }
            {currentOpenedTab === "Sessions" &&
              <SessionSettings onNavigate={onNavigate} />}
          </main>
        </SidebarProvider>
      </DialogContent>
    </Dialog>
  )
}
