import React from 'react';
import Quote from '../../components/auth/Quote';
import { QuoteProps } from '@workspace/auth/utils/typescript';

interface AuthLayoutProps {
    children: React.ReactNode;
    quote?: QuoteProps;
}

const AuthLayout = ({ children, quote }: AuthLayoutProps) => {
    return (
        <main id="main-content" tabIndex={-1} className={`min-h-screen bg-background grid grid-cols-1 lg:grid-cols-2 w-full`}>
            <div className="flex items-center justify-center bg-gradient-to-br from-primary to-sidebar dark:bg-gradient-to-br p-4 sm:p-8 overflow-y-auto flex-1">
                <div className="w-full max-w-md">
                    {children}
                </div>
            </div>

            <div className="hidden lg:block h-full">
                <Quote quote={quote} />
            </div>

        </main>
    );
};

export default AuthLayout;
