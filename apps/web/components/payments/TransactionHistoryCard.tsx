"use client";

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@workspace/ui/components/shadcn/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@workspace/ui/components/shadcn/table";
import { Badge } from "@workspace/ui/components/shadcn/badge";
import { FileText, History, Loader2 } from "lucide-react";
import InvoiceBtn from "./InvoiceBtn";
import { formatDate } from "@/lib/utils/formatDate";
import { formatAmount } from "@/lib/utils/formatAmount";
import { useTRPC } from "@/trpc/client";
import { useQuery } from "@tanstack/react-query";

export function TransactionHistoryCard() {
  const trpc = useTRPC();
  const { data: purchases, isLoading } = useQuery({
    ...trpc.billing.getTransactions.queryOptions()
  });

  return (
    <Card className='shadow-sm border-border/60'>
      <CardHeader>
        <div className="flex items-center gap-2 mb-1">
          <History className="h-5 w-5 text-muted-foreground" />
          <CardTitle className='text-xl font-bold'>Transaction History</CardTitle>
        </div>
        <CardDescription>
          View your purchase history and download invoices for your records.
        </CardDescription>
      </CardHeader>

      <CardContent>
        {isLoading ? (
          <div className="flex justify-center p-8">
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
          </div>
        ) : purchases?.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-12 text-center bg-muted/20 rounded-lg border border-dashed border-border/50">
            <FileText className="h-10 w-10 text-muted-foreground/30 mb-3" />
            <p className='text-muted-foreground font-medium'>No transactions found</p>
            <p className='text-xs text-muted-foreground/70 mt-1'>Purchases you make will appear here.</p>
          </div>
        ) : (
          <div className="rounded-md border overflow-hidden">
            <Table>
              <TableHeader>
                <TableRow className="bg-muted/50">
                  <TableHead className="w-[100px]">#</TableHead>
                  <TableHead>Date</TableHead>
                  <TableHead>Description</TableHead>
                  <TableHead>Amount</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Invoice</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {purchases?.map((purchase: any, index: number) => (
                  <TableRow key={purchase.id}>
                    <TableCell className="font-medium text-muted-foreground">{index + 1}</TableCell>
                    <TableCell>{formatDate(purchase.date)}</TableCell>
                    <TableCell className="text-muted-foreground">Credit Purchase</TableCell>
                    <TableCell className="font-semibold">{formatAmount(purchase.amount, purchase.currency)}</TableCell>
                    <TableCell>
                      <Badge variant="outline" className="bg-green-500/10 text-green-600 border-green-200 dark:border-green-800">Paid</Badge>
                    </TableCell>
                    <TableCell className="text-right">
                      <InvoiceBtn receiptUrl={purchase.receiptUrl} />
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}
      </CardContent>
    </Card>
  )
}