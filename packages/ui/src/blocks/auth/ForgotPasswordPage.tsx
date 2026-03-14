import React from 'react';
import AuthLayout from './AuthLayout';
import ForgotPasswordCard from '../../components/auth/ForgotPasswordCard';
import { ForgotPasswordCardProps, QuoteProps } from '@workspace/auth/utils/typescript';

interface ForgotPasswordPageProps extends ForgotPasswordCardProps {
    quote?: QuoteProps;
}

const ForgotPasswordPage = ({ quote, ...forgotProps }: ForgotPasswordPageProps) => {
    return (
        <AuthLayout quote={quote}>
            <ForgotPasswordCard {...forgotProps} />
        </AuthLayout>
    );
};

export default ForgotPasswordPage;
