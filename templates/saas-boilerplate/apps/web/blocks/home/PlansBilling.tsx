'use client';

import React, { Suspense } from 'react';
import { BalanceCard } from '@/components/payments/BalanceCard';
import CreditsPurchase from '@/components/payments/CreditsPurchase';
import { TransactionHistoryCard } from '@/components/payments/TransactionHistoryCard';
import { Skeleton } from '@workspace/ui/components/shadcn/skeleton';
import SettingsHeader from '@/components/home/SettingsHeader';

const PlansBilling = () => {
    return (
        <SettingsHeader title="Billing" description="Manage your credits, and view transaction history.">
            {/* Balance & Credits */}
            <Suspense fallback={<Skeleton className="h-[200px] w-full rounded-xl" />}>
                <BalanceCard />
            </Suspense>
            <div className="lg:row-span-2">
                <CreditsPurchase />
            </div>
            {/* History */}
            <div className="mt-8">
                <Suspense fallback={<Skeleton className="h-[300px] w-full rounded-xl" />}>
                    <TransactionHistoryCard />
                </Suspense>
            </div>
        </SettingsHeader>
    );
};

export default PlansBilling;
