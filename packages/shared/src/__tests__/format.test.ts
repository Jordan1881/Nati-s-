import { describe, it, expect } from 'vitest'
import { formatCurrency, formatDate } from '../format'

describe('formatCurrency', () => {
  it('formats a whole number amount in ILS', () => {
    const result = formatCurrency(100)
    expect(result).toContain('100')
    expect(result).toContain('₪')
  })

  it('formats a decimal amount', () => {
    const result = formatCurrency(55.5)
    expect(result).toContain('55')
    expect(result).toContain('₪')
  })

  it('formats zero', () => {
    const result = formatCurrency(0)
    expect(result).toContain('0')
    expect(result).toContain('₪')
  })
})

describe('formatDate', () => {
  it('returns a non-empty Hebrew date string', () => {
    const result = formatDate(new Date(2026, 4, 1)) // May 1, 2026
    expect(result.length).toBeGreaterThan(0)
  })

  it('includes the year', () => {
    const result = formatDate(new Date(2026, 4, 1))
    expect(result).toContain('2026')
  })
})
