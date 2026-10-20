"use client"

import React, { useEffect, useState } from "react"
import {
  BadgeCheck, CircleUserIcon, Globe, KeyRound, Link, RadioIcon, ReceiptIcon, Settings,
} from "lucide-react"
import { useTranslations } from "use-intl"
import type { Locale } from "@workspace/i18n/config"
import { Webhook } from "lucide-react"

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
import LanguageSettings from "./LanguageSettings"
import PlansBilling from "./PlansBilling"

export type SettingsTab = "account" | "sessions" | "language" | "billing" | "apiKeys" | "webhooks"


export interface SettingsDialogProps {
  children?: React.ReactNode;
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
  openedTab?: SettingsTab;
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
  apiKeysContent?: React.ReactNode;
  webhooksContent?: React.ReactNode;
  /** Shows a Language & Region tab; the app saves the choice (web only for now). */
  onLocaleChange?: (locale: Locale) => void | Promise<void>;
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
  paymentGateway,
  creditsData,
  purchases,
  isBillingLoading,
  onCreateCheckoutSession,
  apiKeysContent,
  webhooksContent,
  onLocaleChange,
}: SettingsDialogProps) {

  const { data: session, status } = useSession();


  const [internalOpen, setInternalOpen] = React.useState(false)

  // Determine which open state to use
  const isOpen = controlledOpen !== undefined ? controlledOpen : internalOpen

  // Determine which setOpen function to use
  const setOpen = setControlledOpen || setInternalOpen

  const t = useTranslations("settings")
  const tBilling = useTranslations("billing")
  const tApiKeys = useTranslations("api_keys")
  const tWebhooks = useTranslations("webhooks")

  const nav: { id: SettingsTab; label: string; icon: React.ComponentType<{ className?: string }> }[] = [
    { id: "account", label: t("tabs.account"), icon: CircleUserIcon },
    { id: "sessions", label: t("tabs.sessions"), icon: RadioIcon },
    ...(onLocaleChange ? [{ id: "language" as const, label: t("tabs.language"), icon: Globe }] : []),
    { id: "billing", label: tBilling("settingsTab"), icon: ReceiptIcon },
    { id: "apiKeys", label: tApiKeys("settingsTab"), icon: KeyRound },
    { id: "webhooks", label: tWebhooks("settingsTab"), icon: Webhook },
  ]

  const [currentOpenedTab, setCurrentOpenedTab] = React.useState<SettingsTab>(openedTab || "account")

  return (
    <Dialog open={isOpen} onOpenChange={setOpen}>
      {children && <DialogTrigger asChild>
        {children}
      </DialogTrigger>}
      <DialogContent className="overflow-hidden p-0 h-[85dvh] w-[calc(100%-2rem)] max-w-5xl sm:max-w-5xl md:rounded-2xl border-none shadow-2xl bg-card">
        <DialogTitle className="sr-only">{t("title")}</DialogTitle>
        <DialogDescription className="sr-only">
          {t("description")}
        </DialogDescription>
        <SidebarProvider className="w-full h-full min-h-0 min-w-0 flex-col md:flex-row">
          <nav aria-label={t("sectionsLabel")} className="border-b p-4 pr-12 md:hidden">
            <label htmlFor="account-settings-section" className="sr-only">{t("sectionSelect")}</label>
            <select id="account-settings-section" value={currentOpenedTab} onChange={(event) => setCurrentOpenedTab(event.target.value as SettingsTab)} className="min-h-11 w-full rounded-md border bg-background px-3 text-base focus-visible:outline-2 focus-visible:outline-ring">
              {nav.map((item) => <option key={item.id} value={item.id}>{item.label}</option>)}
            </select>
          </nav>
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
                    {nav.map((item) => (
                      <SidebarMenuItem key={item.id}>
                        <SidebarMenuButton
                          isActive={item.id === currentOpenedTab}
                          onClick={() => setCurrentOpenedTab(item.id)}
                          className={cn(
                            "flex items-center gap-3 px-3 py-2 h-10 rounded-lg transition-all duration-200 cursor-pointer font-medium",
                            item.id === currentOpenedTab
                              ? "bg-primary/10 text-primary shadow-sm hover:bg-primary/15"
                              : "text-muted-foreground hover:bg-muted hover:text-foreground"
                          )}
                        >
                          <div className="flex items-center gap-3 w-full">
                            <item.icon className={cn("h-4 w-4", item.id === currentOpenedTab ? "text-primary" : "text-muted-foreground/70")} />
                            <span>{item.label}</span>
                          </div>
                        </SidebarMenuButton>
                      </SidebarMenuItem>
                    ))}
                  </SidebarMenu>
                </SidebarGroupContent>
              </SidebarGroup>
            </SidebarContent>
          </Sidebar>
          <main className="flex min-h-0 min-w-0 flex-1 flex-col overflow-auto bg-background/50">
            {currentOpenedTab === "account" &&
              <MyAccountSettings
                onNavigate={onNavigate}
                onSetPassword={onSetPassword}
                onUpdateAvatar={onUpdateAvatar}
                guestMail={guestMail}
                adminMail={adminMail}
              />
            }
            {currentOpenedTab === "sessions" &&
              <SessionSettings onNavigate={onNavigate} />}
            {currentOpenedTab === "language" && onLocaleChange &&
              <LanguageSettings onLocaleChange={onLocaleChange} />}
            {currentOpenedTab === "billing" && paymentGateway !== "none" &&
              <PlansBilling
                creditsData={creditsData}
                purchases={purchases}
                isLoading={isBillingLoading}
                onCreateCheckoutSession={onCreateCheckoutSession}
                paymentGateway={paymentGateway}
              />}
            {currentOpenedTab === "apiKeys" && (
              <div className="p-6">
                {apiKeysContent ?? (
                  <p className="text-sm text-muted-foreground">
                    {tApiKeys("unavailable")}
                  </p>
                )}
              </div>
            )}
            {currentOpenedTab === "webhooks" && (
              <div className="p-6">
                {webhooksContent ?? (
                  <p className="text-sm text-muted-foreground">
                    {tWebhooks("unavailable")}
                  </p>
                )}
              </div>
            )}

          </main>
        </SidebarProvider>
      </DialogContent>
    </Dialog>
  )
}
