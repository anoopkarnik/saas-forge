import React from "react"
import { useNavigate } from "react-router-dom"
import { useTRPC } from '../../lib/trpc';
import { useMutation } from "@tanstack/react-query";
import { useSession } from "@workspace/auth/better-auth/auth-client";
import UISidebarUser from "@workspace/ui/components/home/SidebarUser"

const SidebarUser = () => {
    const navigate = useNavigate();
    const trpc = useTRPC() as any;

    const { data: session, status, refetch: refetchSession } = useSession({
        fetchOptions: {
            baseURL: import.meta.env.VITE_API_URL || 'http://localhost:3000',
            credentials: "include"
        }
    });

    const setPasswordMutation = useMutation(trpc.home.setPassword.mutationOptions());

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
            paymentGateway="none"
            isBillingLoading={false}
        />
    )
}

export default SidebarUser;
