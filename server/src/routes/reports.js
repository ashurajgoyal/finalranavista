import { Router } from 'express';
import PDFDocument from 'pdfkit';
import User from '../models/User.js';
import RFQ from '../models/RFQ.js';
import Order from '../models/Order.js';
import { Dispute, Enquiry } from '../models/misc.js';
import { JobApplication } from '../models/Career.js';
import { LiaisonEnquiry, SourcingRequest, SupplierApplication } from '../models/Marketplace.js';
import { auth, allow } from '../middleware/auth.js';
import { ah, HttpError } from '../middleware/error.js';
import { audit } from '../utils/audit.js';
import { currentRates, toUsd } from '../services/fx.js';
import { STAGE_LABEL } from '../services/suppliers.js';
import { GOLD, GREEN, INK, MUTED, brandHeader } from '../services/pdfkit-helpers.js';

/*
 * Admin → Reports
 *   GET /api/admin/reports/meta                       report types, filters, columns
 *   GET /api/admin/reports/:type?format=json|xlsx|pdf|csv&preset=this_month|…|custom&from&to&…filters&columns=a,b&groupBy=week|month
 */

const r = Router();
r.use(auth, allow('admin'));

const TZ_MIN = Number(process.env.REPORT_TZ_OFFSET_MINUTES ?? 330); // IST by default
const rx = (s) => new RegExp(String(s).replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i');
const get = (o, p) => p.split('.').reduce((v, k) => (v == null ? v : v[k]), o);
const planName = (u) => (u.subscription?.status === 'active' ? (u.subscription.plan || '').replace(/^(buyer|seller)_/, '') : 'free');

/* ---------- column helpers ---------- */
const col = (key, label, getter, type = 'text', width = 18) => ({ key, label, get: typeof getter === 'function' ? getter : (row) => get(row, getter || key), type, width });
const date = (key, label, path) => col(key, label, path || key, 'date', 14);
const num = (key, label, path) => col(key, label, path || key, 'number', 12);
/** Money in USD → two columns: USD and INR (at the order's own rate when available). */
const usdInr = (key, label, getter, rateOf) => [
  col(`${key}Usd`, `${label} (USD)`, getter, 'money_usd', 14),
  col(`${key}Inr`, `${label} (INR)`, (row, ctx) => { const v = getter(row); return v == null ? null : v * ((rateOf && rateOf(row)) || ctx.inr); }, 'money_inr', 16),
];

/* ---------- report definitions ---------- */
const REPORTS = {
  buyers: {
    label: 'Buyers', model: User, base: { role: 'buyer' }, dateField: 'createdAt', select: '-password -otp',
    filters: { status: ['active', 'suspended'], country: 'address.country', plan: true },
    filter: (q, f) => { if (f.status) q.status = f.status; if (f.country) q['address.country'] = f.country; if (f.plan) Object.assign(q, f.plan === 'free' ? { $or: [{ 'subscription.status': { $ne: 'active' } }, { 'subscription.plan': 'buyer_basic' }] } : { 'subscription.status': 'active', 'subscription.plan': f.plan }); if (f.q) q.$or = [{ name: rx(f.q) }, { company: rx(f.q) }, { email: rx(f.q) }]; },
    columns: [
      col('company', 'Company'), col('name', 'Contact'), col('email', 'Email', 'email', 'text', 26), col('phone', 'Phone'),
      col('country', 'Country', 'address.country'), col('city', 'City', 'address.city'), col('plan', 'Plan', planName),
      col('status', 'Status'), col('verified', 'Email verified', (u) => (u.emailVerified ? 'Yes' : 'No')), date('createdAt', 'Joined'), date('lastLoginAt', 'Last login'),
    ],
  },
  sellers: {
    label: 'Sellers', model: User, base: { role: 'seller' }, dateField: 'createdAt', select: '-password -otp',
    filters: { status: ['pending', 'approved', 'rejected'], country: 'seller.country', category: true, plan: true },
    filter: (q, f) => { if (f.status) q['seller.approval'] = f.status; if (f.country) q['seller.country'] = f.country; if (f.category) q['seller.categories'] = f.category; if (f.plan) Object.assign(q, { 'subscription.status': 'active', 'subscription.plan': f.plan }); if (f.q) q.$or = [{ name: rx(f.q) }, { company: rx(f.q) }, { email: rx(f.q) }, { 'seller.supplierCode': rx(f.q) }]; },
    columns: [
      col('supplierCode', 'Supplier code', 'seller.supplierCode'), col('company', 'Company'), col('name', 'Contact'), col('email', 'Email', 'email', 'text', 26), col('phone', 'Phone'),
      col('country', 'Country', 'seller.country'), col('categories', 'Categories', (u) => (u.seller?.categories || []).join(', '), 'text', 30),
      col('approval', 'Approval', 'seller.approval'), col('stage', 'Verification stage', (u) => STAGE_LABEL[u.seller?.verificationStage] || ''),
      col('plan', 'Plan', planName), num('rating', 'Rating', 'seller.rating'), num('leadsReceived', 'Leads received', 'seller.leadsReceived'), num('leadsQuoted', 'Leads quoted', 'seller.leadsQuoted'),
      col('payouts', 'Payouts connected', (u) => (u.seller?.payoutsEnabled ? 'Yes' : 'No')), col('status', 'Account status'), date('createdAt', 'Joined'),
    ],
  },
  supplier_verifications: {
    label: 'Seller registrations & verification', model: SupplierApplication, dateField: 'submittedAt',
    filters: { status: Object.keys(STAGE_LABEL), country: 'country', category: true },
    filter: (q, f) => { if (f.status) q.stage = f.status; if (f.country) q.country = f.country; if (f.category) q.categories = f.category; if (f.q) q.$or = [{ companyName: rx(f.q) }, { number: rx(f.q) }, { gst: rx(f.q) }, { supplierCode: rx(f.q) }]; },
    columns: [
      col('number', 'Reference'), col('supplierCode', 'Supplier code'), col('companyName', 'Company', 'companyName', 'text', 24), col('contactName', 'Contact'),
      col('contactNumber', 'Phone'), col('email', 'Email', 'email', 'text', 26), col('address', 'Address', 'address', 'text', 30),
      col('city', 'City'), col('state', 'State'), col('country', 'Country'), col('gst', 'GST / Tax ID'), col('factoryAddress', 'Factory address', 'factoryAddress', 'text', 30),
      col('companyType', 'Company type'), num('establishedYear', 'Established'), col('turnover', 'Turnover', (a) => (a.turnover?.amount ? `${a.turnover.currency} ${a.turnover.amount.toLocaleString('en-IN')}` : '')),
      num('employees', 'Employees'), num('factoryUnits', 'Factory units'), col('certifications', 'Certifications', (a) => (a.certifications || []).join(', '), 'text', 26),
      num('productionCapacity', 'Capacity (containers/mo)'), num('productCategoriesCount', 'Product categories'), num('skuCount', 'SKUs'), num('exportingSince', 'Exporting since'),
      col('exportMarkets', 'Export markets', (a) => (a.exportMarkets || []).join(', '), 'text', 26), col('compliance', 'Factory compliance', (a) => [a.compliance?.status, ...(a.compliance?.audits || [])].filter(Boolean).join(' · ')),
      col('stage', 'Stage', (a) => STAGE_LABEL[a.stage]), col('physical', 'Physical verification', (a) => (a.physical?.needed ? a.physical.status : 'Not required')),
      col('virtual', 'Virtual verification', (a) => (a.virtual?.needed ? a.virtual.status : 'Not required')), date('ndaSignedAt', 'NDA signed', 'nda.signedAt'),
      col('plan', 'Plan', 'payment.planName'), col('paid', 'Amount paid', (a) => (a.payment?.paidAt ? `${a.payment.currency} ${a.payment.amount}` : '')), date('paidAt', 'Paid on', 'payment.paidAt'), date('submittedAt', 'Submitted'),
    ],
  },
  supplier_payments: {
    label: 'Seller plan payments', model: SupplierApplication, base: { 'payment.paidAt': { $exists: true } }, dateField: 'payment.paidAt', roles: ['finance'],
    filters: { country: 'country', plan: true },
    filter: (q, f) => { if (f.country) q.country = f.country; if (f.plan) q['payment.planKey'] = f.plan; if (f.q) q.$or = [{ companyName: rx(f.q) }, { 'payment.invoiceNumber': rx(f.q) }, { supplierCode: rx(f.q) }]; },
    columns: [
      col('invoiceNumber', 'Invoice #', 'payment.invoiceNumber'), date('paidAt', 'Paid on', 'payment.paidAt'), col('supplierCode', 'Supplier code'), col('companyName', 'Company', 'companyName', 'text', 24),
      col('gst', 'GST / Tax ID'), col('country', 'Country'), col('plan', 'Plan', 'payment.planName'), col('currency', 'Currency', 'payment.currency'), num('amount', 'Amount', 'payment.amount'),
      ...usdInr('amountConv', 'Amount', (a) => toUsd(a.payment?.amount || 0, a.payment?.currency || 'INR')),
      col('method', 'Method', 'payment.method'), col('ref', 'Reference', 'payment.ref'),
    ],
  },
  rfqs: {
    label: 'RFQs', model: RFQ, dateField: 'createdAt', populate: [['buyer', 'name company'], ['assignedSeller', 'company name']],
    filters: { status: ['pending', 'assigned', 'quoted', 'negotiating', 'accepted', 'closed', 'cancelled'], country: 'destination.country', category: true },
    filter: (q, f) => { if (f.status) q.status = f.status; if (f.country) q['destination.country'] = f.country; if (f.category) q.category = f.category; if (f.q) q.$or = [{ number: rx(f.q) }, { title: rx(f.q) }]; },
    columns: [
      col('number', 'RFQ #'), col('title', 'Title', 'title', 'text', 28), col('category', 'Category'), col('buyer', 'Buyer', (x) => x.buyer?.company || x.buyer?.name),
      col('seller', 'Assigned seller', (x) => x.assignedSeller?.company || x.assignedSeller?.name || ''), col('status', 'Status'), num('items', 'Line items', (x) => x.items?.length || 0),
      num('quantity', 'Total quantity', (x) => (x.items || []).reduce((s, i) => s + (i.quantity || 0), 0)),
      ...usdInr('budget', 'Budget', (x) => x.budget || null), col('incoterm', 'Incoterm'), col('container', 'Container', 'containerType'),
      col('destination', 'Destination', (x) => [x.destination?.city, x.destination?.country].filter(Boolean).join(', ')), date('deadline', 'Deadline'), date('createdAt', 'Created'),
    ],
  },
  orders: {
    label: 'Orders & transactions', model: Order, dateField: 'createdAt', roles: ['finance', 'support'], populate: [['buyer', 'name company address.country'], ['seller', 'company name seller.country'], ['rfq', 'number category']],
    filters: { status: ['unpaid', 'held', 'released', 'refunded', 'disputed', 'chargeback'], fulfillment: ['awaiting_payment', 'processing', 'shipped', 'delivered', 'cancelled'] },
    filter: (q, f) => { if (f.status) q.paymentStatus = f.status; if (f.fulfillment) q.fulfillment = f.fulfillment; if (f.q) q.number = rx(f.q); },
    columns: [
      col('number', 'Order #'), col('rfq', 'RFQ #', 'rfq.number'), col('category', 'Category', 'rfq.category'), col('buyer', 'Buyer', (o) => o.buyer?.company || o.buyer?.name),
      col('buyerCountry', 'Buyer country', 'buyer.address.country'), col('seller', 'Seller', (o) => o.seller?.company || o.seller?.name), col('sellerCountry', 'Seller country', 'seller.seller.country'),
      ...usdInr('total', 'Order total', (o) => o.total || 0, (o) => o.fxInrPerUsd), ...usdInr('fee', 'Platform fee', (o) => o.platformFee || 0, (o) => o.fxInrPerUsd),
      ...usdInr('payout', 'Seller payout', (o) => o.sellerPayout || 0, (o) => o.fxInrPerUsd), num('fx', 'INR per USD used', 'fxInrPerUsd'),
      col('paymentStatus', 'Payment status'), col('fulfillment', 'Fulfilment'), date('createdAt', 'Created'), date('paidAt', 'Paid'), date('releasedAt', 'Released'),
    ],
  },
  sourcing: {
    label: 'Sourcing requests', model: SourcingRequest, dateField: 'createdAt', select: '-log -notes -ip', populate: [['assignedTo', 'name']],
    filters: { status: ['new', 'in_review', 'sourcing', 'quoted', 'accepted', 'converted', 'closed', 'cancelled'], country: 'destination.country', category: true },
    filter: (q, f) => { if (f.status) q.status = f.status; if (f.country) q['destination.country'] = f.country; if (f.category) q.category = f.category; if (f.q) q.$or = [{ number: rx(f.q) }, { title: rx(f.q) }, { 'contact.company': rx(f.q) }]; },
    columns: [
      col('number', 'Reference'), col('title', 'Product', 'title', 'text', 26), col('category', 'Category'), col('client', 'Client', (s) => s.contact?.company || s.contact?.name),
      col('email', 'Email', 'contact.email', 'text', 24), col('phone', 'Phone', 'contact.phone'), num('quantity', 'Quantity'), col('unit', 'Unit'),
      col('target', 'Target price', (s) => `${s.currency} ${s.targetPrice} ${s.priceBasis === 'unit' ? '/ unit' : 'total'}`),
      ...usdInr('targetUsd', 'Target', (s) => (s.priceBasis === 'unit' ? toUsd(s.targetPrice, s.currency) : toUsd(s.targetPrice, s.currency))),
      date('requiredBy', 'Required by'), col('destination', 'Destination', (s) => [s.destination?.city, s.destination?.country].filter(Boolean).join(', ')),
      col('status', 'Status'), col('priority', 'Priority'), col('owner', 'Owner', 'assignedTo.name'), num('supplierQuotes', 'Supplier quotes', (s) => s.supplierQuotes?.length || 0),
      col('quote', 'Quoted to client', (s) => (s.quote?.sentAt ? `${s.quote.currency} ${s.quote.unitPrice}` : '')), date('createdAt', 'Received'),
    ],
  },
  liaison: {
    label: 'Liaison services enquiries', model: LiaisonEnquiry, dateField: 'createdAt', select: '-log -notes -ip', populate: [['assignedTo', 'name']],
    filters: { status: ['new', 'contacted', 'proposal_sent', 'won', 'lost', 'closed'], country: 'country', service: true },
    filter: (q, f) => { if (f.status) q.status = f.status; if (f.country) q.country = f.country; if (f.service) q.services = f.service; if (f.q) q.$or = [{ number: rx(f.q) }, { name: rx(f.q) }, { company: rx(f.q) }]; },
    columns: [
      col('number', 'Reference'), col('name', 'Name'), col('company', 'Company'), col('email', 'Email', 'email', 'text', 26), col('phone', 'Phone'), col('country', 'Country'),
      col('services', 'Services', (e) => (e.services || []).join(', '), 'text', 30), col('budget', 'Budget'), col('timeline', 'Timeline'), col('status', 'Status'), col('owner', 'Owner', 'assignedTo.name'),
      col('message', 'Message', (e) => (e.message || '').slice(0, 300), 'text', 40), date('createdAt', 'Received'),
    ],
  },
  enquiries: {
    label: 'Website contact enquiries', model: Enquiry, dateField: 'createdAt', filters: { status: ['open', 'handled'] },
    filter: (q, f) => { if (f.status) q.handled = f.status === 'handled'; if (f.q) q.$or = [{ name: rx(f.q) }, { email: rx(f.q) }, { company: rx(f.q) }]; },
    columns: [col('name', 'Name'), col('company', 'Company'), col('email', 'Email', 'email', 'text', 26), col('phone', 'Phone'), col('message', 'Message', (e) => (e.message || '').slice(0, 300), 'text', 40), col('handled', 'Handled', (e) => (e.handled ? 'Yes' : 'No')), date('createdAt', 'Received')],
  },
  careers: {
    label: 'Job applications', model: JobApplication, dateField: 'createdAt', roles: ['support'], select: '-notes -coverLetter -ip',
    filters: { status: ['new', 'reviewing', 'shortlisted', 'interview', 'offered', 'hired', 'rejected', 'on_hold'], country: 'country' },
    filter: (q, f) => { if (f.status) q.status = f.status; if (f.country) q.country = f.country; if (f.q) q.$or = [{ name: rx(f.q) }, { position: rx(f.q) }, { email: rx(f.q) }]; },
    columns: [col('name', 'Candidate'), col('position', 'Position', 'position', 'text', 24), col('email', 'Email', 'email', 'text', 26), col('phone', 'Phone'), col('city', 'City'), col('country', 'Country'), col('experience', 'Experience', 'experienceYears'), col('currentCompany', 'Current company'), col('noticePeriod', 'Notice period'), col('status', 'Status'), num('rating', 'Rating'), date('createdAt', 'Applied')],
  },
  disputes: {
    label: 'Disputes', model: Dispute, dateField: 'createdAt', roles: ['support', 'finance'], populate: [['order', 'number total']],
    filters: { status: ['open', 'under_review', 'resolved_refund', 'resolved_release', 'resolved_partial', 'closed'] },
    filter: (q, f) => { if (f.status) q.status = f.status; },
    columns: [col('order', 'Order #', 'order.number'), ...usdInr('total', 'Order total', (d) => d.order?.total || 0), col('reason', 'Reason'), col('status', 'Status'), col('resolution', 'Resolution note', 'resolution.note', 'text', 30), num('refund', 'Refund (USD)', 'resolution.refundAmount'), date('createdAt', 'Opened'), date('resolvedAt', 'Resolved', 'resolution.at')],
  },
};

/* ---------- date ranges ---------- */
const shift = (d) => new Date(d.getTime() + TZ_MIN * 60e3); // UTC → local wall-clock
const unshift = (d) => new Date(d.getTime() - TZ_MIN * 60e3); // local wall-clock → UTC
function startOfLocalDay(d) { const s = shift(d); s.setUTCHours(0, 0, 0, 0); return unshift(s); }
function rangeFor(preset, from, to) {
  const now = new Date();
  const today = startOfLocalDay(now);
  const local = shift(today);
  const day = 864e5;
  const dow = (local.getUTCDay() + 6) % 7; // Monday = 0
  const mStart = (y, m) => unshift(new Date(Date.UTC(y, m, 1)));
  const y = local.getUTCFullYear();
  const m = local.getUTCMonth();
  switch (preset) {
    case 'today': return [today, now];
    case 'yesterday': return [new Date(today - day), today];
    case 'this_week': return [new Date(today - dow * day), now];
    case 'last_week': return [new Date(today - (dow + 7) * day), new Date(today - dow * day)];
    case 'last_7': return [new Date(today - 6 * day), now];
    case 'last_30': return [new Date(today - 29 * day), now];
    case 'this_month': return [mStart(y, m), now];
    case 'last_month': return [mStart(y, m - 1), mStart(y, m)];
    case 'this_quarter': return [mStart(y, m - (m % 3)), now];
    case 'last_quarter': return [mStart(y, m - (m % 3) - 3), mStart(y, m - (m % 3))];
    case 'this_year': return [mStart(y, 0), now];
    case 'custom': {
      const f = from ? unshift(new Date(`${from}T00:00:00Z`)) : null;
      const t = to ? new Date(unshift(new Date(`${to}T00:00:00Z`)).getTime() + day) : null; // inclusive end date
      if ((f && Number.isNaN(f.getTime())) || (t && Number.isNaN(t.getTime()))) throw new HttpError(400, 'Invalid date range.');
      if (f && t && f >= t) throw new HttpError(400, '“From” must be before “To”.');
      return [f, t];
    }
    default: return [null, null]; // all time
  }
}
const ymd = (d) => (d ? shift(d).toISOString().slice(0, 10) : '');
function periodKey(d, groupBy) {
  const s = shift(new Date(d));
  if (groupBy === 'month') return s.toISOString().slice(0, 7);
  const dow = (s.getUTCDay() + 6) % 7;
  const monday = new Date(s.getTime() - dow * 864e5);
  return `Week of ${monday.toISOString().slice(0, 10)}`;
}

function allowed(req, def) {
  return req.user.adminRole === 'super' || !def.roles || def.roles.includes(req.user.adminRole);
}

/* ---------- meta ---------- */
r.get('/meta', ah(async (req, res) => {
  res.json(Object.entries(REPORTS).filter(([, d]) => allowed(req, d)).map(([key, d]) => ({
    key, label: d.label, filters: Object.fromEntries(Object.entries(d.filters || {}).map(([k, v]) => [k, Array.isArray(v) ? v : true])),
    columns: d.columns.map((c) => ({ key: c.key, label: c.label, type: c.type })),
  })));
}));

/* ---------- build ---------- */
async function build(req) {
  const def = REPORTS[req.params.type];
  if (!def) throw new HttpError(404, 'Unknown report.');
  if (!allowed(req, def)) throw new HttpError(403, 'Your admin role does not include this report.');
  const f = req.query;
  const [from, to] = rangeFor(f.preset || 'this_month', f.from, f.to);
  const q = { ...(def.base || {}) };
  if (from || to) q[def.dateField] = { ...(q[def.dateField] || {}), ...(from && { $gte: from }), ...(to && { $lt: to }) };
  def.filter?.(q, { status: f.status, country: f.country, category: f.category, plan: f.plan, service: f.service, fulfillment: f.fulfillment, q: f.q });

  let cursor = def.model.find(q).sort({ [def.dateField]: -1 }).limit(20000);
  if (def.select) cursor = cursor.select(def.select);
  (def.populate || []).forEach(([p, s]) => { cursor = cursor.populate(p, s); });
  const docs = await cursor.lean();

  const wanted = String(f.columns || '').split(',').filter(Boolean);
  const columns = wanted.length ? def.columns.filter((c) => wanted.includes(c.key)) : def.columns;
  if (!columns.length) throw new HttpError(400, 'Choose at least one column.');
  const ctx = { inr: currentRates().rates.INR };
  const rows = docs.map((d) => Object.fromEntries(columns.map((c) => {
    let v = c.get(d, ctx);
    if (c.type.startsWith('money') && v != null) v = Math.round(Number(v) * 100) / 100;
    return [c.key, v === undefined ? null : v];
  })));

  // Period summary (weekly / monthly)
  let summary = null;
  if (['week', 'month'].includes(f.groupBy)) {
    const moneyCols = columns.filter((c) => c.type.startsWith('money'));
    const groups = new Map();
    docs.forEach((d, i) => {
      const dv = get(d, def.dateField);
      if (!dv) return;
      const k = periodKey(dv, f.groupBy);
      const g = groups.get(k) || { period: k, count: 0, ...Object.fromEntries(moneyCols.map((c) => [c.key, 0])) };
      g.count += 1;
      moneyCols.forEach((c) => { g[c.key] += Number(rows[i][c.key] || 0); });
      groups.set(k, g);
    });
    summary = { groupBy: f.groupBy, columns: [{ key: 'period', label: f.groupBy === 'month' ? 'Month' : 'Week', type: 'text' }, { key: 'count', label: 'Records', type: 'number' }, ...moneyCols.map((c) => ({ key: c.key, label: c.label, type: c.type }))], rows: [...groups.values()].sort((a, b) => (a.period < b.period ? 1 : -1)) };
  }
  const filtersApplied = ['status', 'country', 'category', 'plan', 'service', 'fulfillment', 'q'].filter((k) => f[k]).map((k) => `${k}: ${f[k]}`);
  return { def, columns, rows, summary, from, to, filtersApplied, inr: ctx.inr, preset: f.preset || 'this_month' };
}

const fmtCell = (v, type) => {
  if (v == null || v === '') return '';
  if (type === 'date') return new Date(v).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric', timeZone: 'Asia/Kolkata' });
  if (type === 'money_usd') return `$${Number(v).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  if (type === 'money_inr') return `INR ${Number(v).toLocaleString('en-IN', { maximumFractionDigits: 0 })}`;
  if (type === 'number') return Number(v).toLocaleString('en-US', { maximumFractionDigits: 2 });
  return String(v);
};
const fileBase = (b) => `ranavista-${req_type(b)}-${ymd(b.from) || 'start'}_to_${ymd(b.to ? new Date(b.to - 1) : new Date())}`;
const req_type = (b) => b.def.label.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/-$/, '');
const rangeLabel = (b) => (b.from || b.to ? `${ymd(b.from) || 'beginning'} → ${ymd(b.to ? new Date(b.to - 1) : new Date())}` : 'All time');

r.get('/:type', ah(async (req, res) => {
  const b = await build(req);
  const format = req.query.format || 'json';
  audit(req, `report.${format}`, 'Report', req.params.type, { preset: b.preset, from: ymd(b.from), to: ymd(b.to), rows: b.rows.length, filters: b.filtersApplied });

  if (format === 'json') {
    return res.json({
      label: b.def.label, columns: b.columns.map(({ key, label, type }) => ({ key, label, type })), total: b.rows.length,
      rows: b.rows.slice(0, Number(req.query.limit || 200)), summary: b.summary, range: { from: b.from, to: b.to, label: rangeLabel(b) }, filtersApplied: b.filtersApplied, inrPerUsd: b.inr,
    });
  }

  if (format === 'csv') {
    const escCsv = (v) => { const s = v == null ? '' : String(v); return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s; };
    const lines = [b.columns.map((c) => escCsv(c.label)).join(',')].concat(b.rows.map((row) => b.columns.map((c) => escCsv(c.type === 'date' ? fmtCell(row[c.key], 'date') : row[c.key])).join(',')));
    res.setHeader('Content-Type', 'text/csv; charset=utf-8');
    res.setHeader('Content-Disposition', `attachment; filename="${fileBase(b)}.csv"`);
    return res.send(`﻿${lines.join('\n')}`);
  }

  if (format === 'xlsx') {
    let ExcelJS;
    try { ExcelJS = (await import('exceljs')).default; } catch { throw new HttpError(500, 'Excel export needs the "exceljs" package — run npm install in /server.'); }
    const wb = new ExcelJS.Workbook();
    wb.creator = 'Ranavista Admin';
    wb.created = new Date();
    const head = { font: { bold: true, color: { argb: 'FFFFFFFF' } }, fill: { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF0D3B32' } }, alignment: { vertical: 'middle' } };
    const numFmt = { money_usd: '"$"#,##0.00', money_inr: '"₹"#,##0', number: '#,##0.##', date: 'dd-mmm-yyyy' };

    const ws = wb.addWorksheet(b.def.label.slice(0, 31), { views: [{ state: 'frozen', ySplit: 1 }] });
    ws.columns = b.columns.map((c) => ({ header: c.label, key: c.key, width: c.width || 16, style: numFmt[c.type] ? { numFmt: numFmt[c.type] } : {} }));
    b.rows.forEach((row) => ws.addRow(Object.fromEntries(b.columns.map((c) => [c.key, c.type === 'date' && row[c.key] ? new Date(row[c.key]) : row[c.key]]))));
    ws.getRow(1).eachCell((cell) => Object.assign(cell, head));
    ws.getRow(1).height = 22;
    ws.autoFilter = { from: { row: 1, column: 1 }, to: { row: 1, column: b.columns.length } };
    const moneyCols = b.columns.filter((c) => c.type.startsWith('money'));
    if (moneyCols.length && b.rows.length) {
      const total = ws.addRow({ [b.columns[0].key]: 'TOTAL', ...Object.fromEntries(moneyCols.map((c) => [c.key, b.rows.reduce((s, x) => s + Number(x[c.key] || 0), 0)])) });
      total.font = { bold: true };
    }

    if (b.summary) {
      const ss = wb.addWorksheet(b.summary.groupBy === 'month' ? 'Monthly summary' : 'Weekly summary');
      ss.columns = b.summary.columns.map((c) => ({ header: c.label, key: c.key, width: c.key === 'period' ? 22 : 18, style: numFmt[c.type] ? { numFmt: numFmt[c.type] } : {} }));
      b.summary.rows.forEach((x) => ss.addRow(x));
      ss.getRow(1).eachCell((cell) => Object.assign(cell, head));
    }

    const info = wb.addWorksheet('Report info');
    info.columns = [{ width: 24 }, { width: 60 }];
    [['Report', b.def.label], ['Period', rangeLabel(b)], ['Filters', b.filtersApplied.join(' · ') || 'None'], ['Records', b.rows.length],
      ['INR per USD (live rate)', b.inr], ['Generated', new Date().toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' })], ['Generated by', req.user.name]]
      .forEach((x) => info.addRow(x));
    info.getColumn(1).font = { bold: true, color: { argb: 'FF0D3B32' } };

    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', `attachment; filename="${fileBase(b)}.xlsx"`);
    await wb.xlsx.write(res);
    return res.end();
  }

  if (format === 'pdf') {
    const MAX_COLS = 12;
    const MAX_ROWS = 3000;
    const cols = b.columns.slice(0, MAX_COLS);
    const doc = new PDFDocument({ size: cols.length > 8 ? 'A3' : 'A4', layout: 'landscape', margins: { top: 40, bottom: 40, left: 36, right: 36 } });
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="${fileBase(b)}.pdf"`);
    doc.pipe(res);
    brandHeader(doc, 'REPORT', { height: 70 });
    doc.y = 86;
    doc.font('Times-Bold').fontSize(16).fillColor(GREEN).text(b.def.label, 36, doc.y);
    doc.font('Helvetica').fontSize(8.5).fillColor(MUTED)
      .text(`Period: ${rangeLabel(b)}   ·   Records: ${b.rows.length}   ·   Filters: ${b.filtersApplied.join(', ') || 'none'}   ·   1 USD = INR ${b.inr.toFixed(2)}   ·   Generated ${new Date().toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' })} by ${req.user.name}`);
    if (b.columns.length > MAX_COLS) doc.fillColor(GOLD).text(`PDF shows the first ${MAX_COLS} of ${b.columns.length} selected columns — export to Excel for all columns.`);
    doc.moveDown(0.6);

    const usable = doc.page.width - 72;
    const weights = cols.map((c) => c.width || 16);
    const sum = weights.reduce((a, x) => a + x, 0);
    const widths = weights.map((w) => (w / sum) * usable);
    const drawHeader = () => {
      const y = doc.y;
      doc.rect(36, y, usable, 18).fill(GREEN);
      let x = 36;
      doc.font('Helvetica-Bold').fontSize(7.5).fillColor('#fff');
      cols.forEach((c, i) => { doc.text(c.label, x + 3, y + 5, { width: widths[i] - 6, height: 10, ellipsis: true, lineBreak: false }); x += widths[i]; });
      doc.y = y + 20;
    };
    const summaryLines = b.summary ? b.summary.rows : [];
    drawHeader();
    doc.font('Helvetica').fontSize(7.5).fillColor(INK);
    b.rows.slice(0, MAX_ROWS).forEach((row, ri) => {
      const cells = cols.map((c) => fmtCell(row[c.key], c.type));
      const h = Math.max(14, ...cells.map((t, i) => doc.heightOfString(t, { width: widths[i] - 6 }) + 6));
      if (doc.y + h > doc.page.height - 50) { doc.addPage(); doc.y = 40; drawHeader(); doc.font('Helvetica').fontSize(7.5).fillColor(INK); }
      const y = doc.y;
      if (ri % 2 === 0) doc.rect(36, y, usable, h).fill('#F7F3EA');
      let x = 36;
      doc.fillColor(INK);
      cells.forEach((t, i) => { doc.text(t, x + 3, y + 3, { width: widths[i] - 6, align: cols[i].type.startsWith('money') || cols[i].type === 'number' ? 'right' : 'left' }); x += widths[i]; });
      doc.y = y + h;
    });
    if (b.rows.length > MAX_ROWS) doc.moveDown().fillColor(GOLD).text(`Showing ${MAX_ROWS} of ${b.rows.length} rows — export to Excel for the full list.`, 36);
    const moneyCols = cols.filter((c) => c.type.startsWith('money'));
    if (moneyCols.length && b.rows.length) {
      doc.moveDown(0.5).font('Helvetica-Bold').fontSize(8.5).fillColor(GREEN)
        .text(`Totals — ${moneyCols.map((c) => `${c.label}: ${fmtCell(b.rows.reduce((s, x) => s + Number(x[c.key] || 0), 0), c.type)}`).join('   ·   ')}`, 36);
    }
    if (summaryLines.length) {
      doc.moveDown(1).font('Times-Bold').fontSize(12).fillColor(GREEN).text(b.summary.groupBy === 'month' ? 'Monthly summary' : 'Weekly summary', 36);
      doc.font('Helvetica').fontSize(8.5).fillColor(INK);
      summaryLines.forEach((s) => {
        if (doc.y > doc.page.height - 50) { doc.addPage(); doc.y = 40; }
        doc.text(`${s.period}: ${s.count} record${s.count === 1 ? '' : 's'}${b.summary.columns.slice(2).map((c) => ` · ${c.label}: ${fmtCell(s[c.key], c.type)}`).join('')}`, 36);
      });
    }
    doc.end();
    return undefined;
  }
  throw new HttpError(400, 'Unknown format.');
}));

export default r;
