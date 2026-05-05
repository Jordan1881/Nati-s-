/**
 * Returns the active sale date: next upcoming Friday, or today if today is Friday.
 * getDay() === 5 is Friday. Formula (5 - day + 7) % 7 gives daysUntilFriday,
 * which is 0 on Friday itself, so both cases are handled by one expression.
 */
export function getActiveSaleDate(now: Date = new Date()): Date {
  const day = now.getDay()
  const daysUntilFriday = (5 - day + 7) % 7
  const result = new Date(now)
  result.setDate(result.getDate() + daysUntilFriday)
  result.setHours(0, 0, 0, 0)
  return result
}
