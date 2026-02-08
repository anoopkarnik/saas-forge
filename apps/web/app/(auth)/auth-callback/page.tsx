"use client"
import React, { useEffect, useState } from "react"
import { authClient } from "@workspace/auth/better-auth/auth-client"
import { useRouter } from "next/navigation"
import LoadingCard from "@/components/auth/LoadingCard" // Using existing loading component

export default function AuthCallbackPage() {
    const router = useRouter()
    const [error, setError] = useState<string | null>(null)

    useEffect(() => {
        const checkSession = async () => {
            try {
                const { data: session } = await authClient.getSession()
                if (session) {
                    router.push("/")
                } else {
                    // If no session found yet, maybe wait a bit or it's a failure.
                    // But usually, better-auth client handles the session sync.
                    // Failing that, redirect to sign-in or stay here.
                    // Let's assume session creation is impending.
                }
            } catch (err) {
                setError("Failed to verify session")
            }
        }

        checkSession()
    }, [router])

    if (error) {
        return <div className="flex h-screen w-full items-center justify-center text-red-500">{error}</div>
    }

    return (
        <div className="flex h-screen w-full items-center justify-center">
            <LoadingCard />
        </div>
    )
}
