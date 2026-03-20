import { createContext, useContext } from "react";
import { useSession } from "@/lib/auth-client";

type AuthContextType = {
    session: any;
    user: any;
    isPending: boolean;
};

const AuthContext = createContext<AuthContextType>({
    session: null,
    user: null,
    isPending: true,
});

export function AuthProvider({ children }: { children: React.ReactNode }) {
    const { data: session, isPending } = useSession();
    return (
        <AuthContext.Provider
            value={{
                session: session?.session ?? null,
                user: session?.user ?? null,
                isPending,
            }}
        >
            {children}
        </AuthContext.Provider>
    );
}

export function useAuth() {
    return useContext(AuthContext);
}
