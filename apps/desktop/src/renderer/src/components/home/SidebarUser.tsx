import React from "react"
import { useNavigate } from "react-router-dom"
import { useTRPC } from '../../lib/trpc';
import { useQuery, useMutation } from "@tanstack/react-query";
import { useSession } from "@workspace/auth/better-auth/auth-client";
import UISidebarUser from "@workspace/ui/components/home/SidebarUser"

const SidebarUser = () => {
    const navigate = useNavigate();
    const trpc = useTRPC() as any;
    const { data: session, status, refetch: refetchSession } = useSession({
        fetchOptions: {
            baseURL: import.meta.env.VITE_API_URL?.replace('/api/trpc', '') || 'http://localhost:3000',
            credentials: "include"
        }
    });

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
        navigate(path);
    }

    const onSetPassword = async (data: { newPassword: string, confirmPassword: string }) => {
        try {
            await setPasswordMutation.mutateAsync({
                newPassword: data.newPassword,
                confirmPassword: data.confirmPassword,
            } as any);
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
            const apiUrl = import.meta.env.VITE_API_URL?.replace('/api/trpc', '') || 'http://localhost:3000'
            const response = await fetch(`${apiUrl}/api/settings/modifyAvatar`, {
                method: "POST",
                body: formData,
                credentials: "include"
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
            const result = await checkoutMutation.mutateAsync({ credits } as any) as any;
            if (result?.checkoutUrl) {
                window.open(result.checkoutUrl, '_blank')
            }
            return { checkoutUrl: result?.checkoutUrl };
        } catch (e: any) {
            return {};
        }
    }

    return (
        <UISidebarUser
            session={session}
            status={status}
            onNavigate={onNavigate}
            signOutRedirect="/sign-in"
            onSetPassword={onSetPassword}
            onUpdateAvatar={onUpdateAvatar}
            guestMail={import.meta.env.VITE_GUEST_MAIL}
            adminMail={import.meta.env.VITE_ADMIN_MAIL}
            paymentGateway={import.meta.env.VITE_PAYMENT_GATEWAY}
            creditsData={creditsData as any}
            purchases={purchases as any}
            isBillingLoading={isCreditsLoading || isPurchasesLoading}
            onCreateCheckoutSession={onCreateCheckoutSession}
        />
    )
}

export default SidebarUser;
