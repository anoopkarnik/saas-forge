"use client"

import React, { useEffect, useState } from "react"
import {
  BadgeCheck, Bell, CircleUserIcon, Globe, Link, Lock, RadioIcon, ReceiptIcon, Settings,
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
import { Button } from "@workspace/ui/components/shadcn/button"
import MyAccountSettings from "./MyAccountSettings"
import SessionSettings from "./SessionSettings"
import PlansBilling from "./PlansBilling"

const data = {
  nav: [
    { name: "My Account", icon: CircleUserIcon },
    { name: "Sessions", icon: RadioIcon },
    { name: "Plans & Billing", icon: ReceiptIcon },
    // { name: "Notifications", icon: Bell },
    // { name: "Language & Region", icon: Globe },
    // { name: "Privacy & Visibility", icon: Lock },
  ],
}


export function SettingsDialog({ children, open: controlledOpen, onOpenChange: setControlledOpen,
  openedTab }: {
    children?: React.ReactNode,
    open?: boolean,
    onOpenChange?: (open: boolean) => void,
    openedTab?: string,
  }) {

  const { data: session, status } = useSession();


  const [internalOpen, setInternalOpen] = React.useState(false)

  // Determine which open state to use
  const isOpen = controlledOpen !== undefined ? controlledOpen : internalOpen

  // Determine which setOpen function to use
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
              <MyAccountSettings />}
            {currentOpenedTab === "Sessions" &&
              <SessionSettings />}
            {currentOpenedTab === "Plans & Billing" && process.env.NEXT_PUBLIC_PAYMENT_GATEWAY !== "none" &&
              <PlansBilling />}

          </main>
        </SidebarProvider>
      </DialogContent>
    </Dialog>
  )
}
