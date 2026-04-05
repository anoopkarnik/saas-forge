import React from 'react';
import AuthLayout from './AuthLayout';
import RegisterCard from '../../components/auth/RegisterCard';
import { RegisterCardProps, QuoteProps } from '@workspace/auth/utils/typescript';

interface RegisterPageProps extends RegisterCardProps {
    quote?: QuoteProps;
}

const RegisterPage = ({ quote, ...registerProps }: RegisterPageProps) => {
    return (
        <AuthLayout quote={quote}>
            <RegisterCard {...registerProps} />
        </AuthLayout>
    );
};

export default RegisterPage;
