import { describe, it, expect } from 'vitest'
import { formatAmount } from './formatAmount'

describe('formatAmount', () => {
  it('formats an integer amount correctly', () => {
    expect(formatAmount(10000, 'USD')).toBe('$100.00')
    expect(formatAmount(0, 'USD')).toBe('$0.00')
    expect(formatAmount(500000, 'USD')).toBe('$5,000.00')
  })

  it('formats an amount with cents correctly', () => {
    expect(formatAmount(150, 'USD')).toBe('$1.50')
    expect(formatAmount(99, 'USD')).toBe('$0.99')
    expect(formatAmount(1, 'USD')).toBe('$0.01')
  })

  it('formats negative amounts correctly', () => {
    expect(formatAmount(-10000, 'USD')).toBe('-$100.00')
    expect(formatAmount(-50, 'USD')).toBe('-$0.50')
  })

  it('formats other currencies correctly', () => {
    // Just a basic check that currency works. Note: Depending on locale it might look like €12.34
    const res = formatAmount(1234, 'EUR')
    expect(res).toContain('12.34')
  })
})
