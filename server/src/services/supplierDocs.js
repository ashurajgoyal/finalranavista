import PDFDocument from 'pdfkit';
import fs from 'fs';
import path from 'path';
import { PRIVATE_DIR } from '../middleware/upload.js';
import { GOLD, GREEN, INK, MUTED, brandFooter, brandHeader, pdfDate, pdfMoney } from './pdfkit-helpers.js';

const write = (doc, file) =>
  new Promise((resolve, reject) => {
    const full = path.join(PRIVATE_DIR, file);
    const out = fs.createWriteStream(full);
    doc.pipe(out);
    doc.end();
    out.on('finish', () => resolve(file));
    out.on('error', reject);
  });

export const privatePath = (file) => path.join(PRIVATE_DIR, path.basename(String(file || '')));

function fillNda(body, app, s) {
  const map = {
    supplierName: app.companyName,
    supplierAddress: [app.address, app.city, app.state, app.country].filter(Boolean).join(', '),
    supplierGst: app.gst,
    companyLegalName: s.companyLegalName,
    companyAddress: s.companyAddress ? `, ${s.companyAddress}` : '',
    date: pdfDate(app.nda?.sentAt || new Date()),
  };
  return String(body).replace(/\{\{(\w+)\}\}/g, (_, k) => map[k] ?? '');
}

/** NDA PDF for a supplier application. When the NDA is signed, the signature block is filled in. */
export async function generateNdaPdf(app, settings) {
  const signed = !!app.nda?.signedAt;
  const doc = new PDFDocument({ size: 'A4', margins: { top: 50, bottom: 60, left: 55, right: 55 } });
  brandHeader(doc, signed ? 'SIGNED NDA' : 'NDA');
  doc.moveDown(0);
  doc.y = 115;
  doc.font('Times-Bold').fontSize(16).fillColor(GREEN).text(settings.ndaTitle, { align: 'left' });
  doc.font('Helvetica').fontSize(8.5).fillColor(MUTED).text(`Ref. ${app.number} · Version ${settings.ndaVersion}`);
  doc.moveDown(1);
  doc.font('Helvetica').fontSize(10).fillColor(INK);
  fillNda(settings.ndaBody, app, settings).split(/\n\s*\n/).forEach((para) => {
    doc.text(para.trim(), { align: 'justify', lineGap: 2 });
    doc.moveDown(0.7);
  });

  if (doc.y > doc.page.height - 230) doc.addPage();
  doc.moveDown(1);
  const y = doc.y;
  const col = (doc.page.width - 110) / 2;
  const block = (x, heading, lines) => {
    doc.fontSize(8.5).fillColor(GOLD).font('Helvetica-Bold').text(heading, x, y, { width: col, characterSpacing: 1 });
    doc.font('Helvetica').fontSize(10).fillColor(INK);
    lines.forEach((l, i) => doc.text(l, x, y + 18 + i * 15, { width: col }));
  };
  block(55, `FOR ${String(settings.companyLegalName).toUpperCase()}`, ['Authorised signatory', '', `Date: ${pdfDate(app.nda?.sentAt || new Date())}`]);
  block(55 + col + 0, 'FOR THE SUPPLIER', signed
    ? [app.companyName, `Signed by: ${app.nda.signerName}${app.nda.signerTitle ? `, ${app.nda.signerTitle}` : ''}`, `Date: ${pdfDate(app.nda.signedAt)}`, `Method: ${app.nda.method === 'e-sign' ? 'Electronic signature' : app.nda.method === 'upload' ? 'Signed copy uploaded' : 'Offline'}`, app.nda.signerIp ? `IP: ${app.nda.signerIp}` : '']
    : [app.companyName, 'Name: ______________________', 'Designation: ________________', 'Signature: __________________', 'Date: _______________________']);

  brandFooter(doc, `${settings.companyLegalName} · Confidential · ${app.number}`);
  return write(doc, `nda-${app.number}${signed ? '-signed' : ''}.pdf`);
}

/** Registration / plan invoice for a supplier (INR or USD). */
export async function generateSupplierInvoice(app, settings) {
  const p = app.payment;
  const doc = new PDFDocument({ size: 'A4', margins: { top: 50, bottom: 60, left: 50, right: 50 } });
  brandHeader(doc, 'TAX INVOICE');

  let y = 115;
  doc.fontSize(9).fillColor(MUTED).font('Helvetica');
  const meta = [['Invoice #', p.invoiceNumber], ['Date', pdfDate(p.paidAt)], ['Supplier code', app.supplierCode || '—'], ['Payment', `${(p.method || '').replace('_', ' ')}${p.ref ? ` · ${p.ref}` : ''}`]];
  meta.forEach(([k, v], i) => {
    doc.fillColor(MUTED).text(k, 360, y + i * 15, { width: 80 });
    doc.fillColor(INK).text(String(v || '—'), 440, y + i * 15, { width: 105, align: 'right' });
  });

  doc.fillColor(GOLD).fontSize(8.5).font('Helvetica-Bold').text('FROM', 50, y, { characterSpacing: 1 });
  doc.fillColor(INK).fontSize(10.5).text(settings.companyLegalName, 50, y + 13);
  doc.font('Helvetica').fontSize(9).fillColor('#495057');
  [settings.companyAddress, settings.companyGstin && `GSTIN: ${settings.companyGstin}`, settings.companyEmail, settings.companyPhone].filter(Boolean).forEach((l, i) => doc.text(l, 50, y + 28 + i * 12, { width: 150 }));

  doc.fillColor(GOLD).fontSize(8.5).font('Helvetica-Bold').text('BILL TO', 210, y, { characterSpacing: 1 });
  doc.fillColor(INK).fontSize(10.5).text(app.companyName, 210, y + 13, { width: 140 });
  doc.font('Helvetica').fontSize(9).fillColor('#495057');
  [app.contactName, app.address, [app.city, app.state, app.postalCode].filter(Boolean).join(', '), app.country, `GST / Tax ID: ${app.gst}`, app.email].filter(Boolean)
    .forEach((l, i) => doc.text(l, 210, y + 28 + i * 12, { width: 140 }));

  y = 245;
  doc.rect(50, y, doc.page.width - 100, 22).fill('#E8DDD1');
  doc.fillColor(GREEN).font('Helvetica-Bold').fontSize(9);
  doc.text('DESCRIPTION', 58, y + 7).text('PERIOD', 330, y + 7, { width: 90 }).text('AMOUNT', 430, y + 7, { width: 107, align: 'right' });
  y += 32;
  doc.font('Helvetica').fontSize(10).fillColor(INK);
  doc.text(`Ranavista supplier membership — ${p.planName} plan`, 58, y, { width: 260 });
  doc.text({ month: 'Monthly', quarter: '3 months', year: '12 months', one_time: 'One-time', custom: 'As agreed' }[p.billingPeriod] || '—', 330, y, { width: 90 });
  doc.text(pdfMoney(p.amount, p.currency), 430, y, { width: 107, align: 'right' });
  y += 26;
  doc.moveTo(50, y).lineTo(doc.page.width - 50, y).strokeColor('#E0E0E0').stroke();
  y += 12;
  doc.font('Helvetica-Bold').fillColor(GREEN).fontSize(12).text(`Total paid (${p.currency})`, 300, y, { width: 125, align: 'right' });
  doc.text(pdfMoney(p.amount, p.currency), 430, y, { width: 107, align: 'right' });
  doc.font('Helvetica').fontSize(8.5).fillColor(MUTED).text('Amount inclusive of applicable taxes.', 300, y + 18, { width: 237, align: 'right' });

  y += 70;
  doc.fontSize(9.5).fillColor(INK).text(
    `Welcome to Ranavista! Your supplier code is ${app.supplierCode}. Quote it in all communication with our team. ` +
      'Leads are matched on fit, capacity and track record — no plan guarantees orders.',
    50, y, { width: doc.page.width - 100 }
  );
  doc.fontSize(8.5).fillColor(MUTED).text('This is a computer-generated invoice and does not require a signature.', 50, y + 40);
  brandFooter(doc, `${settings.companyLegalName} · ${settings.companyEmail || ''}`);
  return write(doc, `invoice-${p.invoiceNumber}.pdf`);
}
