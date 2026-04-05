import React from 'react';
import AuthLayout from './AuthLayout';
import ResetPasswordCard from '../../components/auth/ResetPasswordCard';
import { ResetPasswordCardProps, QuoteProps } from '@workspace/auth/utils/typescript';

interface ResetPasswordPageProps extends ResetPasswordCardProps {
    quote?: QuoteProps;
}

const ResetPasswordPage = ({ quote, ...resetProps }: ResetPasswordPageProps) => {
    return (
        <AuthLayout quote={quote}>
            <ResetPasswordCard {...resetProps} />
        </AuthLayout>
    );
};

export default ResetPasswordPage;
