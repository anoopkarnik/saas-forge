"use client";

import { CoinsIcon } from "lucide-react"
import { useSession } from "@workspace/auth/better-auth/auth-client";
import { Card, CardContent, CardDescription, CardFooter, CardHeader } from "@workspace/ui/components/shadcn/card"
import { Skeleton } from "@workspace/ui/components/shadcn/skeleton";

export function BalanceCard() {
  const { data: session, isPending } = useSession();

  if (isPending) {
    return <Skeleton className="h-[200px] w-full rounded-xl" />;
  }

  const creditsTotal = session?.user?.creditsTotal ?? 0;
  const creditsUsed = session?.user?.creditsUsed ?? 0;

  return (
    <Card className='relative overflow-hidden bg-gradient-to-br from-primary/20 via-primary/5 to-background border-primary/20 shadow-lg'>
      <div className="absolute top-0 right-0 p-12 -mr-8 -mt-8 bg-primary/10 rounded-full blur-3xl"></div>

      <CardHeader className='pb-2 relative z-10'>
        <CardDescription className='text-muted-foreground font-medium'>
          Available Balance
        </CardDescription>
        <div className='flex items-baseline gap-1'>
          <span className='text-5xl font-extrabold text-foreground tracking-tight'>
            {(creditsTotal - creditsUsed).toLocaleString()}
          </span>
          <span className="text-muted-foreground font-medium">Credits</span>
        </div>
      </CardHeader>

      <CardContent className="relative z-10 pb-6">
        <p className='text-sm text-muted-foreground'>
          Use credits to generate content and perform AI actions.
        </p>
      </CardContent>

      <CoinsIcon
        size={180}
        strokeWidth={0.5}
        className='text-primary/10 absolute -bottom-8 -right-8 rotate-12 pointer-events-none'
      />
    </Card>
  )
}