import React from 'react';
import AuthLayout from './AuthLayout';
import VerificationCard from '../../components/auth/VerificationCard';
import { VerificationCardProps, QuoteProps } from '@workspace/auth/utils/typescript';

interface VerificationPageProps extends VerificationCardProps {
    quote?: QuoteProps;
}

const VerificationPage = ({ quote, ...verificationProps }: VerificationPageProps) => {
    return (
        <AuthLayout quote={quote}>
            <VerificationCard {...verificationProps} />
        </AuthLayout>
    );
};

export default VerificationPage;
