import { describe, it, expect } from 'vitest';
import { render } from '@react-email/render';
import EmailVerification from './EmailVerification';
import ResetPassword from './ResetPassword';
import Invitation from './Invitation';

describe('Email Templates', () => {
    describe('EmailVerification', () => {
        it('should render the verification link and company name correctly', async () => {
            const html = await render(
                // @ts-ignore
                <EmailVerification verificationLink="https://example.com/verify?token=123" company="Acme Corp" />
            );

            expect(html).toContain('Verify Your Email');
            expect(html).toContain('Acme Corp');
            expect(html).toContain('https://example.com/verify?token=123');
            expect(html).toContain('href="https://example.com/verify?token=123"');
        });
    });

    describe('ResetPassword', () => {
        it('should render the reset link and company name correctly', async () => {
            const html = await render(
                // @ts-ignore
                <ResetPassword resetPasswordLink="https://example.com/reset?token=abc" company="Acme Corp" />
            );

            expect(html).toContain('Reset your Password');
            expect(html).toContain('Acme Corp');
            expect(html).toContain('https://example.com/reset?token=abc');
            expect(html).toContain('href="https://example.com/reset?token=abc"');
        });
    });

    describe('Invitation', () => {
        it('renders the invitation template with the invite link', async () => {
            const html = await render(
                // @ts-ignore
                Invitation({ inviteLink: "https://x.test/sign-up?invite=abc", company: "Acme" })
            );
            expect(html).toContain("https://x.test/sign-up?invite=abc");
            expect(html).toContain("Acme");
        });
    });
});
