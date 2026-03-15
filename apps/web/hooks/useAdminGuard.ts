"use client";

import { useEffect } from "react";
import { useSession } from "@workspace/auth/better-auth/auth-client";
import { useRouter } from "next/navigation";

export function useAdminGuard() {
    const { data: session, isPending } = useSession();
    const router = useRouter();

    useEffect(() => {
        if (!isPending) {
            if (!session) {
                router.push("/sign-in");
            } else if (session.user.role !== "admin") {
                router.push("/");
            }
        }
    }, [isPending, session, router]);

    const isAdmin = !isPending && !!session && session.user.role === "admin";

    return { session, isPending, isAdmin };
}
