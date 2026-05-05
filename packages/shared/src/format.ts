const currencyFormatter = new Intl.NumberFormat('he-IL', {
  style: 'currency',
  currency: 'ILS',
})

export function formatCurrency(amount: number): string {
  return currencyFormatter.format(amount)
}

export function formatDate(
  date: Date,
  options: Intl.DateTimeFormatOptions = { dateStyle: 'long' }
): string {
  return new Intl.DateTimeFormat('he-IL', options).format(date)
}
