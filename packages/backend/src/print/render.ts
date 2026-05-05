import { PRINT_CSS } from './css.js'

export function wrapDocument(title: string, body: string, autoPrint = true): string {
  const printScript = autoPrint
    ? `<script>
        window.addEventListener('load', function () {
          window.print();
          window.addEventListener('afterprint', function () { window.close(); });
        });
      </script>`
    : ''

  return `<!doctype html>
<html dir="rtl" lang="he">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>${title}</title>
  <style>${PRINT_CSS}</style>
</head>
<body>
${body}
${printScript}
</body>
</html>`
}
