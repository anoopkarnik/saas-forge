import { Card, CardContent, CardDescription, CardTitle } from "@workspace/ui/components/shadcn/card";
import { ArrowLeftRightIcon, Info } from "lucide-react";
import { auth } from "@workspace/auth/better-auth/auth";
import { headers } from "next/headers";
import db from "@workspace/database/client";
import InvoiceBtn from "./InvoiceBtn";
import { formatDate } from "@/lib/utils/formatDate";
import { formatAmount } from "@/lib/utils/formatAmount";
import { Key } from "react";

export async function TransactionHistoryCard() {
  const session = await auth.api.getSession({
    headers: await headers(),
  });
  if (!session?.user?.id) {
    throw new Error("User not authenticated");
  }

  const purchases = await db.transaction.findMany({
    where: {
      userId: session.user.id
    },
    orderBy: {
      date: "desc"
    }
  })
  return (
    <Card className='bg-sidebar p-4'>
      <CardTitle className='text-2xl font-bold flex flex-col gap-2'>
        <div className="flex items-center gap-2">
          Transaction History
        </div>
        <div className="flex items-center gap-2 text-sm opacity-50">
          <Info className="h-4 w-4" />
          <p className="text-left">View your transaction history and download invoices</p>
        </div>
      </CardTitle>

      <CardContent className='space-y-4'>
        {purchases.length === 0 && (
          <p className='text-muted-foreground text-center'>
            No transactions found
          </p>
        )}
        {purchases.map((purchase: { id: Key | null | undefined; date: Date; amount: number; currency: string; eventId: string; }, index: number) => (
          <div key={purchase.id} className='flex justify-between items-center py-3 border-b last:border-b-0'>
            <div className='flex items-center gap-2 '>
              <div>
                {index + 1})
              </div>
              <div >
                <p className='font-medium'> {formatDate(purchase.date)}</p>
              </div>
            </div>
            <div className='text-right flex items-center gap-4'>
              <p className='font-medium'>
                {formatAmount(purchase.amount, purchase.currency)}
              </p>
              <InvoiceBtn id={purchase.eventId} />
            </div>
          </div>
        ))}
      </CardContent>
    </Card>
  )
}