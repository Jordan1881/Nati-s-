import { describe, it, expect } from 'vitest'
import { getActiveSaleDate } from '../activeSaleDate'

// May 2026 calendar reference used for all test dates:
// Thu Apr 30 | Fri May 1 | Sat May 2 | Sun May 3 | Mon May 4 | ... | Fri May 8

function d(year: number, month: number, day: number): Date {
  return new Date(year, month - 1, day)
}

describe('getActiveSaleDate', () => {
  it('returns today when today is Friday', () => {
    const result = getActiveSaleDate(d(2026, 5, 1))
    expect(result.getFullYear()).toBe(2026)
    expect(result.getMonth()).toBe(4) // May (0-indexed)
    expect(result.getDate()).toBe(1)
  })

  it('returns the next Friday when today is Thursday', () => {
    const result = getActiveSaleDate(d(2026, 4, 30))
    expect(result.getDate()).toBe(1)
    expect(result.getMonth()).toBe(4)
  })

  it('returns the next Friday when today is Saturday', () => {
    const result = getActiveSaleDate(d(2026, 5, 2))
    expect(result.getDate()).toBe(8)
    expect(result.getMonth()).toBe(4)
  })

  it('returns the next Friday when today is Sunday', () => {
    const result = getActiveSaleDate(d(2026, 5, 3))
    expect(result.getDate()).toBe(8)
  })

  it('returns the next Friday when today is Monday', () => {
    const result = getActiveSaleDate(d(2026, 5, 4))
    expect(result.getDate()).toBe(8)
  })

  it('zeroes out the time component', () => {
    const friday = d(2026, 5, 1)
    friday.setHours(14, 30, 45, 500)
    const result = getActiveSaleDate(friday)
    expect(result.getHours()).toBe(0)
    expect(result.getMinutes()).toBe(0)
    expect(result.getSeconds()).toBe(0)
    expect(result.getMilliseconds()).toBe(0)
  })

  it('the returned date is always a Friday (getDay() === 5)', () => {
    const days = [
      d(2026, 5, 1), // Fri
      d(2026, 5, 2), // Sat
      d(2026, 5, 3), // Sun
      d(2026, 5, 4), // Mon
      d(2026, 5, 5), // Tue
      d(2026, 5, 6), // Wed
      d(2026, 5, 7), // Thu
    ]
    for (const day of days) {
      expect(getActiveSaleDate(day).getDay()).toBe(5)
    }
  })
})
