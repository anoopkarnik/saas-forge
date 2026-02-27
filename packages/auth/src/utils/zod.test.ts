import { describe, it, expect } from 'vitest'
import { LoginSchema, RegisterSchema, ResetPasswordSchema, ForgotPasswordSchema, ResetPasswordSettingsSchema, AddPasswordSchema } from './zod'

describe('Auth Validation Schemas', () => {
  describe('LoginSchema', () => {
    it('validates correct email and password', () => {
      const result = LoginSchema.safeParse({ email: 'test@example.com', password: 'password123' })
      expect(result.success).toBe(true)
    })

    it('rejects invalid email', () => {
      const result = LoginSchema.safeParse({ email: 'not-an-email', password: 'password123' })
      expect(result.success).toBe(false)
      if (!result.success) {
        expect(result.error.issues[0]).toBeDefined()
        expect(result.error.issues[0]!.message).toBe('Invalid email address')
      }
    })

    it('rejects short password', () => {
      const result = LoginSchema.safeParse({ email: 'test@example.com', password: 'short' })
      expect(result.success).toBe(false)
    })
  })

  describe('RegisterSchema', () => {
    it('validates a correct registration payload', () => {
      const result = RegisterSchema.safeParse({
        name: 'Anoop Test',
        email: 'test@example.com',
        password: 'password123',
        confirmPassword: 'password123',
      })
      expect(result.success).toBe(true)
    })

    it('rejects when passwords do not match', () => {
      const result = RegisterSchema.safeParse({
        name: 'Anoop Test',
        email: 'test@example.com',
        password: 'password123',
        confirmPassword: 'password124',
      })
      expect(result.success).toBe(false)
      if (!result.success) {
        expect(result.error.issues[0]).toBeDefined()
        expect(result.error.issues[0]!.message).toBe('Passwords do not match')
      }
    })
  })

  describe('ResetPasswordSchema', () => {
    it('validates matching passwords', () => {
        const result = ResetPasswordSchema.safeParse({
            password: 'password123',
            confirmPassword: 'password123',
        })
        expect(result.success).toBe(true)
    })
  })

  describe('ForgotPasswordSchema', () => {
    it('validates correct email', () => {
        const result = ForgotPasswordSchema.safeParse({ email: 'test@example.com' })
        expect(result.success).toBe(true)
    })
  })

  describe('ResetPasswordSettingsSchema', () => {
    it('validates a correct payload', () => {
      const result = ResetPasswordSettingsSchema.safeParse({
        currentPassword: 'password123',
        newPassword: 'newpassword123',
        confirmPassword: 'newpassword123',
      })
      expect(result.success).toBe(true)
    })

    it('rejects when passwords do not match', () => {
      const result = ResetPasswordSettingsSchema.safeParse({
        currentPassword: 'password123',
        newPassword: 'newpassword123',
        confirmPassword: 'newpassword124',
      })
      expect(result.success).toBe(false)
      if (!result.success) {
        expect(result.error.issues[0]).toBeDefined()
        expect(result.error.issues[0]!.message).toBe('Passwords do not match')
      }
    })
  })

  describe('AddPasswordSchema', () => {
    it('validates a correct payload', () => {
      const result = AddPasswordSchema.safeParse({
        newPassword: 'newpassword123',
        confirmPassword: 'newpassword123',
      })
      expect(result.success).toBe(true)
    })

    it('rejects when passwords do not match', () => {
      const result = AddPasswordSchema.safeParse({
        newPassword: 'newpassword123',
        confirmPassword: 'newpassword124',
      })
      expect(result.success).toBe(false)
      if (!result.success) {
        expect(result.error.issues[0]).toBeDefined()
        expect(result.error.issues[0]!.message).toBe('Passwords do not match')
      }
    })
  })
})
