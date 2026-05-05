import { escHtml, formatILS } from './helpers.js'
import type { PrintLine, PrintOrder } from './types.js'

export function renderCustomerSlip(order: PrintOrder, lines: PrintLine[]): string {
  const pickupHtml = order.pickupTime
    ? `<div class="info-row"><span class="label">זמן איסוף:</span> <span class="ltr">${escHtml(order.pickupTime)}</span></div>`
    : ''

  const linesHtml = lines
    .map((l) => {
      const lineTotal = parseFloat(l.priceSnap) * l.quantity
      const desc = l.unitLabelSnap
        ? `${escHtml(l.itemNameSnap)} ${escHtml(l.unitLabelSnap)}`
        : escHtml(l.itemNameSnap)
      return `<div class="slip-line">
                <span class="slip-desc"><span class="ltr">${l.quantity} &times;</span> ${desc}</span>
                <span class="slip-dots"></span>
                <span class="slip-price ltr">${formatILS(lineTotal)}</span>
              </div>`
    })
    .join('')

  const paymentHtml =
    order.paymentStatus === 'paid'
      ? `<div class="payment">תשלום: ${order.paymentMethod === 'cash' ? 'מזומן' : 'אשראי'} &#10003;</div>`
      : ''

  return `<section class="page customer-slip">
    <div class="restaurant-header">NATI&#x2019;s &#x202B;בישול ביתי &amp; חומוס</div>
    <hr class="divider" />
    <div class="order-number">הזמנה #${order.dailyNumber}</div>
    <div class="customer-info">
      <div class="info-row"><span class="label">שם:</span> ${escHtml(order.customerName)}</div>
      <div class="info-row"><span class="label">טלפון:</span> <span class="ltr">${escHtml(order.customerPhone)}</span></div>
      ${pickupHtml}
    </div>
    <hr class="divider" />
    <div class="slip-items">${linesHtml}</div>
    <hr class="divider" />
    <div class="total">&#x202B;סה&quot;כ: <span class="ltr">${formatILS(parseFloat(order.totalPrice))}</span></div>
    ${paymentHtml}
    <div class="slip-footer">
      <div>תודה רבה!</div>
      <div class="ltr">054-8158182</div>
    </div>
  </section>`
}
