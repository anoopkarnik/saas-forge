import React from 'react';
import AuthLayout from './AuthLayout';
import LoginCard from '../../components/auth/LoginCard';
import { LoginCardProps, QuoteProps } from '@workspace/auth/utils/typescript';

interface LoginPageProps extends LoginCardProps {
    quote?: QuoteProps;
}

const LoginPage = ({ quote, ...loginProps }: LoginPageProps) => {
    return (
        <AuthLayout quote={quote}>
            <LoginCard {...loginProps} />
        </AuthLayout>
    );
};

export default LoginPage;
