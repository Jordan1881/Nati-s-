import { escHtml, sortCategories } from './helpers.js'
import type { PrintLine, PrintOrder } from './types.js'

export function renderKitchenBon(order: PrintOrder, lines: PrintLine[]): string {
  const pickupHtml = order.pickupTime
    ? `<span class="pickup-time ltr">&#x23F0; ${escHtml(order.pickupTime)}</span>`
    : ''

  const categories = sortCategories([...new Set(lines.map((l) => l.categorySnap))])

  const itemsHtml =
    lines.length === 0
      ? '<p style="font-size:14pt;color:#999">&lt;empty kitchen bon — no items&gt;</p>'
      : categories
          .map((cat) => {
            const catLines = lines.filter((l) => l.categorySnap === cat).sort((a, b) => a.id - b.id)
            const linesHtml = catLines
              .map(
                (l) =>
                  `<div class="item">
                    <span class="qty ltr">${l.quantity} &times;</span>
                    <span class="name">${escHtml(l.itemNameSnap)}${l.unitLabelSnap ? ` <span class="unit">${escHtml(l.unitLabelSnap)}</span>` : ''}</span>
                  </div>`
              )
              .join('')
            return `<div class="category-group">
                      <h3 class="category-name">${escHtml(cat)}</h3>
                      ${linesHtml}
                    </div>`
          })
          .join('')

  const notesHtml = order.notes?.trim()
    ? `<hr class="divider" /><div class="notes"><strong>הערות:</strong> ${escHtml(order.notes)}</div>`
    : ''

  const createdAt = order.createdAt instanceof Date ? order.createdAt : new Date(order.createdAt)
  const entryTime = createdAt.toLocaleTimeString('he-IL', {
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
    timeZone: 'Asia/Jerusalem',
  })

  return `<section class="page kitchen-bon">
    <div class="bon-header">
      <span class="order-number">הזמנה #${order.dailyNumber}</span>
      ${pickupHtml}
    </div>
    <hr class="divider" />
    <div class="items">${itemsHtml}</div>
    ${notesHtml}
    <div class="bon-footer">
      <span class="entry-time ltr">נקלט ב-${entryTime}</span>
    </div>
  </section>`
}
