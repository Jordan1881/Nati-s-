export function escHtml(s: string): string {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
}

export function formatILS(amount: number): string {
  return new Intl.NumberFormat('he-IL', { style: 'currency', currency: 'ILS' }).format(amount)
}

const CATEGORY_ORDER = ['תבשילים', 'חומוס', 'סלטים']

export function sortCategories(categories: string[]): string[] {
  return [...categories].sort((a, b) => {
    const ai = CATEGORY_ORDER.indexOf(a)
    const bi = CATEGORY_ORDER.indexOf(b)
    if (ai === -1 && bi === -1) return a.localeCompare(b, 'he')
    if (ai === -1) return 1
    if (bi === -1) return -1
    return ai - bi
  })
}
