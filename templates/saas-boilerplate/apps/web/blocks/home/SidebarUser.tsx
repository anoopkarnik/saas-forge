"use client"
import React from "react"
import { useRouter, useSearchParams } from "next/navigation"
import { useTRPC } from "@/trpc/client";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useSession } from "@workspace/auth/better-auth/auth-client";
import UISidebarUser from "@workspace/ui/components/home/SidebarUser"
// scaffold:begin billing
import ProgressWithCredits from "@workspace/ui/components/home/ProgressWithCredits"
// scaffold:end billing
import { ApiKeysScreen } from "@/components/api-keys/ApiKeysScreen"

const SidebarUser = () => {
  const router = useRouter();
  // scaffold:begin billing
  const searchParams = useSearchParams();
  // scaffold:end billing
  const trpc = useTRPC();
  const { data: session, status, refetch: refetchSession } = useSession();

  // scaffold:begin billing
  // Poll for credit updates after returning from payment checkout
  const [awaitingPayment, setAwaitingPayment] = React.useState(
    () => searchParams.get("payment") === "success"
  );

  // Clean up the ?payment=success param from the URL
  React.useEffect(() => {
    if (searchParams.get("payment") === "success") {
      router.replace("/", { scroll: false });
    }
  }, [searchParams, router]);

  const { data: creditsData, isLoading: isCreditsLoading } = useQuery({
    ...trpc.billing.getCreditsBalance.queryOptions(),
    enabled: !!session?.user?.id,
    refetchInterval: awaitingPayment ? 5000 : false,
  });

  const { data: purchases, isLoading: isPurchasesLoading } = useQuery({
    ...trpc.billing.getTransactions.queryOptions(),
    enabled: !!session?.user?.id,
    refetchInterval: awaitingPayment ? 5000 : false,
  });

  // Stop polling once credits change
  const initialCreditsRef = React.useRef<number | undefined>(undefined);
  React.useEffect(() => {
    if (!awaitingPayment) return;
    if (initialCreditsRef.current === undefined && creditsData?.creditsTotal !== undefined) {
      initialCreditsRef.current = creditsData.creditsTotal;
    }
    if (initialCreditsRef.current !== undefined && creditsData &&
        creditsData.creditsTotal !== initialCreditsRef.current) {
      setAwaitingPayment(false);
    }
  }, [creditsData, awaitingPayment]);

  // Safety timeout: stop polling after 5 minutes
  React.useEffect(() => {
    if (!awaitingPayment) return;
    const timer = setTimeout(() => setAwaitingPayment(false), 5 * 60 * 1000);
    return () => clearTimeout(timer);
  }, [awaitingPayment]);
  // scaffold:end billing

  const setPasswordMutation = useMutation(trpc.home.setPassword.mutationOptions());
  // scaffold:begin billing
  const checkoutMutation = useMutation(trpc.billing.createCheckoutSession.mutationOptions());
  // scaffold:end billing

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

  // scaffold:begin billing
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
  // scaffold:end billing

  return (
    <>
      {/* scaffold:begin billing */}
      {process.env.NEXT_PUBLIC_PAYMENT_GATEWAY !== 'none' && (
        <ProgressWithCredits creditsData={creditsData} />
      )}
      {/* scaffold:end billing */}
      <UISidebarUser
        session={session}
        status={status}
        onNavigate={onNavigate}
        onSetPassword={onSetPassword}
        onUpdateAvatar={onUpdateAvatar}
        guestMail={process.env.NEXT_PUBLIC_GUEST_MAIL}
        adminMail={process.env.NEXT_PUBLIC_ADMIN_MAIL}
        // scaffold:begin billing
        paymentGateway={process.env.NEXT_PUBLIC_PAYMENT_GATEWAY}
        creditsData={creditsData}
        purchases={purchases as any}
        isBillingLoading={isCreditsLoading || isPurchasesLoading}
        onCreateCheckoutSession={onCreateCheckoutSession}
        // scaffold:end billing
        apiKeysContent={<ApiKeysScreen />}
      />
    </>
  )
}

export default SidebarUser;
