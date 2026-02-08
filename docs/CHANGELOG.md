# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [0.3.0] - 2025-02-08

### Added
- Comprehensive README.md with badges, features, and documentation
- CONTRIBUTING.md with development guidelines
- SECURITY.md with security best practices
- GitHub Actions CI/CD workflow
- CODE_OF_CONDUCT.md for community guidelines
- Enhanced project documentation structure

### Changed
- Improved overall project aesthetics
- Enhanced developer documentation
- Updated environment variable documentation

### Documentation
- Added detailed tech stack section
- Added deployment guide for multiple platforms
- Added roadmap section
- Added community support information

## [0.2.0] - 2025-01-26

### Added
- Notion CMS integration for content management
- Dynamic landing page system
- Documentation system with MDX support
- Legal pages (Terms, Privacy, Refund Policy)
- Payment module with Dodo Payments
- Webhook handling for payments
- Form builder for environment variables
- Download and use template functionality

### Fixed
- Payment module corrections
- Authentication callback improvements

### Enhanced
- Component aesthetics across all pages
- Documentation page styling
- Form validations

## [0.1.0] - 2025-01-01

### Added
- Initial project setup with Turborepo monorepo structure
- Next.js 15 application with App Router
- Better Auth integration with social logins (GitHub, Google, LinkedIn)
- Email/password authentication with verification
- Prisma ORM with PostgreSQL
- Redis caching with Upstash
- shadcn/ui component library
- tRPC for type-safe APIs
- React Query for data fetching
- Email templates with Resend
- Winston + Logtail logging
- Shared packages architecture
  - `@workspace/ui` - UI components
  - `@workspace/auth` - Authentication
  - `@workspace/database` - Database & Prisma
  - `@workspace/email` - Email templates
  - `@workspace/observability` - Logging
- CLI tool for project scaffolding
- Development tooling (ESLint, Prettier, TypeScript)
- Vitest for testing

### Development
- Hot reload setup
- Monorepo scripts with Turborepo
- pnpm workspace configuration
- Shared ESLint and TypeScript configs

---

## Legend

- `Added` - New features
- `Changed` - Changes in existing functionality
- `Deprecated` - Soon-to-be removed features
- `Removed` - Removed features
- `Fixed` - Bug fixes
- `Security` - Security improvements
- `Documentation` - Documentation changes
- `Enhanced` - Improvements to existing features

---

For more details, see the [commit history](https://github.com/anoopkarnik/saas-forge/commits/main) or [releases page](https://github.com/anoopkarnik/saas-forge/releases).
