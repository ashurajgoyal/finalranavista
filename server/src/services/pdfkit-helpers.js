import { LOTUS, WORDMARK } from '../utils/brandPaths.js';

export const GREEN = '#0D3B32';
export const GOLD = '#B89B6B';
export const MUTED = '#6B7A78';
export const INK = '#1F2D2A';

// PDFKit's built-in Helvetica has no ₹ glyph — always print currency codes in PDFs.
export const pdfMoney = (n, currency = 'USD') =>
  `${currency} ${Number(n || 0).toLocaleString(currency === 'INR' ? 'en-IN' : 'en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
export const pdfDate = (d) => (d ? new Date(d).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }) : '—');

/** Green header band with the lotus + RANAVISTA wordmark and a right-aligned title. */
export function brandHeader(doc, title, { height = 90 } = {}) {
  doc.rect(0, 0, doc.page.width, height).fill(GREEN);
  const ls = 44 / LOTUS.h;
  doc.save().translate(doc.page.margins.left, (height - 44) / 2).scale(ls).path(LOTUS.d).fill(GOLD, 'even-odd').restore();
  const ws = 19 / WORDMARK.h;
  const x = doc.page.margins.left + 74;
  doc.save().translate(x, height / 2 - 17).scale(ws).path(WORDMARK.d).fill('#F7F3EA', 'even-odd').restore();
  doc.fontSize(6.5).font('Helvetica').fillColor(GOLD).text('SOURCING TODAY FOR A BRIGHTER TOMORROW', x, height / 2 + 10, { characterSpacing: 1.2, lineBreak: false });
  if (title) doc.fillColor('#fff').fontSize(18).font('Times-Roman').text(title, 0, height / 2 - 10, { align: 'right', width: doc.page.width - doc.page.margins.right, lineBreak: false });
  doc.fillColor(INK).font('Helvetica');
}

export function brandFooter(doc, text = '© Ranavista · Building Sustainable Partnerships Worldwide') {
  const y = doc.page.height - 32;
  doc.save();
  doc.rect(0, y, doc.page.width, 32).fill(GREEN);
  doc.fillColor('#fff').fontSize(7.5).font('Helvetica').text(text, doc.page.margins.left, y + 12, { lineBreak: false, width: doc.page.width - doc.page.margins.left * 2 });
  doc.restore();
}
