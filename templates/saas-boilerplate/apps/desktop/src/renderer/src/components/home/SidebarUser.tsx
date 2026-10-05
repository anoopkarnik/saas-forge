import React from "react"
import { useNavigate } from "react-router-dom"
import { useTRPC } from '../../lib/trpc';
import { useQuery, useMutation } from "@tanstack/react-query";
import { useSession } from "@workspace/auth/better-auth/auth-client";
import UISidebarUser from "@workspace/ui/components/home/SidebarUser"
// scaffold:begin billing
import ProgressWithCredits from "@workspace/ui/components/home/ProgressWithCredits"
// scaffold:end billing

const SidebarUser = () => {
    const navigate = useNavigate();
    const trpc = useTRPC() as any;
    // scaffold:begin billing
    const [awaitingPayment, setAwaitingPayment] = React.useState(false);
    // scaffold:end billing

    const { data: session, status, refetch: refetchSession } = useSession({
        fetchOptions: {
            baseURL: import.meta.env.VITE_API_URL || 'http://localhost:3000',
            credentials: "include"
        }
    });

    // scaffold:begin billing
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
    // scaffold:end billing

    const setPasswordMutation = useMutation(trpc.home.setPassword.mutationOptions());
    // scaffold:begin billing
    const checkoutMutation = useMutation(trpc.billing.createCheckoutSession.mutationOptions());
    // scaffold:end billing

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
            const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:3000'
            const response = await fetch(`${apiUrl}/api/settings/modifyAvatar`, {
                method: "POST",
                body: formData,
                credentials: "include"
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
    // Stop polling once credits actually change after payment
    const creditsRef = React.useRef(creditsData as any);
    React.useEffect(() => {
        if (awaitingPayment && creditsRef.current && creditsData &&
            ((creditsData as any).creditsTotal !== creditsRef.current.creditsTotal)) {
            setAwaitingPayment(false);
        }
    }, [creditsData, awaitingPayment]);

    // Safety timeout: stop polling after 5 minutes
    React.useEffect(() => {
        if (!awaitingPayment) return;
        const timer = setTimeout(() => setAwaitingPayment(false), 5 * 60 * 1000);
        return () => clearTimeout(timer);
    }, [awaitingPayment]);

    const onCreateCheckoutSession = async (credits: number): Promise<{ checkoutUrl?: string }> => {
        try {
            const result = await checkoutMutation.mutateAsync({ credits } as any) as any;
            if (result?.checkoutUrl) {
                creditsRef.current = creditsData;
                setAwaitingPayment(true);
                window.open(result.checkoutUrl, '_blank')
            }
            // Don't return checkoutUrl — it was already opened in the external browser.
            // Returning it would cause CreditsPurchase to also navigate the Electron
            // webview via window.location.href, loading the web app inside the desktop app.
            return {};
        } catch (e: any) {
            return {};
        }
    }
    // scaffold:end billing

    return (
        <>
            {/* scaffold:begin billing */}
            {import.meta.env.VITE_PAYMENT_GATEWAY !== "none" && (
                <ProgressWithCredits creditsData={creditsData as any} />
            )}
            {/* scaffold:end billing */}
            <UISidebarUser
                session={session}
                status={status}
                onNavigate={onNavigate}
                signOutRedirect="/sign-in"
                onSetPassword={onSetPassword}
                onUpdateAvatar={onUpdateAvatar}
                guestMail={import.meta.env.VITE_GUEST_MAIL}
                adminMail={import.meta.env.VITE_ADMIN_MAIL}
                // scaffold:begin billing
                paymentGateway={import.meta.env.VITE_PAYMENT_GATEWAY}
                creditsData={creditsData as any}
                purchases={purchases as any}
                isBillingLoading={isCreditsLoading || isPurchasesLoading}
                onCreateCheckoutSession={onCreateCheckoutSession}
                // scaffold:end billing
            />
        </>
    )
}

export default SidebarUser;
