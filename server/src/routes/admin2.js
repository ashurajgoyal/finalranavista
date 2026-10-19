import { Router } from 'express';
import mongoose from 'mongoose';
import User from '../models/User.js';
import RFQ from '../models/RFQ.js';
import Order from '../models/Order.js';
import { Dispute, Enquiry, Plan } from '../models/misc.js';
import { JobApplication } from '../models/Career.js';
import {
  LIAISON_STATUSES, LiaisonEnquiry, SOURCING_STATUSES, SourcingCountry, SourcingRequest, SupplierApplication,
} from '../models/Marketplace.js';
import { auth, allow, adminRole } from '../middleware/auth.js';
import { ah, HttpError } from '../middleware/error.js';
import { audit } from '../utils/audit.js';
import { notify } from '../services/notify.js';
import { sendMail } from '../services/mailer.js';
import { TRACKED, currentRates, rateHistory, refreshRates, toUsd } from '../services/fx.js';
import { getSettings, saveSettings } from '../services/settings.js';
import { OPEN_STAGES, STAGE_LABEL, esc } from '../services/suppliers.js';
import env from '../config/env.js';

const r = Router();
r.use(auth, allow('admin'));

const ALL = adminRole('super', 'finance', 'support', 'category');
const OPS = adminRole('support', 'category');
const SUPPORT = adminRole('support');
const SUPER = adminRole('super');
const rx = (s) => new RegExp(String(s).replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i');
const oid = (id) => (id ? new mongoose.Types.ObjectId(String(id)) : undefined);
const clip = (s, n = 2000) => (s == null || s === '' ? undefined : String(s).trim().slice(0, n));
const team = () => User.find({ role: 'admin', status: 'active' }).select('name adminRole').sort('name').lean();
const logIt = (doc, req, action, note) => doc.log.push({ by: req.user._id, byName: req.user.name, action, note });

/* ======================= CURRENCY RATES ======================= */
r.get('/fx', ALL, ah(async (req, res) => {
  const cur = currentRates();
  const history = await rateHistory(Math.min(90, Number(req.query.days || 30)));
  res.json({ ...cur, tracked: TRACKED, history });
}));

r.post('/fx/refresh', ALL, ah(async (req, res) => {
  await refreshRates();
  const cur = currentRates();
  audit(req, 'fx.refresh', 'FxRate', 'latest', { source: cur.source });
  res.json({ ...cur, tracked: TRACKED, history: await rateHistory(30) });
}));

/* ======================= SETTINGS (super admin) ======================= */
r.get('/settings', SUPER, ah(async (req, res) => {
  const [s, plans] = await Promise.all([getSettings(true), Plan.find({ audience: 'seller' }).sort('sort').select('key name price currency customPricing active').lean()]);
  res.json({ settings: s, sellerPlans: plans, env: { smtp: !!env.smtp.host, stripe: !env.demoPayments, adminUrl: env.adminUrl, clientUrl: env.clientUrl } });
}));
r.patch('/settings', SUPER, ah(async (req, res) => {
  const s = await saveSettings(req.body || {});
  audit(req, 'settings.update', 'Setting', 'site', { keys: Object.keys(req.body || {}) });
  res.json({ settings: s });
}));

/* ======================= ACTION CENTER (dashboard highlights) ======================= */
r.get('/action-center', ALL, ah(async (req, res) => {
  const now = Date.now();
  const [verifications, sourcing, liaison, enquiries, careers, disputes, pendingRfqs] = await Promise.all([
    SupplierApplication.find({ stage: { $in: OPEN_STAGES } }).sort('submittedAt').limit(10)
      .select('number companyName country city stage submittedAt stageChangedAt physical.status physical.scheduledAt virtual.status virtual.scheduledAt').lean(),
    SourcingRequest.find({ status: { $in: ['new', 'in_review', 'sourcing'] } }).sort('requiredBy').limit(8).select('number title status requiredBy contact.company contact.name createdAt').lean(),
    LiaisonEnquiry.find({ status: 'new' }).sort('-createdAt').limit(6).select('number name company services createdAt').lean(),
    Enquiry.countDocuments({ handled: false }),
    JobApplication.countDocuments({ status: 'new' }),
    Dispute.countDocuments({ status: { $in: ['open', 'under_review'] } }),
    RFQ.countDocuments({ status: 'pending' }),
  ]);
  const [vCount, sCount, lCount] = await Promise.all([
    SupplierApplication.aggregate([{ $match: { stage: { $in: OPEN_STAGES } } }, { $group: { _id: '$stage', n: { $sum: 1 } } }]),
    SourcingRequest.countDocuments({ status: { $in: ['new', 'in_review', 'sourcing'] } }),
    LiaisonEnquiry.countDocuments({ status: 'new' }),
  ]);
  res.json({
    verifications: verifications.map((v) => ({ ...v, label: STAGE_LABEL[v.stage], waitingDays: Math.floor((now - new Date(v.stageChangedAt || v.submittedAt).getTime()) / 864e5) })),
    verificationCounts: Object.fromEntries(vCount.map((c) => [c._id, c.n])),
    verificationsTotal: vCount.reduce((s, c) => s + c.n, 0),
    sourcing, sourcingTotal: sCount, liaison, liaisonTotal: lCount,
    counts: { enquiries, careers, disputes, pendingRfqs },
  });
}));

/* ======================= SOURCING PROJECTS ======================= */
r.get('/sourcing', ALL, ah(async (req, res) => {
  const q = {};
  if (req.query.status === 'open') q.status = { $in: ['new', 'in_review', 'sourcing', 'quoted'] };
  else if (req.query.status) q.status = { $in: String(req.query.status).split(',') };
  if (req.query.category) q.category = req.query.category;
  if (req.query.assigned === 'me') q.assignedTo = req.user._id;
  if (req.query.q) q.$or = [{ number: rx(req.query.q) }, { title: rx(req.query.q) }, { 'contact.name': rx(req.query.q) }, { 'contact.company': rx(req.query.q) }, { 'contact.email': rx(req.query.q) }];
  const [list, counts] = await Promise.all([
    SourcingRequest.find(q).sort('-createdAt').limit(500).select('-log -notes -ip').populate('assignedTo', 'name').lean(),
    SourcingRequest.aggregate([{ $group: { _id: '$status', n: { $sum: 1 } } }]),
  ]);
  res.json({ list, counts: Object.fromEntries(counts.map((c) => [c._id, c.n])) });
}));

const loadSourcing = (id) => SourcingRequest.findById(id)
  .populate('buyer', 'name company email phone subscription.plan').populate('assignedTo', 'name').populate('notes.by', 'name')
  .populate('supplierQuotes.seller', 'company name').populate('supplierQuotes.by', 'name').populate('quote.by', 'name').populate('rfq', 'number status');

r.get('/sourcing/:id', ALL, ah(async (req, res) => {
  const sr = await loadSourcing(req.params.id);
  if (!sr) throw new HttpError(404, 'Sourcing request not found.');
  const sq = { role: 'seller', status: 'active', 'seller.approval': 'approved' };
  if (sr.category) sq['seller.categories'] = sr.category;
  const [admins, sellers] = await Promise.all([team(), User.find(sq).select('name company seller.country seller.rating seller.supplierCode').limit(50).lean()]);
  res.json({ request: sr, team: admins, sellers });
}));

r.patch('/sourcing/:id', OPS, ah(async (req, res) => {
  const sr = await SourcingRequest.findById(req.params.id);
  if (!sr) throw new HttpError(404, 'Sourcing request not found.');
  const { status, priority, assignedTo, category } = req.body;
  if (status && status !== sr.status) {
    if (!SOURCING_STATUSES.includes(status)) throw new HttpError(400, 'Unknown status.');
    logIt(sr, req, 'status', `${sr.status} → ${status}`);
    sr.status = status;
  }
  if (priority && ['low', 'normal', 'high'].includes(priority)) sr.priority = priority;
  if (category !== undefined) sr.category = category;
  if (assignedTo !== undefined && String(assignedTo || '') !== String(sr.assignedTo || '')) {
    sr.assignedTo = oid(assignedTo);
    logIt(sr, req, 'assigned', assignedTo ? 'Owner changed' : 'Unassigned');
    if (assignedTo && String(assignedTo) !== String(req.user._id)) notify(assignedTo, { type: 'sourcing_assigned', title: 'Sourcing project assigned to you', body: `${sr.number} · ${sr.title}`, link: `/sourcing/${sr._id}`, email: false }).catch(() => {});
  }
  await sr.save();
  audit(req, 'sourcing.update', 'SourcingRequest', sr._id, req.body);
  res.json(await loadSourcing(sr._id));
}));

r.post('/sourcing/:id/note', ALL, ah(async (req, res) => {
  const text = clip(req.body.text);
  if (!text) throw new HttpError(400, 'Write a note.');
  await SourcingRequest.updateOne({ _id: req.params.id }, { $push: { notes: { by: req.user._id, text } } });
  res.json(await loadSourcing(req.params.id));
}));

r.post('/sourcing/:id/supplier-quotes', OPS, ah(async (req, res) => {
  const sr = await SourcingRequest.findById(req.params.id);
  if (!sr) throw new HttpError(404, 'Sourcing request not found.');
  const b = req.body;
  if (!clip(b.supplier) && !b.seller) throw new HttpError(400, 'Enter the supplier.');
  if (!(Number(b.unitPrice) >= 0)) throw new HttpError(400, 'Enter the supplier’s unit price.');
  let supplier = clip(b.supplier, 160);
  if (b.seller && !supplier) supplier = (await User.findById(b.seller).select('company name'))?.company;
  sr.supplierQuotes.push({ supplier, seller: oid(b.seller), country: clip(b.country, 80), unitPrice: Number(b.unitPrice), currency: b.currency || 'USD', moq: clip(b.moq, 60), leadTimeDays: Number(b.leadTimeDays) || undefined, notes: clip(b.notes), file: b.file?.url ? b.file : undefined, by: req.user._id });
  if (['new', 'in_review'].includes(sr.status)) sr.status = 'sourcing';
  logIt(sr, req, 'supplier_quote.added', `${supplier}: ${b.currency || 'USD'} ${b.unitPrice}`);
  await sr.save();
  res.json(await loadSourcing(sr._id));
}));

r.delete('/sourcing/:id/supplier-quotes/:qid', OPS, ah(async (req, res) => {
  await SourcingRequest.updateOne({ _id: req.params.id }, { $pull: { supplierQuotes: { _id: req.params.qid } } });
  res.json(await loadSourcing(req.params.id));
}));

/** Send Ranavista's quotation back to the buyer (email + dashboard). */
r.post('/sourcing/:id/quote', OPS, ah(async (req, res) => {
  const sr = await SourcingRequest.findById(req.params.id);
  if (!sr) throw new HttpError(404, 'Sourcing request not found.');
  const unitPrice = Number(req.body.unitPrice);
  if (!(unitPrice > 0)) throw new HttpError(400, 'Enter the unit price you are offering.');
  const currency = req.body.currency || sr.currency || 'USD';
  sr.quote = {
    unitPrice, currency, total: +(unitPrice * sr.quantity).toFixed(2), leadTime: clip(req.body.leadTime, 80),
    validUntil: req.body.validUntil ? new Date(req.body.validUntil) : undefined, message: clip(req.body.message, 3000), sentAt: new Date(), by: req.user._id,
  };
  sr.status = 'quoted';
  sr.buyerResponse = undefined;
  logIt(sr, req, 'quote.sent', `${currency} ${unitPrice} / ${sr.unit}`);
  await sr.save();
  const fmtMoney = (n) => `${currency} ${Number(n).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  const buyer = sr.buyer || (await User.findOne({ email: sr.contact.email, role: 'buyer' }).select('_id'))?._id;
  sendMail(sr.contact.email, `Quotation for your sourcing request ${sr.number}`, `We found a match for “${sr.title}”`,
    `<p>Here is our quotation for <b>${esc(sr.title)}</b>:</p>
     <table style="font-size:14px;border-collapse:collapse">
       <tr><td style="padding:3px 14px 3px 0;color:#6B7A78">Unit price</td><td><b>${esc(fmtMoney(unitPrice))}</b> per ${esc(sr.unit.replace(/s$/, ''))}</td></tr>
       <tr><td style="padding:3px 14px 3px 0;color:#6B7A78">Quantity</td><td>${sr.quantity.toLocaleString('en-US')} ${esc(sr.unit)}</td></tr>
       <tr><td style="padding:3px 14px 3px 0;color:#6B7A78">Total</td><td><b>${esc(fmtMoney(sr.quote.total))}</b></td></tr>
       ${sr.quote.leadTime ? `<tr><td style="padding:3px 14px 3px 0;color:#6B7A78">Lead time</td><td>${esc(sr.quote.leadTime)}</td></tr>` : ''}
       ${sr.quote.validUntil ? `<tr><td style="padding:3px 14px 3px 0;color:#6B7A78">Valid until</td><td>${esc(sr.quote.validUntil.toDateString())}</td></tr>` : ''}
     </table>${sr.quote.message ? `<p style="white-space:pre-line">${esc(sr.quote.message)}</p>` : ''}
     <p>${buyer ? 'Accept or decline it from your dashboard.' : 'Reply to this email to accept, ask questions or request samples.'}</p>`,
    buyer ? { label: 'View quotation', url: `${env.clientUrl}/buyer/sourcing/${sr._id}` } : null);
  if (buyer) notify(buyer, { type: 'sourcing_quote', title: 'Quotation ready for your sourcing request', body: `${sr.number} · ${sr.title}`, link: `/buyer/sourcing/${sr._id}`, email: false }).catch(() => {});
  audit(req, 'sourcing.quote', 'SourcingRequest', sr._id, { unitPrice, currency });
  res.json(await loadSourcing(sr._id));
}));

/** Turn a sourcing project into a normal RFQ in the pending queue (buyer account required). */
r.post('/sourcing/:id/convert', OPS, ah(async (req, res) => {
  const sr = await SourcingRequest.findById(req.params.id);
  if (!sr) throw new HttpError(404, 'Sourcing request not found.');
  if (sr.rfq) throw new HttpError(400, 'Already converted to an RFQ.');
  const buyer = sr.buyer ? await User.findById(sr.buyer) : await User.findOne({ email: sr.contact.email, role: 'buyer' });
  if (!buyer) throw new HttpError(400, 'The client has no buyer account yet. Ask them to register with the same email, then convert.');
  const unitUsd = sr.priceBasis === 'unit' ? toUsd(sr.targetPrice, sr.currency) : toUsd(sr.targetPrice, sr.currency) / sr.quantity;
  const specs = [sr.specifications, ...Object.entries(sr.toObject().specs || {}).filter(([, v]) => v).map(([k, v]) => `${k}: ${v}`)].join('\n').slice(0, 2000);
  const deadline = sr.requiredBy > new Date() ? sr.requiredBy : new Date(Date.now() + 14 * 864e5);
  const rfq = await RFQ.create({
    buyer: buyer._id, title: sr.title, category: sr.category || 'Other', description: `Converted from sourcing request ${sr.number}.\n\n${sr.specifications}`.slice(0, 5000),
    items: [{ name: sr.title, specs, quantity: sr.quantity, unit: sr.unit, targetUnitPrice: +unitUsd.toFixed(2) }],
    budget: +toUsd(sr.priceBasis === 'unit' ? sr.targetPrice * sr.quantity : sr.targetPrice, sr.currency).toFixed(2),
    deadline, incoterm: sr.incoterm || 'FOB', containerType: 'none',
    destination: { country: sr.destination?.country || buyer.address?.country || 'United States', city: sr.destination?.city },
    attachments: sr.images, history: [{ action: 'created', by: req.user._id, note: `From sourcing request ${sr.number}` }],
  });
  sr.rfq = rfq._id;
  sr.buyer = buyer._id;
  sr.status = 'converted';
  logIt(sr, req, 'converted', `RFQ ${rfq.number}`);
  await sr.save();
  notify(buyer._id, { type: 'rfq_new', title: 'Your sourcing request is now an RFQ', body: `${rfq.number} will be matched with a verified manufacturer.`, link: `/buyer/rfqs/${rfq._id}`, email: false }).catch(() => {});
  audit(req, 'sourcing.convert', 'SourcingRequest', sr._id, { rfq: rfq.number });
  res.json(await loadSourcing(sr._id));
}));

/* ======================= LIAISON ENQUIRIES ======================= */
r.get('/liaison', ALL, ah(async (req, res) => {
  const q = {};
  if (req.query.status) q.status = { $in: String(req.query.status).split(',') };
  if (req.query.service) q.services = req.query.service;
  if (req.query.q) q.$or = [{ number: rx(req.query.q) }, { name: rx(req.query.q) }, { company: rx(req.query.q) }, { email: rx(req.query.q) }, { country: rx(req.query.q) }];
  const [list, counts, byService] = await Promise.all([
    LiaisonEnquiry.find(q).sort('-createdAt').limit(500).select('-log -notes -ip').populate('assignedTo', 'name').lean(),
    LiaisonEnquiry.aggregate([{ $group: { _id: '$status', n: { $sum: 1 } } }]),
    LiaisonEnquiry.aggregate([{ $unwind: '$services' }, { $group: { _id: '$services', n: { $sum: 1 } } }, { $sort: { n: -1 } }]),
  ]);
  res.json({ list, counts: Object.fromEntries(counts.map((c) => [c._id, c.n])), byService });
}));

const loadLiaison = (id) => LiaisonEnquiry.findById(id).populate('assignedTo', 'name').populate('notes.by', 'name');

r.get('/liaison/:id', ALL, ah(async (req, res) => {
  const e = await loadLiaison(req.params.id);
  if (!e) throw new HttpError(404, 'Enquiry not found.');
  res.json({ enquiry: e, team: await team() });
}));

r.patch('/liaison/:id', SUPPORT, ah(async (req, res) => {
  const e = await LiaisonEnquiry.findById(req.params.id);
  if (!e) throw new HttpError(404, 'Enquiry not found.');
  if (req.body.status && req.body.status !== e.status) {
    if (!LIAISON_STATUSES.includes(req.body.status)) throw new HttpError(400, 'Unknown status.');
    logIt(e, req, 'status', `${e.status} → ${req.body.status}`);
    e.status = req.body.status;
  }
  if (req.body.assignedTo !== undefined) e.assignedTo = oid(req.body.assignedTo);
  await e.save();
  audit(req, 'liaison.update', 'LiaisonEnquiry', e._id, req.body);
  res.json({ enquiry: await loadLiaison(e._id) });
}));

r.post('/liaison/:id/note', ALL, ah(async (req, res) => {
  const text = clip(req.body.text);
  if (!text) throw new HttpError(400, 'Write a note.');
  await LiaisonEnquiry.updateOne({ _id: req.params.id }, { $push: { notes: { by: req.user._id, text } } });
  res.json({ enquiry: await loadLiaison(req.params.id) });
}));

r.post('/liaison/:id/reply', SUPPORT, ah(async (req, res) => {
  const e = await LiaisonEnquiry.findById(req.params.id);
  if (!e) throw new HttpError(404, 'Enquiry not found.');
  const message = clip(req.body.message, 5000);
  if (!message) throw new HttpError(400, 'Write your reply.');
  await sendMail(e.email, clip(req.body.subject, 160) || `Re: your Ranavista liaison enquiry ${e.number}`, `Hello ${esc(e.name.split(' ')[0])},`,
    `<p style="white-space:pre-line">${esc(message)}</p><p>— ${esc(req.user.name)}, Ranavista Liaison Services</p>`);
  e.notes.push({ by: req.user._id, text: `✉️ Emailed client:\n${message}` });
  if (e.status === 'new') e.status = 'contacted';
  logIt(e, req, 'replied');
  await e.save();
  res.json({ enquiry: await loadLiaison(e._id) });
}));

/* ======================= COUNTRIES & PRODUCTS CATALOGUE ======================= */
const COUNTRY_FIELDS = ['name', 'slug', 'code', 'flag', 'region', 'currency', 'intro', 'strengths', 'hubs', 'leadTime', 'ports', 'sellerCountries', 'products', 'active', 'sort'];
const pickCountry = (b) => {
  const o = {};
  COUNTRY_FIELDS.forEach((k) => { if (b[k] !== undefined) o[k] = b[k]; });
  ['strengths', 'hubs', 'ports', 'sellerCountries'].forEach((k) => { if (typeof o[k] === 'string') o[k] = o[k].split(/[\n,]/).map((s) => s.trim()).filter(Boolean); });
  if (o.slug) o.slug = String(o.slug).toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
  if (Array.isArray(o.products)) o.products = o.products.filter((p) => p?.name?.trim()).map(({ _id, ...p }) => (_id && mongoose.isValidObjectId(_id) ? { _id, ...p } : p));
  return o;
};

r.get('/countries', ALL, ah(async (req, res) => {
  const [list, sellers] = await Promise.all([
    SourcingCountry.find().sort('sort name').lean(),
    User.aggregate([{ $match: { role: 'seller' } }, { $group: { _id: '$seller.country', n: { $sum: 1 }, approved: { $sum: { $cond: [{ $eq: ['$seller.approval', 'approved'] }, 1, 0] } } } }]),
  ]);
  const by = Object.fromEntries(sellers.map((s) => [s._id, s]));
  res.json(list.map((c) => {
    const names = c.sellerCountries?.length ? c.sellerCountries : [c.name];
    return { ...c, sellers: names.reduce((s, n) => s + (by[n]?.n || 0), 0), approvedSellers: names.reduce((s, n) => s + (by[n]?.approved || 0), 0) };
  }));
}));

r.post('/countries', OPS, ah(async (req, res) => {
  const data = pickCountry(req.body);
  if (!data.name) throw new HttpError(400, 'Country name is required.');
  data.slug ||= data.name.toLowerCase().replace(/[^a-z0-9]+/g, '-');
  const c = await SourcingCountry.create(data);
  audit(req, 'country.create', 'SourcingCountry', c._id, { name: c.name });
  res.status(201).json(c);
}));

r.patch('/countries/:id', OPS, ah(async (req, res) => {
  const c = await SourcingCountry.findByIdAndUpdate(req.params.id, pickCountry(req.body), { new: true, runValidators: true });
  if (!c) throw new HttpError(404, 'Country not found.');
  audit(req, 'country.update', 'SourcingCountry', c._id, { name: c.name, products: c.products.length });
  res.json(c);
}));

r.delete('/countries/:id', SUPER, ah(async (req, res) => {
  await SourcingCountry.findByIdAndDelete(req.params.id);
  audit(req, 'country.delete', 'SourcingCountry', req.params.id);
  res.json({ ok: true });
}));

/* ======================= BUYER & SELLER DASHBOARDS ======================= */
function monthsBack(n) {
  const now = new Date();
  return Array.from({ length: n }, (_, i) => new Date(now.getFullYear(), now.getMonth() - (n - 1 - i), 1));
}
const seriesFrom = (rows, months) => months.map((d) => ({
  label: d.toLocaleString('en-US', { month: 'short' }),
  value: rows.find((x) => x._id.y === d.getFullYear() && x._id.m === d.getMonth() + 1)?.n || 0,
}));
const signupAgg = (match, since) => User.aggregate([
  { $match: { ...match, createdAt: { $gte: since } } },
  { $group: { _id: { y: { $year: '$createdAt' }, m: { $month: '$createdAt' } }, n: { $sum: 1 } } },
]);

r.get('/insights/buyers', ALL, ah(async (req, res) => {
  const now = new Date();
  const week = new Date(now.getTime() - 7 * 864e5);
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
  const months = monthsBack(6);
  const base = { role: 'buyer' };
  const [total, newWeek, newMonth, verified, suspended, paying, byPlan, byCountry, signups, rfqStatus, activeRfqs, rfqsMonth, orders, gmv, held, sourcingOpen, sourcingTotal, topBuyers, recent, idle] = await Promise.all([
    User.countDocuments(base),
    User.countDocuments({ ...base, createdAt: { $gte: week } }),
    User.countDocuments({ ...base, createdAt: { $gte: monthStart } }),
    User.countDocuments({ ...base, emailVerified: true }),
    User.countDocuments({ ...base, status: 'suspended' }),
    User.countDocuments({ ...base, 'subscription.status': 'active', 'subscription.plan': { $nin: ['free', 'buyer_basic'] } }),
    User.aggregate([{ $match: base }, { $group: { _id: { $cond: [{ $eq: ['$subscription.status', 'active'] }, '$subscription.plan', 'buyer_basic'] }, n: { $sum: 1 } } }, { $sort: { n: -1 } }]),
    User.aggregate([{ $match: base }, { $group: { _id: { $ifNull: ['$address.country', 'Not set'] }, n: { $sum: 1 } } }, { $sort: { n: -1 } }, { $limit: 10 }]),
    signupAgg(base, months[0]),
    RFQ.aggregate([{ $group: { _id: '$status', n: { $sum: 1 } } }]),
    RFQ.countDocuments({ status: { $in: ['pending', 'assigned', 'quoted', 'negotiating'] } }),
    RFQ.countDocuments({ createdAt: { $gte: monthStart } }),
    Order.countDocuments({}),
    Order.aggregate([{ $match: { paymentStatus: { $in: ['held', 'released'] } } }, { $group: { _id: null, t: { $sum: '$total' } } }]),
    Order.aggregate([{ $match: { paymentStatus: { $in: ['held', 'disputed'] } } }, { $group: { _id: null, t: { $sum: '$total' } } }]),
    SourcingRequest.countDocuments({ status: { $in: ['new', 'in_review', 'sourcing', 'quoted'] } }),
    SourcingRequest.countDocuments({}),
    Order.aggregate([
      { $match: { paymentStatus: { $in: ['held', 'released'] } } },
      { $group: { _id: '$buyer', spend: { $sum: '$total' }, orders: { $sum: 1 } } }, { $sort: { spend: -1 } }, { $limit: 8 },
      { $lookup: { from: 'users', localField: '_id', foreignField: '_id', as: 'u' } }, { $unwind: '$u' },
      { $project: { spend: 1, orders: 1, name: '$u.name', company: '$u.company', country: '$u.address.country' } },
    ]),
    User.find(base).sort('-createdAt').limit(8).select('name company email address.country createdAt emailVerified subscription').lean(),
    User.countDocuments({ ...base, createdAt: { $lt: new Date(now.getTime() - 30 * 864e5) }, $or: [{ lastLoginAt: { $lt: new Date(now.getTime() - 60 * 864e5) } }, { lastLoginAt: { $exists: false } }] }),
  ]);
  const plans = await Plan.find({ audience: 'buyer' }).select('key name').lean();
  res.json({
    kpis: { total, newWeek, newMonth, verified, suspended, paying, activeRfqs, rfqsMonth, orders, gmv: gmv[0]?.t || 0, held: held[0]?.t || 0, sourcingOpen, sourcingTotal, idle },
    byPlan: byPlan.map((p) => ({ key: p._id, name: plans.find((x) => x.key === p._id)?.name || p._id, n: p.n })),
    byCountry, signups: seriesFrom(signups, months),
    rfqStatus: Object.fromEntries(rfqStatus.map((s) => [s._id, s.n])),
    topBuyers, recent,
  });
}));

r.get('/insights/sellers', ALL, ah(async (req, res) => {
  const now = new Date();
  const week = new Date(now.getTime() - 7 * 864e5);
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
  const months = monthsBack(6);
  const base = { role: 'seller' };
  const [total, newWeek, newMonth, approval, stages, pendingList, byPlan, byCountry, byCategory, signups, payouts, held, leadsOpen, topSellers, avg, suspended, regRevenue] = await Promise.all([
    User.countDocuments(base),
    User.countDocuments({ ...base, createdAt: { $gte: week } }),
    User.countDocuments({ ...base, createdAt: { $gte: monthStart } }),
    User.aggregate([{ $match: base }, { $group: { _id: '$seller.approval', n: { $sum: 1 } } }]),
    SupplierApplication.aggregate([{ $group: { _id: '$stage', n: { $sum: 1 } } }]),
    SupplierApplication.find({ stage: { $in: OPEN_STAGES } }).sort('submittedAt').limit(12).select('number companyName country city stage submittedAt stageChangedAt').lean(),
    User.aggregate([{ $match: base }, { $group: { _id: { $cond: [{ $eq: ['$subscription.status', 'active'] }, '$subscription.plan', 'none'] }, n: { $sum: 1 } } }, { $sort: { n: -1 } }]),
    User.aggregate([{ $match: base }, { $group: { _id: { $ifNull: ['$seller.country', 'Not set'] }, n: { $sum: 1 } } }, { $sort: { n: -1 } }, { $limit: 10 }]),
    User.aggregate([{ $match: base }, { $unwind: '$seller.categories' }, { $group: { _id: '$seller.categories', n: { $sum: 1 } } }, { $sort: { n: -1 } }, { $limit: 12 }]),
    signupAgg(base, months[0]),
    Order.aggregate([{ $match: { paymentStatus: 'released' } }, { $group: { _id: null, t: { $sum: '$sellerPayout' } } }]),
    Order.aggregate([{ $match: { paymentStatus: { $in: ['held', 'disputed'] } } }, { $group: { _id: null, t: { $sum: '$sellerPayout' } } }]),
    RFQ.countDocuments({ status: 'assigned' }),
    User.find({ ...base, 'seller.approval': 'approved' }).sort('-seller.rating -seller.ratingCount').limit(8).select('name company seller.country seller.rating seller.ratingCount seller.leadsReceived seller.leadsQuoted seller.supplierCode').lean(),
    User.aggregate([{ $match: { ...base, 'seller.leadsReceived': { $gt: 0 } } }, { $group: { _id: null, received: { $sum: '$seller.leadsReceived' }, quoted: { $sum: '$seller.leadsQuoted' }, rating: { $avg: '$seller.rating' } } }]),
    User.countDocuments({ ...base, status: 'suspended' }),
    SupplierApplication.aggregate([{ $match: { 'payment.paidAt': { $exists: true } } }, { $group: { _id: '$payment.currency', t: { $sum: '$payment.amount' }, n: { $sum: 1 } } }]),
  ]);
  const plans = await Plan.find({ audience: 'seller' }).select('key name').lean();
  const a = Object.fromEntries(approval.map((x) => [x._id || 'pending', x.n]));
  const st = Object.fromEntries(stages.map((x) => [x._id, x.n]));
  res.json({
    kpis: {
      total, newWeek, newMonth, approved: a.approved || 0, pending: a.pending || 0, rejected: a.rejected || 0, suspended,
      verificationsOpen: OPEN_STAGES.reduce((s, k) => s + (st[k] || 0), 0), leadsOpen,
      paidOut: payouts[0]?.t || 0, held: held[0]?.t || 0,
      responseRate: avg[0]?.received ? Math.round((avg[0].quoted / avg[0].received) * 100) : null, avgRating: avg[0]?.rating || 0,
    },
    stages: st, stageLabels: STAGE_LABEL,
    pendingVerifications: pendingList.map((v) => ({ ...v, label: STAGE_LABEL[v.stage], waitingDays: Math.floor((now - new Date(v.stageChangedAt || v.submittedAt).getTime()) / 864e5) })),
    byPlan: byPlan.map((p) => ({ key: p._id, name: p._id === 'none' ? 'No plan yet' : plans.find((x) => x.key === p._id)?.name || p._id, n: p.n })),
    byCountry, byCategory, signups: seriesFrom(signups, months), topSellers,
    registrationRevenue: regRevenue,
  });
}));

export default r;
