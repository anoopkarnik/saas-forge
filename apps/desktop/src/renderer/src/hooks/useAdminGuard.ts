import { useEffect } from "react";
import { useSession } from "@workspace/auth/better-auth/auth-client";
import { useNavigate } from "react-router-dom";

export function useAdminGuard() {
    const { data: session, isPending } = useSession();
    const navigate = useNavigate();

    useEffect(() => {
        if (!isPending) {
            if (!session) {
                navigate("/sign-in");
            } else if (session.user.role !== "admin") {
                navigate("/");
            }
        }
    }, [isPending, session, navigate]);

    const isAdmin = !isPending && !!session && session.user.role === "admin";

    return { session, isPending, isAdmin };
}
