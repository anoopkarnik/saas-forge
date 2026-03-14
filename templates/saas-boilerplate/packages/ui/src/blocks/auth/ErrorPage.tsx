import React from 'react';
import AuthLayout from './AuthLayout';
import ErrorCard from '../../components/auth/ErrorCard';
import { ErrorCardProps, QuoteProps } from '@workspace/auth/utils/typescript';

interface ErrorPageProps extends ErrorCardProps {
    quote?: QuoteProps;
}

const ErrorPage = ({ quote, ...errorProps }: ErrorPageProps) => {
    return (
        <AuthLayout quote={quote}>
            <ErrorCard {...errorProps} />
        </AuthLayout>
    );
};

export default ErrorPage;
