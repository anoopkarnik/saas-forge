import * as z from 'zod';

export type AuthValidationMessages = {
    emailRequired: string;
    emailInvalid: string;
    nameRequired: string;
    nameMax: string;
    passwordRequired: string;
    passwordMin: string;
    passwordMax: string;
    confirmPasswordRequired: string;
    confirmPasswordMin: string;
    confirmPasswordMax: string;
    passwordsMismatch: string;
};

// The messages desktop and mobile show today; web passes translated ones.
export const DEFAULT_AUTH_VALIDATION_MESSAGES: AuthValidationMessages = {
    emailRequired: "Email is required",
    emailInvalid: "Invalid email address",
    nameRequired: "Name is required",
    nameMax: "Name must be less than 50 characters",
    passwordRequired: "password is required",
    passwordMin: "password must be at least 8 characters",
    passwordMax: "password must be less than 50 characters",
    confirmPasswordRequired: "confirmPassword is required",
    confirmPasswordMin: "confirmPassword must be at least 8 characters",
    confirmPasswordMax: "confirmPassword must be less than 50 characters",
    passwordsMismatch: "Passwords do not match",
};

export function createAuthSchemas(m: AuthValidationMessages = DEFAULT_AUTH_VALIDATION_MESSAGES) {
    const password = () => z.string().min(1, m.passwordRequired).min(8, m.passwordMin).max(50, m.passwordMax);
    const confirmPassword = () =>
        z.string().min(1, m.confirmPasswordRequired).min(8, m.confirmPasswordMin).max(50, m.confirmPasswordMax);
    const email = () => z.string().min(1, m.emailRequired).email(m.emailInvalid);
    const name = () => z.string().nonempty(m.nameRequired).min(1, m.nameRequired).max(50, m.nameMax);
    const mismatch = { message: m.passwordsMismatch, path: ["confirmPassword"] };

    return {
        ResetPasswordSchema: z.object({ password: password(), confirmPassword: confirmPassword() })
            .refine((data) => data.password === data.confirmPassword, mismatch),
        LoginSchema: z.object({ email: email(), password: password() }),
        ForgotPasswordSchema: z.object({ email: email() }),
        RegisterSchema: z.object({ name: name(), email: email(), password: password(), confirmPassword: confirmPassword() })
            .refine((data) => data.password === data.confirmPassword, mismatch),
        ResetPasswordSettingsSchema: z.object({ currentPassword: password(), newPassword: password(), confirmPassword: confirmPassword() })
            .refine((data) => data.newPassword === data.confirmPassword, mismatch),
        // Adding a password to a social-only account (no current password).
        AddPasswordSchema: z.object({ newPassword: password(), confirmPassword: confirmPassword() })
            .refine((data) => data.newPassword === data.confirmPassword, mismatch),
    };
}

export const {
    ResetPasswordSchema,
    LoginSchema,
    ForgotPasswordSchema,
    RegisterSchema,
    ResetPasswordSettingsSchema,
    AddPasswordSchema,
} = createAuthSchemas();
