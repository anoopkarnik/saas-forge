'use client';

import React, { Suspense } from 'react';
import { BalanceCard, BalanceCardProps } from '@workspace/ui/components/payments/BalanceCard';
import CreditsPurchase, { CreditsPurchaseProps } from '@workspace/ui/components/payments/CreditsPurchase';
import { TransactionHistoryCard, TransactionHistoryCardProps } from '@workspace/ui/components/payments/TransactionHistoryCard';
import { Skeleton } from '@workspace/ui/components/shadcn/skeleton';
import SettingsHeader from '@workspace/ui/components/home/SettingsHeader';
import { useTranslations } from 'use-intl';

export interface PlansBillingProps extends BalanceCardProps, CreditsPurchaseProps, TransactionHistoryCardProps {
    paymentGateway?: string;
}

const PlansBilling = ({ creditsData, isLoading, purchases, onCreateCheckoutSession, paymentGateway }: PlansBillingProps) => {
    const t = useTranslations('billing');
    return (
        <SettingsHeader title={t('title')} description={t('description')}>
            {/* Balance & Credits */}
            <Suspense fallback={<Skeleton className="h-[200px] w-full rounded-xl" />}>
                <BalanceCard creditsData={creditsData} isLoading={isLoading} />
            </Suspense>
            <div className="lg:row-span-2">
                <CreditsPurchase onCreateCheckoutSession={onCreateCheckoutSession} />
            </div>
            {/* History */}
            <div className="mt-8">
                <Suspense fallback={<Skeleton className="h-[300px] w-full rounded-xl" />}>
                    <TransactionHistoryCard purchases={purchases} isLoading={isLoading} />
                </Suspense>
            </div>
        </SettingsHeader>
    );
};

export default PlansBilling;
