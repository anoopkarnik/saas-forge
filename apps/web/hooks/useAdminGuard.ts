"use client";

import { useEffect } from "react";
import { useSession } from "@workspace/auth/better-auth/auth-client";
import { useRouter } from "next/navigation";

/** `allowGuest`: the read-only demo role may view the page (its writes are refused server-side). */
export function useAdminGuard({ allowGuest = false }: { allowGuest?: boolean } = {}) {
    const { data: session, isPending } = useSession();
    const router = useRouter();

    useEffect(() => {
        if (!isPending) {
            if (!session) {
                router.push("/sign-in");
            } else if (session.user.role !== "admin" && !(allowGuest && session.user.role === "guest")) {
                router.push("/");
            }
        }
    }, [isPending, session, router, allowGuest]);

    const isAdmin = !isPending && !!session && session.user.role === "admin";

    return { session, isPending, isAdmin };
}
