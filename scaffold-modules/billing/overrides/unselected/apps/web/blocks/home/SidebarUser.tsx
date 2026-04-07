"use client"
import React from "react"
import { useRouter } from "next/navigation"
import { useTRPC } from "@/trpc/client";
import { useMutation } from "@tanstack/react-query";
import { useSession } from "@workspace/auth/better-auth/auth-client";
import UISidebarUser from "@workspace/ui/components/home/SidebarUser"

const SidebarUser = () => {
  const router = useRouter();
  const trpc = useTRPC();
  const { data: session, status, refetch: refetchSession } = useSession();

  const setPasswordMutation = useMutation(trpc.home.setPassword.mutationOptions());

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

      const data = await response.json();
      await refetchSession();
      return { url: data.url };
    } catch (e: any) {
      return { error: e.message };
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
      paymentGateway="none"
      isBillingLoading={false}
    />
  )
}

export default SidebarUser;
