"use client"
import React from "react"
import { useRouter } from "next/navigation"
import { useTRPC } from "@/trpc/client";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useSession } from "@workspace/auth/better-auth/auth-client";
import UISidebarUser from "@workspace/ui/components/home/SidebarUser"

const SidebarUser = () => {
  const router = useRouter();
  const trpc = useTRPC();
  const { data: session, status, refetch: refetchSession } = useSession();

  const { data: creditsData, isLoading: isCreditsLoading } = useQuery({
    ...trpc.billing.getCreditsBalance.queryOptions(),
    enabled: !!session?.user?.id,
  });

  const { data: purchases, isLoading: isPurchasesLoading } = useQuery({
    ...trpc.billing.getTransactions.queryOptions(),
    enabled: !!session?.user?.id,
  });

  const setPasswordMutation = useMutation(trpc.home.setPassword.mutationOptions());
  const checkoutMutation = useMutation(trpc.billing.createCheckoutSession.mutationOptions());

  const onNavigate = (path: string) => {
    router.push(path);
  }

  const onSetPassword = async (data: { newPassword: string, confirmPassword: string }) => {
    try {
      await setPasswordMutation.mutateAsync({
        newPassword: data.newPassword,
        confirmPassword: data.confirmPassword,
      });
      await refetchSession();
      return {};
    } catch (e: any) {
      return { error: e.message };
    }
  }

  const onUpdateAvatar = async (file: File) => {
    const formData = new FormData();
    formData.append("file", file);
    try {
      const response = await fetch("/api/settings/modifyAvatar", {
        method: "POST",
        body: formData,
      });

      if (!response.ok) {
        throw new Error("Failed to upload avatar");
      }

      await refetchSession();
      return {};
    } catch (e: any) {
      return { error: e.message };
    }
  }

  const onCreateCheckoutSession = async (credits: number): Promise<{ checkoutUrl?: string }> => {
    try {
      const result = await checkoutMutation.mutateAsync({ credits });
      if (result.checkoutUrl) {
        window.location.href = result.checkoutUrl;
      }
      return { checkoutUrl: result.checkoutUrl ?? undefined };
    } catch (e: any) {
      return {};
    }
  }

  return (
    <UISidebarUser
      session={session}
      status={status}
      onNavigate={onNavigate}
      onSetPassword={onSetPassword}
      onUpdateAvatar={onUpdateAvatar}
      guestMail={process.env.NEXT_PUBLIC_GUEST_MAIL}
      adminMail={process.env.NEXT_PUBLIC_ADMIN_MAIL}
      paymentGateway={process.env.NEXT_PUBLIC_PAYMENT_GATEWAY}
      creditsData={creditsData}
      purchases={purchases as any}
      isBillingLoading={isCreditsLoading || isPurchasesLoading}
      onCreateCheckoutSession={onCreateCheckoutSession}
    />
  )
}

export default SidebarUser;