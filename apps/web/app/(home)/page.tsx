"use client"
import { useSession } from "@workspace/auth/better-auth/auth-client";
import { Button } from "@workspace/ui/components/shadcn/button"

export default function Page() {
  const {data: session} = useSession();
  return (
    <div className="flex items-center justify-center min-h-svh">
      <div className="flex flex-col items-center justify-center gap-4">
        <h1 className="text-2xl font-bold">Home</h1>
        <pre>
          
        </pre>
      </div>
    </div>
  )
}
