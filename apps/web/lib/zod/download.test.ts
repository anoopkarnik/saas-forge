import { describe, it, expect } from 'vitest';
import { formSchema } from './download';

describe('Download Form Schema', () => {
  const validBaseData = {
    name: 'valid-project',
    NEXT_PUBLIC_THEME: 'blue',
    NEXT_PUBLIC_THEME_TYPE: 'system',
    NEXT_PUBLIC_SAAS_NAME: 'My SaaS',
    NEXT_PUBLIC_COMPANY_NAME: 'My Company',
    NEXT_PUBLIC_URL: 'https://mysaas.com',
    NEXT_PUBLIC_CMS: 'notion',
    LANDING_DATABASE_ID: 'id1',
    HERO_DATABASE_ID: 'id2',
    FEATURE_DATABASE_ID: 'id3',
    TESTIMONIAL_DATABASE_ID: 'id4',
    PRICING_DATABASE_ID: 'id5',
    FAQ_DATABASE_ID: 'id6',
    FOOTER_DATABASE_ID: 'id7',
    DOCUMENTATION_DATABASE_ID: 'id8',
    NOTION_API_TOKEN: 'token',
    UPSTASH_REDIS_REST_URL: 'url',
    UPSTASH_REDIS_REST_TOKEN: 'token',
    NEXT_PUBLIC_AUTH_FRAMEWORK: 'better-auth',
    BETTER_AUTH_SECRET: 'secret',
    NEXT_PUBLIC_AUTH_PROVIDERS: ['github', 'google', 'linkedin', 'email_verification'],
    AUTH_GITHUB_CLIENT_ID: 'id',
    AUTH_GITHUB_CLIENT_SECRET: 'secret',
    AUTH_GOOGLE_CLIENT_ID: 'id',
    AUTH_GOOGLE_CLIENT_SECRET: 'secret',
    AUTH_LINKEDIN_CLIENT_ID: 'id',
    AUTH_LINKEDIN_CLIENT_SECRET: 'secret',
    NEXT_PUBLIC_EMAIL_CLIENT: 'resend',
    RESEND_API_KEY: 'token',
    NEXT_PUBLIC_SUPPORT_FEATURES: ['support_mail', 'calendly'] as any,
    NEXT_PUBLIC_SUPPORT_MAIL: 'support@saas.com',
    NEXT_PUBLIC_CALENDLY_BOOKING_URL: 'url',
    NEXT_PUBLIC_IMAGE_STORAGE: 'vercel_blob',
    BLOB_READ_WRITE_TOKEN: 'token',
    DATABASE_URL: 'url',
    NEXT_PUBLIC_OBSERVABILITY_FEATURES: ['logging'] as any,
    NEXT_PUBLIC_ALLOW_RATE_LIMIT: 'upstash' as any,
    NEXT_PUBLIC_PAYMENT_GATEWAY: 'dodo' as any,
    DODO_PAYMENTS_API_KEY: 'key',
    DODO_PAYMENTS_WEBHOOK_KEY: 'key',
    DODO_PAYMENTS_RETURN_URL: 'url',
    DODO_PAYMENTS_ENVIRONMENT: 'env',
    DODO_CREDITS_PRODUCT_ID: 'id',
    NEXT_PUBLIC_DODO_PAYMENTS_URL: 'url',
  };

  it('should validate correctly with valid data', () => {
    const result = formSchema.safeParse(validBaseData);
    expect(result.success).toBe(true);
  });

  it('should invalidate when missing required notion fields', () => {
    const invalidData = { ...validBaseData, NEXT_PUBLIC_CMS: 'notion', LANDING_DATABASE_ID: '' };
    const result = formSchema.safeParse(invalidData);
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error?.issues[0]?.message).toBe('Required for Notion CMS');
      expect(result.error?.issues[0]?.path).toContain('LANDING_DATABASE_ID');
    }
  });

  it('should invalidate when strapi is selected as CMS', () => {
    const invalidData = { ...validBaseData, NEXT_PUBLIC_CMS: 'strapi' };
    const result = formSchema.safeParse(invalidData);
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error?.issues.some((issue) => issue.message === 'Strapi support is coming soon. Please select Notion.')).toBe(true);
    }
  });

  it('should invalidate when missing required dodo payment fields', () => {
    const invalidData = { ...validBaseData, NEXT_PUBLIC_PAYMENT_GATEWAY: 'dodo', DODO_PAYMENTS_API_KEY: '' };
    const result = formSchema.safeParse(invalidData);
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.issues.some((issue) => issue.message === 'Required for Dodo Payments')).toBe(true);
    }
  });

  it('should invalidate when stripe is selected as payment gateway', () => {
    const invalidData = { ...validBaseData, NEXT_PUBLIC_PAYMENT_GATEWAY: 'stripe' };
    const result = formSchema.safeParse(invalidData);
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.issues.some((issue) => issue.message === 'Stripe support is coming soon. Please select Dodo Payments.')).toBe(true);
    }
  });

  it('should invalidate when vercel_blob is selected and token is missing', () => {
    const invalidData = { ...validBaseData, NEXT_PUBLIC_IMAGE_STORAGE: 'vercel_blob', BLOB_READ_WRITE_TOKEN: '' };
    const result = formSchema.safeParse(invalidData);
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.issues.some((issue) => issue.message === 'Required for Vercel Blob')).toBe(true);
    }
  });

  it('should invalidate when cloudflare_r2 is selected', () => {
    const invalidData = { ...validBaseData, NEXT_PUBLIC_IMAGE_STORAGE: 'cloudflare_r2' };
    const result = formSchema.safeParse(invalidData);
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.issues.some((issue) => issue.message === 'Cloudflare R2 support is coming soon. Please select Vercel Blob.')).toBe(true);
    }
  });

  it('should invalidate when upstash is selected for rate limiting without tokens', () => {
    const invalidData = { ...validBaseData, NEXT_PUBLIC_OBSERVABILITY_FEATURES: ['rate_limiting'], NEXT_PUBLIC_ALLOW_RATE_LIMIT: 'upstash', UPSTASH_REDIS_REST_URL: '' };
    const result = formSchema.safeParse(invalidData);
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.issues.some((issue) => issue.message === 'Required for Upstash')).toBe(true);
    }
  });

  it('should invalidate support mail configuration without mail address or client', () => {
    const invalidData = { 
      ...validBaseData, 
      NEXT_PUBLIC_SUPPORT_FEATURES: ['support_mail'] as any, 
      NEXT_PUBLIC_SUPPORT_MAIL: '',
      NEXT_PUBLIC_EMAIL_CLIENT: 'none' as any
    };
    const result = formSchema.safeParse(invalidData);
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.issues.some((issue) => issue.message === 'Support email is required when Send Message is enabled.')).toBe(true);
      expect(result.error.issues.some((issue) => issue.message === 'An email client is required when a support email is provided. Please select one.')).toBe(true);
    }
  });

  it('should invalidate calendly booking without url', () => {
    const invalidData = { ...validBaseData, NEXT_PUBLIC_SUPPORT_FEATURES: ['calendly'] as any, NEXT_PUBLIC_CALENDLY_BOOKING_URL: '' };
    const result = formSchema.safeParse(invalidData);
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.issues.some((issue) => issue.message === 'Calendly URL is required when Book Meeting is enabled.')).toBe(true);
    }
  });

  it('should invalidate correct providers but missing configuration', () => {
    let result = formSchema.safeParse({ ...validBaseData, NEXT_PUBLIC_AUTH_PROVIDERS: ['email_verification'], NEXT_PUBLIC_EMAIL_CLIENT: 'none' });
    expect(result.success).toBe(false);

    result = formSchema.safeParse({ ...validBaseData, NEXT_PUBLIC_AUTH_PROVIDERS: ['email_verification'], NEXT_PUBLIC_EMAIL_CLIENT: 'resend', RESEND_API_KEY: '' });
    expect(result.success).toBe(false);
    
    result = formSchema.safeParse({ ...validBaseData, NEXT_PUBLIC_AUTH_PROVIDERS: ['linkedin'], AUTH_LINKEDIN_CLIENT_ID: '' });
    expect(result.success).toBe(false);

    result = formSchema.safeParse({ ...validBaseData, NEXT_PUBLIC_AUTH_PROVIDERS: ['google'], AUTH_GOOGLE_CLIENT_ID: '' });
    expect(result.success).toBe(false);

    result = formSchema.safeParse({ ...validBaseData, NEXT_PUBLIC_AUTH_PROVIDERS: ['github'], AUTH_GITHUB_CLIENT_ID: '' });
    expect(result.success).toBe(false);

    result = formSchema.safeParse({ ...validBaseData, NEXT_PUBLIC_AUTH_FRAMEWORK: 'better-auth', BETTER_AUTH_SECRET: '' });
    expect(result.success).toBe(false);
  });

  it('should invalidate when rate_limiting is enabled but provider is missing', () => {
    const invalidData = { 
      ...validBaseData, 
      NEXT_PUBLIC_OBSERVABILITY_FEATURES: ['rate_limiting'],
      NEXT_PUBLIC_ALLOW_RATE_LIMIT: undefined as any
    };
    const result = formSchema.safeParse(invalidData);
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.issues.some((issue) => issue.message === 'Rate limiting provider is required when Rate Limiting is enabled.')).toBe(true);
    }
  });
});
