import { describe, it, expect } from 'vitest'
import { formatDate } from './formatDate'

describe('formatDate', () => {
  it('formats a string date correctly', () => {
    const rawDate = '2023-12-25T00:00:00.000Z'
    // Depending on timezone, but generally month d, yyyy
    const formatted = formatDate(rawDate)
    expect(formatted).toMatch(/Dec(ember)? 25, 2023/) // match month and year broadly
  })

  it('formats a Unix timestamp correctly', () => {
    const rawDate = 1672531200000 // 2023-01-01
    const formatted = formatDate(rawDate)
    expect(formatted).toMatch(/Jan(uary)? 1, 2023/)
  })

  it('formats a Date object correctly', () => {
    const rawDate = new Date('2024-02-29T12:00:00.000Z')
    const formatted = formatDate(rawDate)
    expect(formatted).toMatch(/Feb(ruary)? 29, 2024/)
  })

  it('returns valid string for current date', () => {
    const formatted = formatDate(new Date())
    expect(typeof formatted).toBe('string')
    expect(formatted.length).toBeGreaterThan(0)
  })
})
