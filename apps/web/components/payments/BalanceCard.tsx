import { CoinsIcon } from "lucide-react"
import { auth } from "@workspace/auth/better-auth/auth";
import { Card, CardContent, CardDescription, CardFooter, CardHeader } from "@workspace/ui/components/shadcn/card"
import { headers } from "next/headers";

export async function BalanceCard() {
  const session = await auth.api.getSession({
    headers: await headers() // you need to pass the headers object.
  })
  return (
    <Card className='bg-gradient-to-br from-primary/10 via-primary/5 to-background 
    border-primary/20 shadow-lg flex justify-between flex-col overflow-hidden'>
      <CardHeader className='px-6 relative'>
        <div className='flex justify-between items-center'>
          <div>
            <h3 className='text-lg font-semibold text-foreground mb-1'>
              Available Credits
            </h3>
            <p className='text-4xl font-bold text-primary'>
              {(session.user?.creditsTotal - session.user?.creditsUsed)}
            </p>
          </div>
          <CoinsIcon size={140} className='text-primary opacity-20 absolute bottom-0 right-0' />
        </div>
        <CardDescription className='text-muted-foreground text-sm'>
          When your credit balance reaches zero, your workflows will stop working
        </CardDescription>
      </CardHeader>

    </Card>
  )
}