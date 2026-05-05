export const PRINT_CSS = `
@import url('https://fonts.googleapis.com/css2?family=Heebo:wght@400;700;900&display=swap');

* { box-sizing: border-box; margin: 0; padding: 0; }

html, body {
  direction: rtl;
  font-family: "Heebo", "Arial Hebrew", Arial, sans-serif;
  color: #000;
  background: #fff;
}

/* Screen preview: give each page visible separation */
.page {
  padding: 15mm;
  min-height: 230mm;
  display: flex;
  flex-direction: column;
  border-bottom: 2px dashed #ccc;
}
.page:last-child { border-bottom: none; }

/* ── Kitchen bon ─────────────────────────────── */
.bon-header {
  display: flex;
  justify-content: space-between;
  align-items: baseline;
  margin-bottom: 6mm;
}
.kitchen-bon .order-number {
  font-size: 36pt;
  font-weight: 900;
  line-height: 1;
}
.kitchen-bon .pickup-time {
  font-size: 28pt;
  font-weight: 700;
}
.category-group { margin-top: 5mm; }
.category-name {
  font-size: 13pt;
  font-weight: 700;
  text-transform: uppercase;
  border-bottom: 1px solid #000;
  padding-bottom: 1mm;
  margin-bottom: 2mm;
}
.item {
  font-size: 18pt;
  margin: 2mm 0;
  display: flex;
  gap: 3mm;
  align-items: baseline;
}
.item .qty { font-weight: 700; }
.item .unit { font-size: 14pt; color: #444; }
.notes {
  font-size: 16pt;
  margin-top: 5mm;
  padding: 2mm 3mm;
  border-right: 3px solid #000;
  background: #f5f5f5;
}
.bon-footer {
  margin-top: auto;
  padding-top: 4mm;
  text-align: start;
}
.entry-time { font-size: 9pt; color: #555; }

/* ── Customer slip ───────────────────────────── */
.restaurant-header {
  text-align: center;
  font-size: 22pt;
  font-weight: 700;
  margin-bottom: 4mm;
}
.customer-slip .order-number {
  font-size: 22pt;
  font-weight: 700;
  margin: 3mm 0;
}
.customer-info { margin: 3mm 0; }
.info-row { font-size: 18pt; margin: 1.5mm 0; }
.info-row .label { font-weight: 700; }
.slip-items { margin: 3mm 0; }
.slip-line {
  display: flex;
  font-size: 13pt;
  margin: 2mm 0;
  align-items: baseline;
}
.slip-desc { flex-shrink: 0; }
.slip-dots {
  flex: 1;
  border-bottom: 1px dotted #000;
  margin: 0 2mm 3px;
  min-width: 8mm;
}
.slip-price { flex-shrink: 0; font-weight: 700; }
.total {
  font-size: 22pt;
  font-weight: 900;
  text-align: start;
  margin: 4mm 0;
}
.payment { font-size: 16pt; margin: 2mm 0; }
.slip-footer {
  margin-top: auto;
  text-align: center;
  font-size: 10pt;
  padding-top: 4mm;
  border-top: 1px solid #ccc;
}

/* ── Shared ──────────────────────────────────── */
.divider { margin: 4mm 0; border: none; border-top: 1px solid #000; }
.ltr { direction: ltr; unicode-bidi: isolate; display: inline; }

/* ── Print overrides ─────────────────────────── */
@page { size: A4 portrait; margin: 15mm; }

@media print {
  html, body {
    direction: rtl;
    font-family: "Heebo", "Arial Hebrew", Arial, sans-serif;
    color: #000;
    background: #fff;
  }
  .page {
    page-break-after: always;
    padding: 0;
    min-height: 0;
    border-bottom: none;
  }
  .page:last-child { page-break-after: auto; }
  .notes { background: none; }
}
`
