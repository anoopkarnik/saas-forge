# Contributing to SaaS Forge

First off, thank you for considering contributing to SaaS Forge! It's people like you that make SaaS Forge such a great tool.

## Code of Conduct

This project and everyone participating in it is governed by our commitment to providing a welcoming and inspiring community for all. By participating, you are expected to uphold this code.

## How Can I Contribute?

### Reporting Bugs

Before creating bug reports, please check the existing issues to avoid duplicates. When you create a bug report, include as many details as possible:

- **Use a clear and descriptive title**
- **Describe the exact steps to reproduce the problem**
- **Provide specific examples**
- **Describe the behavior you observed and what you expected**
- **Include screenshots if possible**
- **Include your environment details** (OS, Node version, pnpm version, etc.)

### Suggesting Enhancements

Enhancement suggestions are tracked as GitHub issues. When creating an enhancement suggestion:

- **Use a clear and descriptive title**
- **Provide a detailed description of the suggested enhancement**
- **Explain why this enhancement would be useful**
- **List some examples of how it would be used**

### Pull Requests

1. **Fork the repository** and create your branch from `main`
2. **Follow the setup instructions** in the README
3. **Make your changes** following our coding standards
4. **Add tests** if you're adding functionality
5. **Ensure the test suite passes**: `pnpm test`
6. **Lint your code**: `pnpm lint`
7. **Format your code**: `pnpm format`
8. **Write a clear commit message** following our conventions
9. **Push to your fork** and submit a pull request

## Development Setup

```bash
# Clone your fork
git clone https://github.com/YOUR_USERNAME/saas-forge.git
cd saas-forge

# Install dependencies
pnpm install

# Copy environment file
cp apps/web/.env.example apps/web/.env

# Generate Prisma client
pnpm run generate

# Start development server
pnpm dev
```

## Project Structure

```
saas-forge/
├── apps/web/           # Main Next.js application
├── packages/           # Shared packages
│   ├── ui/            # UI components
│   ├── auth/          # Authentication
│   ├── database/      # Database & Prisma
│   ├── email/         # Email templates
│   ├── cms/           # CMS integration
│   └── observability/ # Logging
└── scripts/           # Build & CLI scripts
```

## Coding Standards

### TypeScript

- Use TypeScript strict mode
- Prefer interfaces over types when possible
- Always type function parameters and return values
- Avoid using `any` - use `unknown` if type is truly unknown

### React Components

```typescript
// ✅ Good
interface ButtonProps {
  variant: 'primary' | 'secondary'
  onClick: () => void
  children: React.ReactNode
}

export function Button({ variant, onClick, children }: ButtonProps) {
  return <button onClick={onClick}>{children}</button>
}

// ❌ Bad - no types
export function Button({ variant, onClick, children }) {
  return <button onClick={onClick}>{children}</button>
}
```

### Naming Conventions

- **Components**: PascalCase (`Button.tsx`, `UserProfile.tsx`)
- **Utilities**: camelCase (`formatDate.ts`, `validateEmail.ts`)
- **Constants**: UPPER_SNAKE_CASE (`MAX_RETRIES`, `API_URL`)
- **Types/Interfaces**: PascalCase (`User`, `ApiResponse`)

### File Organization

- Keep files small and focused (< 200 lines ideally)
- Group related functionality together
- Use barrel exports (`index.ts`) for cleaner imports
- Place tests next to the code they test

### Comments

- Write self-documenting code when possible
- Add comments for complex business logic
- Use JSDoc for public APIs

```typescript
/**
 * Fetches user data from the API with caching
 * @param userId - The unique identifier for the user
 * @returns Promise resolving to user data
 * @throws {ApiError} When the API request fails
 */
async function fetchUser(userId: string): Promise<User> {
  // Implementation
}
```

## Commit Message Guidelines

We follow [Conventional Commits](https://www.conventionalcommits.org/):

```
<type>[optional scope]: <description>

[optional body]

[optional footer(s)]
```

### Types

- `feat`: New feature
- `fix`: Bug fix
- `docs`: Documentation changes
- `style`: Code style changes (formatting, etc.)
- `refactor`: Code refactoring
- `perf`: Performance improvements
- `test`: Adding or updating tests
- `chore`: Maintenance tasks
- `ci`: CI/CD changes

### Examples

```bash
feat(auth): add LinkedIn OAuth provider
fix(payments): resolve webhook signature validation
docs: update installation instructions
refactor(ui): simplify Button component API
test(cms): add tests for Notion integration
```

## Testing

### Writing Tests

```typescript
import { describe, it, expect } from 'vitest'

describe('formatDate', () => {
  it('should format date correctly', () => {
    const date = new Date('2025-01-01')
    expect(formatDate(date)).toBe('January 1, 2025')
  })

  it('should handle invalid dates', () => {
    expect(() => formatDate(null)).toThrow()
  })
})
```

### Running Tests

```bash
# Run all tests
pnpm test

# Run tests in watch mode
pnpm test -- --watch

# Run tests with coverage
pnpm test -- --coverage
```

## Documentation

- Update README.md if you change functionality
- Add JSDoc comments for public APIs
- Update inline code comments if logic changes
- Consider adding examples for complex features

## Style Guide

### ESLint & Prettier

We use ESLint and Prettier for code consistency:

```bash
# Check for linting errors
pnpm lint

# Auto-fix linting errors
pnpm lint:fix

# Format code with Prettier
pnpm format
```

### Import Organization

```typescript
// 1. External dependencies
import React from 'react'
import { useQuery } from '@tanstack/react-query'

// 2. Internal dependencies (workspace packages)
import { Button } from '@workspace/ui/components/button'
import { useAuth } from '@workspace/auth/client'

// 3. Relative imports
import { UserAvatar } from './UserAvatar'
import type { User } from './types'
```

## Package-Specific Guidelines

### UI Package (`packages/ui`)

- Follow shadcn/ui patterns
- Make components composable
- Support dark mode
- Include accessibility attributes

### Auth Package (`packages/auth`)

- Never log sensitive data
- Always validate input
- Use secure defaults
- Handle errors gracefully

### Database Package (`packages/database`)

- Write migrations for schema changes
- Add indexes for frequently queried fields
- Use transactions for multi-step operations
- Document complex queries

## Review Process

1. **Automated Checks**: All PRs must pass CI checks (lint, test, build)
2. **Code Review**: At least one maintainer must approve
3. **Testing**: Ensure your changes work in development
4. **Documentation**: Update docs if needed
5. **Merge**: Maintainers will merge approved PRs

## Getting Help

- 💬 **Discussions**: Use [GitHub Discussions](https://github.com/anoopkarnik/saas-forge/discussions) for questions
- 🐛 **Issues**: Report bugs via [GitHub Issues](https://github.com/anoopkarnik/saas-forge/issues)
- 📧 **Email**: Reach out at support@saasforge.dev

## Recognition

Contributors are recognized in:
- GitHub contributors list
- Release notes for significant contributions
- Special mentions for major features

## License

By contributing, you agree that your contributions will be licensed under the MIT License.

---

Thank you for contributing to SaaS Forge! 🎉
