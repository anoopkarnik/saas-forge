# Security Policy

## Supported Versions

We release patches for security vulnerabilities in the following versions:

| Version | Supported          |
| ------- | ------------------ |
| 0.3.x   | :white_check_mark: |
| < 0.3   | :x:                |

## Reporting a Vulnerability

We take the security of SaaS Forge seriously. If you believe you have found a security vulnerability, please report it to us as described below.

### Please do NOT:

- Open a public GitHub issue for security vulnerabilities
- Disclose the vulnerability publicly before it has been addressed

### Please DO:

1. **Email us directly** at security@saasforge.dev with:
   - A description of the vulnerability
   - Steps to reproduce the issue
   - Potential impact of the vulnerability
   - Any possible mitigations you've identified

2. **Allow us time to respond** - We will:
   - Acknowledge receipt within 48 hours
   - Provide a detailed response within 7 days
   - Keep you informed of our progress
   - Credit you in our security advisory (if desired)

## Security Best Practices

When using SaaS Forge, we recommend:

### Environment Variables

- **Never commit** `.env` files to version control
- **Use strong secrets** for `BETTER_AUTH_SECRET` (min 32 characters)
- **Rotate secrets regularly**, especially after team changes
- **Use different secrets** for dev, staging, and production

### Authentication

- **Enable 2FA** for production deployments
- **Use OAuth providers** when possible for additional security
- **Implement rate limiting** on authentication endpoints
- **Monitor failed login attempts**

### Database

- **Use connection pooling** with appropriate limits
- **Enable SSL/TLS** for database connections
- **Regularly backup** your database
- **Keep Prisma** and database drivers up to date

### API Security

- **Validate all inputs** using Zod schemas
- **Implement rate limiting** on public endpoints
- **Use CORS appropriately** - don't use `*` in production
- **Keep dependencies updated** - run `pnpm audit` regularly

### Deployment

- **Use environment-specific configs**
- **Enable HTTPS only** in production
- **Set security headers** appropriately
- **Monitor application logs** for suspicious activity
- **Keep Node.js and pnpm updated**

## Known Security Considerations

### Notion API Keys

- Notion API keys have workspace-level access
- Store them securely and rotate regularly
- Use workspace-specific integrations

### Redis/Upstash

- Always use TLS connections
- Don't store sensitive user data without encryption
- Set appropriate key expiration times

### Payment Webhooks

- Always verify webhook signatures
- Use HTTPS endpoints only
- Implement idempotency for webhook handlers
- Log all webhook events for audit trails

## Security Updates

Security updates will be released as patch versions and announced through:

- GitHub Security Advisories
- Release notes
- Email notifications (for serious vulnerabilities)

## Third-Party Dependencies

We regularly audit our dependencies for known vulnerabilities using:

- `pnpm audit`
- GitHub Dependabot
- Snyk (optional)

## Compliance

SaaS Forge is designed to help you build compliant applications:

- **GDPR**: User data deletion capabilities
- **CCPA**: User data export capabilities
- **PCI DSS**: Never store payment card data (handled by payment provider)

However, compliance is ultimately your responsibility. Please review requirements for your specific use case.

## Contact

- **Security issues**: security@saasforge.dev
- **General questions**: support@saasforge.dev
- **GitHub**: https://github.com/anoopkarnik/saas-forge

## Acknowledgments

We appreciate responsible disclosure and will acknowledge security researchers in our release notes (with permission).

---

Thank you for helping keep SaaS Forge and its users safe!
