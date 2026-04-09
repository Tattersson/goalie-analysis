'use client';

interface PrintAnalysisButtonProps {
  playerName: string;
  season: string;
  source: string;
  analysisText: string;
}

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/\"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

export default function PrintAnalysisButton({
  playerName,
  season,
  source,
  analysisText,
}: PrintAnalysisButtonProps) {
  const handlePrint = () => {
    const printWindow = window.open('', '_blank', 'noopener,noreferrer,width=900,height=700');
    if (!printWindow) {
      return;
    }

    const title = `${playerName} - Goalie Analysis (${season})`;
    const safeTitle = escapeHtml(title);
    const safeSource = escapeHtml(source);
    const safeBody = escapeHtml(analysisText).replace(/\n/g, '<br />');

    const html = `
      <!doctype html>
      <html>
        <head>
          <meta charset="utf-8" />
          <title>${safeTitle}</title>
          <style>
            body {
              font-family: Arial, sans-serif;
              margin: 28px;
              color: #111827;
              line-height: 1.55;
            }
            h1 {
              font-size: 22px;
              margin: 0 0 6px;
            }
            .meta {
              color: #4b5563;
              font-size: 13px;
              margin-bottom: 18px;
            }
            .content {
              border: 1px solid #d1d5db;
              border-radius: 8px;
              padding: 14px;
              font-size: 14px;
              white-space: normal;
            }
          </style>
        </head>
        <body>
          <h1>${safeTitle}</h1>
          <div class="meta">Source: ${safeSource}</div>
          <div class="content">${safeBody}</div>
        </body>
      </html>
    `;

    printWindow.document.open();
    printWindow.document.write(html);
    printWindow.document.close();

    // Wait for popup layout to finish before printing to avoid blank previews.
    printWindow.onload = () => {
      printWindow.requestAnimationFrame(() => {
        setTimeout(() => {
          printWindow.focus();
          printWindow.print();
        }, 150);
      });
    };

    printWindow.onafterprint = () => {
      printWindow.close();
    };
  };

  return (
    <button
      type="button"
      onClick={handlePrint}
      className="rounded-full border border-emerald-400 bg-white px-3 py-1 text-xs font-medium text-emerald-700 hover:bg-emerald-100"
    >
      Print PDF
    </button>
  );
}
