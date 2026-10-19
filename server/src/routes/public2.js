import { Router } from 'express';
import rateLimit from 'express-rate-limit';
import fs from 'fs';
import User from '../models/User.js';
import { LIAISON_SERVICES, LiaisonEnquiry, SourcingCountry, SourcingRequest } from '../models/Marketplace.js';
import { auth, allow, optionalAuth } from '../middleware/auth.js';
import { ah, HttpError } from '../middleware/error.js';
import { fileToRef, uploadImages } from '../middleware/upload.js';
import { notifyAdmins } from '../services/notify.js';
import { sendMail } from '../services/mailer.js';
import { inboxFor } from '../services/settings.js';
import { esc } from '../services/suppliers.js';
import { toUsd } from '../services/fx.js';
import env from '../config/env.js';

const clip = (s, n = 300) => (s == null || s === '' ? undefined : String(s).trim().slice(0, n));
const isEmail = (s) => /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(String(s || ''));
const removeFiles = (files) => Promise.all((files || []).map((f) => fs.promises.unlink(f.path).catch(() => {})));
const fmt = (d) => new Date(d).toLocaleString('en-IN', { dateStyle: 'medium', timeStyle: 'short', timeZone: 'Asia/Kolkata' });

export const publicRoutes = Router();

/* ======================= GEO (country → state → city dropdowns) ======================= */
let geo = null;
async function loadGeo() {
  if (geo !== null) return geo;
  try { const m = await import('country-state-city'); geo = m.Country ? m : m.default; } catch (e) { console.warn('country-state-city not installed — state/city lists disabled:', e.message); geo = false; }
  return geo;
}
const cacheFor = (res, s) => res.set('Cache-Control', `public, max-age=${s}`);

publicRoutes.get('/geo/countries', ah(async (req, res) => {
  const g = await loadGeo();
  cacheFor(res, 86400);
  res.json(g ? g.Country.getAllCountries().map((c) => ({ name: c.name, code: c.isoCode, flag: c.flag, phone: c.phonecode, currency: c.currency })) : []);
}));
publicRoutes.get('/geo/states', ah(async (req, res) => {
  const g = await loadGeo();
  cacheFor(res, 86400);
  if (!g || !req.query.country) return res.json([]);
  res.json(g.State.getStatesOfCountry(String(req.query.country)).map((s) => ({ name: s.name, code: s.isoCode })));
}));
publicRoutes.get('/geo/cities', ah(async (req, res) => {
  const g = await loadGeo();
  cacheFor(res, 86400);
  if (!g || !req.query.country || !req.query.state) return res.json([]);
  const names = [...new Set(g.City.getCitiesOfState(String(req.query.country), String(req.query.state)).map((c) => c.name))];
  res.json(names);
}));

/* ======================= PRODUCTS BY COUNTRY ======================= */
async function sellerCounts() {
  const rows = await User.aggregate([
    { $match: { role: 'seller', status: 'active', 'seller.approval': 'approved' } },
    { $group: { _id: '$seller.country', n: { $sum: 1 } } },
  ]);
  return Object.fromEntries(rows.map((r) => [r._id, r.n]));
}
const countFor = (c, counts) => (c.sellerCountries?.length ? c.sellerCountries : [c.name]).reduce((s, n) => s + (counts[n] || 0), 0);

publicRoutes.get('/countries', ah(async (req, res) => {
  const [list, counts] = await Promise.all([SourcingCountry.find({ active: true }).sort('sort name').lean(), sellerCounts()]);
  res.json(list.map(({ products, ...c }) => ({
    ...c, productCount: products.length, sellers: countFor(c, counts),
    categories: [...new Set(products.map((p) => p.category).filter(Boolean))],
    featured: products.filter((p) => p.featured).slice(0, 3).map((p) => p.name),
  })));
}));

publicRoutes.get('/countries/:slug', ah(async (req, res) => {
  const c = await SourcingCountry.findOne({ slug: req.params.slug, active: true }).lean();
  if (!c) throw new HttpError(404, 'Country not found.');
  const counts = await sellerCounts();
  res.json({ ...c, sellers: countFor(c, counts) });
}));

/* ======================= SOURCING REQUEST (public, guests or buyers) ======================= */
const sourcingLimiter = rateLimit({ windowMs: 60 * 60 * 1000, max: 12, standardHeaders: true, legacyHeaders: false, message: { message: 'Too many requests from this network. Please try again in an hour.' } });

publicRoutes.post('/sourcing-requests', sourcingLimiter, optionalAuth, uploadImages.array('images', 6), ah(async (req, res) => {
  const b = req.body || {};
  try {
    if (b.website) { await removeFiles(req.files); return res.status(201).json({ ok: true }); } // honeypot
    if (!req.files?.length) throw new HttpError(400, 'Please upload at least one product photo.');
    const u = req.user?.role === 'buyer' ? req.user : null;
    const contact = {
      name: clip(b.name, 120) || u?.name, email: (clip(b.email, 160) || u?.email || '').toLowerCase(), phone: clip(b.phone, 40) || u?.phone,
      company: clip(b.company, 160) || u?.company, country: clip(b.country, 80) || u?.address?.country,
    };
    const missing = [
      ['title', 'Product name'], ['specifications', 'Specifications'], ['quantity', 'Quantity'], ['targetPrice', 'Target price'], ['requiredBy', 'Required-by date'],
    ].filter(([k]) => !String(b[k] ?? '').trim()).map(([, l]) => l);
    if (!contact.name) missing.push('Your name');
    if (!contact.email) missing.push('Email');
    if (missing.length) throw new HttpError(400, `Please fill in: ${missing.join(', ')}.`);
    if (!isEmail(contact.email)) throw new HttpError(400, 'Please enter a valid email address.');
    const quantity = Number(b.quantity);
    const targetPrice = Number(b.targetPrice);
    const requiredBy = new Date(b.requiredBy);
    if (!(quantity > 0)) throw new HttpError(400, 'Quantity must be more than 0.');
    if (!(targetPrice >= 0)) throw new HttpError(400, 'Enter a valid target price.');
    if (Number.isNaN(requiredBy.getTime()) || requiredBy < new Date(Date.now() - 864e5)) throw new HttpError(400, 'Required-by date must be in the future.');
    const currency = /^[A-Z]{3}$/.test(String(b.currency || '')) ? b.currency : 'USD';
    const priceBasis = b.priceBasis === 'total' ? 'total' : 'unit';

    const sr = new SourcingRequest({
      buyer: u?._id, contact,
      title: clip(b.title, 160), category: clip(b.category, 60), specifications: clip(b.specifications, 5000),
      specs: { material: clip(b.material, 160), size: clip(b.size, 160), color: clip(b.color, 160), finish: clip(b.finish, 160), packaging: clip(b.packaging, 300), customization: clip(b.customization, 300) },
      images: req.files.map(fileToRef),
      quantity, unit: clip(b.unit, 20) || 'pcs', targetPrice, priceBasis, currency,
      targetPriceUsd: +toUsd(targetPrice, currency).toFixed(2),
      requiredBy, destination: { country: clip(b.destinationCountry, 80) || contact.country, city: clip(b.destinationCity, 80) },
      incoterm: clip(b.incoterm, 10), preferredOrigin: clip(b.preferredOrigin, 80),
      log: [{ action: 'created', byName: contact.name, note: u ? 'Submitted from buyer account' : 'Submitted from website' }],
      ip: req.ip,
    });
    await sr.save();

    const when = fmt(sr.createdAt);
    notifyAdmins({ type: 'sourcing_new', title: 'New sourcing request', body: `${sr.number} · ${sr.title} — ${contact.company || contact.name}`, link: `/sourcing/${sr._id}` }, ['support', 'category']).catch(() => {});
    const inbox = await inboxFor('sourcing');
    const price = `${currency} ${targetPrice.toLocaleString('en-US')} ${priceBasis === 'unit' ? `per ${sr.unit.replace(/s$/, '')}` : 'total'}`;
    if (inbox) {
      sendMail(inbox, `New sourcing request ${sr.number}: ${sr.title}`, 'New sourcing project',
        `<p><b>${esc(contact.name)}</b>${contact.company ? ` (${esc(contact.company)})` : ''} submitted a sourcing request on ${esc(when)} (IST).</p>
         <p><b>${esc(sr.title)}</b>${sr.category ? ` · ${esc(sr.category)}` : ''}<br>Quantity: ${quantity.toLocaleString('en-US')} ${esc(sr.unit)} · Target: ${esc(price)}<br>Required by: ${esc(requiredBy.toDateString())}</p>
         <p style="white-space:pre-line">${esc(sr.specifications).slice(0, 800)}</p>
         <p>${esc(contact.email)} · ${esc(contact.phone || '')}</p>`,
        { label: 'Open sourcing project', url: `${env.adminUrl}/sourcing/${sr._id}` });
    }
    sendMail(contact.email, `We received your sourcing request ${sr.number}`, 'Your sourcing project has started',
      `<p>Thank you, ${esc(contact.name.split(' ')[0])}. Our sourcing team has received your request for <b>${esc(sr.title)}</b> (${quantity.toLocaleString('en-US')} ${esc(sr.unit)}, target ${esc(price)}).</p>
       <p>We’ll search our verified manufacturer network and come back with options before <b>${esc(requiredBy.toDateString())}</b>. Your reference is <b>${esc(sr.number)}</b>.</p>`,
      u ? { label: 'Track in your dashboard', url: `${env.clientUrl}/buyer/sourcing/${sr._id}` } : null);
    res.status(201).json({ ok: true, id: sr._id, number: sr.number });
  } catch (e) {
    await removeFiles(req.files);
    throw e;
  }
}));

/* ======================= LIAISON SERVICES ENQUIRY ======================= */
const liaisonLimiter = rateLimit({ windowMs: 60 * 60 * 1000, max: 10, standardHeaders: true, legacyHeaders: false, message: { message: 'Too many enquiries from this network. Please try again later.' } });

publicRoutes.get('/liaison/services', (req, res) => res.json(LIAISON_SERVICES));

publicRoutes.post('/liaison', liaisonLimiter, ah(async (req, res) => {
  const b = req.body || {};
  if (b.website) return res.status(201).json({ ok: true });
  const services = (Array.isArray(b.services) ? b.services : []).filter((s) => LIAISON_SERVICES.includes(s));
  const data = {
    name: clip(b.name, 120), company: clip(b.company, 160), email: clip(b.email, 160)?.toLowerCase(), phone: clip(b.phone, 40),
    country: clip(b.country, 80), services, budget: clip(b.budget, 80), timeline: clip(b.timeline, 80), message: clip(b.message, 4000),
  };
  const missing = [['name', 'Name'], ['email', 'Email'], ['message', 'Message']].filter(([k]) => !data[k]).map(([, l]) => l);
  if (!services.length) missing.push('Services you are interested in');
  if (missing.length) throw new HttpError(400, `Please fill in: ${missing.join(', ')}.`);
  if (!isEmail(data.email)) throw new HttpError(400, 'Please enter a valid email address.');
  const e = new LiaisonEnquiry({ ...data, ip: req.ip, log: [{ action: 'created', byName: data.name }] });
  await e.save();
  notifyAdmins({ type: 'liaison_new', title: 'New liaison services enquiry', body: `${e.number} · ${data.company || data.name} — ${services.join(', ')}`, link: `/liaison/${e._id}` }, ['support']).catch(() => {});
  const inbox = await inboxFor('liaison');
  if (inbox) {
    sendMail(inbox, `Liaison enquiry ${e.number}: ${services.join(', ')}`, 'New liaison services enquiry',
      `<p><b>${esc(data.name)}</b>${data.company ? ` (${esc(data.company)})` : ''}${data.country ? `, ${esc(data.country)}` : ''} on ${esc(fmt(e.createdAt))} (IST)</p>
       <p>Services: <b>${esc(services.join(', '))}</b>${data.budget ? `<br>Budget: ${esc(data.budget)}` : ''}${data.timeline ? `<br>Timeline: ${esc(data.timeline)}` : ''}</p>
       <p style="white-space:pre-line">${esc(data.message)}</p><p>${esc(data.email)} · ${esc(data.phone || '')}</p>`,
      { label: 'Open in admin panel', url: `${env.adminUrl}/liaison/${e._id}` });
  }
  sendMail(data.email, `Thanks for contacting Ranavista Liaison Services (${e.number})`, 'We’ve received your enquiry',
    `<p>Thank you, ${esc(data.name.split(' ')[0])}. An industry specialist from our liaison team will reply within one business day about <b>${esc(services.join(', '))}</b>.</p>`);
  res.status(201).json({ ok: true, number: e.number });
}));

/* =====================================================================
 * BUYER: my sourcing requests   /api/sourcing/*
 * ===================================================================== */
export const buyerSourcingRoutes = Router();
buyerSourcingRoutes.use(auth, allow('buyer'));

const mine = (req) => ({ $or: [{ buyer: req.user._id }, { 'contact.email': req.user.email }] });
const BUYER_FIELDS = '-notes -supplierQuotes -log -ip -assignedTo';

buyerSourcingRoutes.get('/', ah(async (req, res) => {
  res.json(await SourcingRequest.find(mine(req)).sort('-createdAt').select(BUYER_FIELDS).lean());
}));

buyerSourcingRoutes.get('/:id', ah(async (req, res) => {
  const sr = await SourcingRequest.findOne({ _id: req.params.id, ...mine(req) }).select(BUYER_FIELDS).populate('rfq', 'number status').lean();
  if (!sr) throw new HttpError(404, 'Sourcing request not found.');
  res.json(sr);
}));

buyerSourcingRoutes.post('/:id/respond', ah(async (req, res) => {
  const sr = await SourcingRequest.findOne({ _id: req.params.id, ...mine(req) });
  if (!sr) throw new HttpError(404, 'Sourcing request not found.');
  if (sr.status !== 'quoted' || !sr.quote?.sentAt) throw new HttpError(400, 'There is no quotation waiting for your answer.');
  const decision = req.body.decision === 'accepted' ? 'accepted' : 'declined';
  sr.buyerResponse = { decision, note: clip(req.body.note, 1000), at: new Date() };
  sr.status = decision === 'accepted' ? 'accepted' : 'in_review';
  sr.log.push({ by: req.user._id, byName: req.user.name, action: `buyer.${decision}`, note: sr.buyerResponse.note });
  if (!sr.buyer) sr.buyer = req.user._id;
  await sr.save();
  notifyAdmins({ type: 'sourcing_response', title: `Buyer ${decision} sourcing quote`, body: `${sr.number} · ${sr.title}`, link: `/sourcing/${sr._id}` }, ['support', 'category']).catch(() => {});
  res.json(await SourcingRequest.findById(sr._id).select(BUYER_FIELDS).lean());
}));

