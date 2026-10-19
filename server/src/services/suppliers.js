import User from '../models/User.js';
import { Plan, nextSeq } from '../models/misc.js';
import { COMPANY_TYPES, SupplierApplication } from '../models/Marketplace.js';
import { HttpError } from '../middleware/error.js';
import { sendMail } from './mailer.js';
import { notify, notifyAdmins } from './notify.js';
import { getSettings, inboxFor } from './settings.js';
import { generateNdaPdf, generateSupplierInvoice, privatePath } from './supplierDocs.js';
import { stripe } from './stripe.js';
import env from '../config/env.js';

export const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]);
const clip = (s, n = 300) => (s == null ? undefined : String(s).trim().slice(0, n));
const isEmail = (s) => /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(String(s || ''));
const fmtDate = (d) => new Date(d).toLocaleString('en-IN', { dateStyle: 'medium', timeStyle: 'short', timeZone: 'Asia/Kolkata' });
const sellerLink = '/seller/verification';
// nested (non-subdocument) paths have no toObject() — read them from the document snapshot
const plain = (doc, key) => ({ ...(doc.toObject()[key] || {}) });
const adminLink = (app) => `/verifications/${app._id}`;

export const STAGE_LABEL = {
  submitted: 'Registration received',
  under_review: 'Under review',
  info_requested: 'More information needed',
  verification_scheduled: 'Verification scheduled',
  verified: 'Verification approved',
  nda_sent: 'NDA sent — awaiting signature',
  nda_signed: 'NDA signed',
  payment_pending: 'Awaiting plan payment',
  active: 'Active supplier',
  rejected: 'Not approved',
};
export const OPEN_STAGES = ['submitted', 'under_review', 'info_requested', 'verification_scheduled', 'verified', 'nda_sent', 'nda_signed', 'payment_pending'];

/* --------------------------- Registration form --------------------------- */
const REQUIRED = [
  ['companyName', 'Company name'], ['contactName', 'Contact person name'], ['address', 'Address'], ['contactNumber', 'Contact number'],
  ['email', 'Email address'], ['country', 'Country'], ['state', 'State'], ['city', 'City'], ['gst', 'GST / tax registration number'],
  ['factoryAddress', 'Factory address'], ['companyType', 'Company type'], ['establishedYear', 'Company established in (year)'],
  ['turnoverAmount', 'Company turnover'], ['employees', 'Number of employees'], ['factoryUnits', 'Number of factory units'],
  ['certifications', 'Certification'], ['productionCapacity', 'Production capacity (containers)'],
  ['productCategoriesCount', 'Number of product categories'], ['skuCount', "Number of SKU's"], ['exportingSince', 'Exporting since'],
  ['exportMarkets', 'Export market'], ['complianceStatus', 'Factory compliance checked / certified'],
];

/** Validate + clean the supplier registration form. Throws a 400 listing every missing field. */
export function validateApplication(b = {}) {
  const v = {
    companyName: clip(b.companyName, 160), contactName: clip(b.contactName, 120), address: clip(b.address, 400),
    contactNumber: clip(b.contactNumber, 40), email: clip(b.email, 160)?.toLowerCase(),
    country: clip(b.country, 80), state: clip(b.state, 80), city: clip(b.city, 80), postalCode: clip(b.postalCode, 20),
    gst: clip(b.gst, 40)?.toUpperCase(), factoryAddress: clip(b.factoryAddress, 400), companyType: clip(b.companyType, 60),
    establishedYear: Number(b.establishedYear) || undefined,
    turnoverAmount: Number(b.turnover?.amount ?? b.turnoverAmount) || undefined,
    turnoverCurrency: ['INR', 'USD', 'EUR', 'GBP', 'AED', 'CNY', 'VND'].includes(b.turnover?.currency) ? b.turnover.currency : 'INR',
    employees: Number(b.employees) || undefined, factoryUnits: Number(b.factoryUnits) || undefined,
    certifications: (Array.isArray(b.certifications) ? b.certifications : []).map((c) => clip(c, 80)).filter(Boolean).slice(0, 30),
    productionCapacity: Number(b.productionCapacity) || undefined,
    containerSize: ['20ft', '40ft', '40ft_hc'].includes(b.containerSize) ? b.containerSize : '40ft',
    productCategoriesCount: Number(b.productCategoriesCount) || undefined, skuCount: Number(b.skuCount) || undefined,
    exportingSince: Number(b.exportingSince) || undefined,
    exportMarkets: (Array.isArray(b.exportMarkets) ? b.exportMarkets : []).map((c) => clip(c, 80)).filter(Boolean).slice(0, 80),
    complianceStatus: ['certified', 'checked', 'in_progress', 'no'].includes(b.compliance?.status) ? b.compliance.status : undefined,
    complianceAudits: (Array.isArray(b.compliance?.audits) ? b.compliance.audits : []).map((c) => clip(c, 80)).filter(Boolean).slice(0, 20),
    complianceDetails: clip(b.compliance?.details, 1000),
    categories: (Array.isArray(b.categories) ? b.categories : []).map((c) => clip(c, 60)).filter(Boolean).slice(0, 50),
    website: clip(b.website, 200), description: clip(b.description, 3000),
  };
  const missing = REQUIRED.filter(([k]) => (Array.isArray(v[k]) ? !v[k].length : v[k] === undefined || v[k] === '' || v[k] === null)).map(([, l]) => l);
  if (missing.length) throw new HttpError(400, `Please fill in: ${missing.join(', ')}.`);
  if (!isEmail(v.email)) throw new HttpError(400, 'Please enter a valid email address.');
  const year = new Date().getFullYear();
  if (v.establishedYear < 1800 || v.establishedYear > year) throw new HttpError(400, 'Company established year looks wrong.');
  if (v.exportingSince < 1800 || v.exportingSince > year) throw new HttpError(400, '“Exporting since” year looks wrong.');
  if (!COMPANY_TYPES.includes(v.companyType)) throw new HttpError(400, 'Choose a company type.');
  ['employees', 'factoryUnits', 'productionCapacity', 'productCategoriesCount', 'skuCount', 'turnoverAmount'].forEach((k) => {
    if (!(v[k] > 0)) throw new HttpError(400, `${REQUIRED.find(([x]) => x === k)?.[1] || k} must be more than 0.`);
  });
  if (v.complianceStatus === 'certified' && !v.complianceAudits.length) throw new HttpError(400, 'Tell us which compliance audits / certificates your factory holds.');
  return {
    companyName: v.companyName, contactName: v.contactName, address: v.address, contactNumber: v.contactNumber, email: v.email,
    country: v.country, state: v.state, city: v.city, postalCode: v.postalCode, gst: v.gst, factoryAddress: v.factoryAddress,
    companyType: v.companyType, establishedYear: v.establishedYear, turnover: { amount: v.turnoverAmount, currency: v.turnoverCurrency },
    employees: v.employees, factoryUnits: v.factoryUnits, certifications: v.certifications, productionCapacity: v.productionCapacity,
    containerSize: v.containerSize, productCategoriesCount: v.productCategoriesCount, skuCount: v.skuCount, exportingSince: v.exportingSince,
    exportMarkets: v.exportMarkets, compliance: { status: v.complianceStatus, audits: v.complianceAudits, details: v.complianceDetails },
    categories: v.categories, website: v.website, description: v.description,
  };
}

export function logStep(app, user, action, note) {
  app.log.push({ by: user?._id, byName: user ? (user.role === 'admin' ? user.name : `${user.name} (supplier)`) : 'System', action, note });
}

async function syncUser(app, patch = {}) {
  await User.updateOne({ _id: app.user }, { $set: { 'seller.verificationStage': app.stage, ...patch } });
}

/* --------------------------- Notifications --------------------------- */
export async function announceNewApplication(app, resubmitted = false) {
  const when = fmtDate(app.submittedAt || new Date());
  const title = resubmitted ? 'Supplier registration updated' : 'New supplier registration received';
  await notifyAdmins({ type: 'supplier_registration', title, body: `${app.companyName} (${app.city}, ${app.country}) — ${when}`, link: adminLink(app) }, ['support', 'category']);
  const inbox = await inboxFor('seller');
  if (inbox) {
    sendMail(inbox, `${title}: ${app.companyName} — ${when}`, title,
      `<p><b>${esc(app.companyName)}</b> ${resubmitted ? 'updated their' : 'submitted a new'} supplier registration on <b>${esc(when)}</b> (IST).</p>
       <table style="font-size:14px;border-collapse:collapse">
         ${[['Reference', app.number], ['Contact', `${app.contactName} · ${app.contactNumber}`], ['Email', app.email], ['Location', `${app.city}, ${app.state}, ${app.country}`],
            ['GST / Tax ID', app.gst], ['Company type', app.companyType], ['Established', app.establishedYear], ['Employees', app.employees],
            ['Capacity', `${app.productionCapacity} containers / month`], ['Exporting since', app.exportingSince], ['Export markets', app.exportMarkets.join(', ')]]
          .map(([k, val]) => `<tr><td style="padding:3px 12px 3px 0;color:#6B7A78">${esc(k)}</td><td style="padding:3px 0">${esc(val)}</td></tr>`).join('')}
       </table>`,
      { label: 'Review in admin panel', url: `${env.adminUrl}${adminLink(app)}` });
  }
  if (!resubmitted) {
    sendMail(app.email, 'We received your supplier registration — Ranavista', 'Registration received',
      `<p>Thank you, ${esc(app.contactName.split(' ')[0])}. We’ve received the supplier registration for <b>${esc(app.companyName)}</b> (ref. ${esc(app.number)}).</p>
       <p>Our team will review your details and let you know whether a physical factory visit or a video call is needed for verification. You can follow every step in your seller dashboard.</p>`,
      { label: 'Track your verification', url: `${env.clientUrl}${sellerLink}` });
  }
}

/* --------------------------- NDA --------------------------- */
export async function sendNda(app, by) {
  const s = await getSettings();
  app.nda = { ...(plain(app, 'nda')), version: s.ndaVersion, sentAt: new Date(), signedAt: undefined, signerName: undefined, signerTitle: undefined, signerIp: undefined, signedCopy: undefined, method: undefined };
  app.nda.file = await generateNdaPdf(app, s);
  app.stage = 'nda_sent';
  logStep(app, by, 'nda.sent', `NDA v${s.ndaVersion} emailed to ${app.email}`);
  await app.save();
  await syncUser(app);
  await notify(app.user, { type: 'supplier_nda', title: 'Verification approved — please sign the NDA', body: 'Your factory verification is approved. Review and sign the NDA to continue.', link: sellerLink, email: false });
  sendMail(app.email, `Action needed: sign the Ranavista NDA (${app.number})`, 'Your verification is approved',
    `<p>Congratulations — <b>${esc(app.companyName)}</b> has passed Ranavista’s supplier verification.</p>
     <p>The next step is our <b>${esc(s.ndaTitle)}</b>. A copy is attached. You can sign it electronically in your seller dashboard in under a minute, or print, sign and upload a scanned copy.</p>
     <p>Once the NDA is signed you’ll receive your plan details and a secure payment link.</p>`,
    { label: 'Review & sign the NDA', url: `${env.clientUrl}${sellerLink}` },
    [{ filename: `Ranavista-NDA-${app.number}.pdf`, path: privatePath(app.nda.file) }]);
  return app;
}

export async function recordNdaSigned(app, by, { method, signerName, signerTitle, signerIp, signedCopy }) {
  if (app.stage !== 'nda_sent') throw new HttpError(400, 'The NDA is not waiting for a signature.');
  app.nda.signedAt = new Date();
  app.nda.method = method;
  app.nda.signerName = signerName;
  app.nda.signerTitle = signerTitle;
  app.nda.signerIp = signerIp;
  if (signedCopy) app.nda.signedCopy = signedCopy;
  app.stage = 'nda_signed';
  const s = await getSettings();
  app.nda.file = await generateNdaPdf(app, s);
  logStep(app, by, 'nda.signed', `${method === 'e-sign' ? 'E-signed' : method === 'upload' ? 'Signed copy uploaded' : 'Marked signed offline'} by ${signerName}`);
  await app.save();
  notifyAdmins({ type: 'supplier_nda_signed', title: 'Supplier signed the NDA', body: `${app.companyName} — plan details & payment link sent automatically.`, link: adminLink(app) }, ['support', 'finance']).catch(() => {});
  return sendPaymentLink(app, null);
}

/* --------------------------- Plans & payment --------------------------- */
export async function offeredPlans() {
  const s = await getSettings();
  const q = { audience: 'seller', active: true, customPricing: { $ne: true }, price: { $gt: 0 } };
  if (s.verificationPlans?.length) q.key = { $in: s.verificationPlans };
  return Plan.find(q).sort('sort').select('-stripePriceId').lean();
}

export async function sendPaymentLink(app, by, planKey) {
  const plans = await offeredPlans();
  if (!plans.length) throw new HttpError(400, 'No paid seller plans are active. Add one in Subscriptions first.');
  const chosen = plans.find((p) => p.key === (planKey || app.payment?.planKey || app.recommendedPlan)) || plans.find((p) => p.highlighted) || plans[0];
  app.payment = { ...(plain(app, 'payment')), planKey: chosen.key, planName: chosen.name, amount: chosen.price, currency: chosen.currency, billingPeriod: chosen.billingPeriod, sentAt: new Date() };
  app.stage = 'payment_pending';
  logStep(app, by, 'payment.link_sent', `Plan details sent (suggested: ${chosen.name})`);
  await app.save();
  await syncUser(app);
  const money = (p) => `${p.currency === 'INR' ? '₹' : '$'}${Number(p.price).toLocaleString(p.currency === 'INR' ? 'en-IN' : 'en-US')}`;
  const per = { month: '/month', quarter: '/3 months', year: '/year', one_time: ' one-time' };
  await notify(app.user, { type: 'supplier_payment', title: 'Choose your plan to activate your supplier account', body: `Suggested plan: ${chosen.name} (${money(chosen)}${per[chosen.billingPeriod] || ''}).`, link: `${sellerLink}#payment`, email: false });
  sendMail(app.email, `Your Ranavista plan & payment link (${app.number})`, 'Last step: activate your supplier account',
    `<p>Thank you for signing the NDA. Choose a plan and complete payment to activate <b>${esc(app.companyName)}</b> on Ranavista. Your supplier code and invoice are issued as soon as payment is received.</p>
     <table style="width:100%;font-size:14px;border-collapse:collapse;margin:12px 0">
       ${plans.map((p) => `<tr style="border-top:1px solid #eee"><td style="padding:8px 0"><b>${esc(p.name)}</b>${p.key === chosen.key ? ' <span style="color:#B89B6B">(suggested)</span>' : ''}<br><span style="color:#6B7A78">${esc(p.tagline || '')}</span></td><td style="padding:8px 0;text-align:right;white-space:nowrap"><b>${money(p)}</b>${per[p.billingPeriod] || ''}</td></tr>`).join('')}
     </table>
     <p style="font-size:13px;color:#6B7A78">Prefer bank transfer or UPI? Reply to this email and our team will share account details and mark the payment once received.</p>`,
    { label: 'Choose plan & pay securely', url: `${env.clientUrl}${sellerLink}#payment` });
  return app;
}

export async function createSupplierCheckout(app, plan) {
  if (!stripe) return { demo: true };
  const session = await stripe.checkout.sessions.create({
    mode: 'payment',
    customer_email: app.email,
    line_items: [{ quantity: 1, price_data: { currency: plan.currency.toLowerCase(), unit_amount: Math.round(plan.price * 100), product_data: { name: `Ranavista supplier membership — ${plan.name}`, description: `Supplier registration ${app.number}` } } }],
    metadata: { kind: 'supplier_registration', appId: String(app._id), planKey: plan.key },
    payment_intent_data: { metadata: { kind: 'supplier_registration', appId: String(app._id) } },
    success_url: `${env.clientUrl}${sellerLink}?paid={CHECKOUT_SESSION_ID}`,
    cancel_url: `${env.clientUrl}${sellerLink}?canceled=1#payment`,
  });
  return session;
}

/** Payment received → invoice, supplier code, seller activated. Idempotent. */
export async function markSupplierPaid(appId, { method, ref, planKey, amount, by } = {}) {
  const app = await SupplierApplication.findById(appId);
  if (!app) throw new HttpError(404, 'Application not found.');
  if (app.payment?.paidAt) return app;
  if (!['payment_pending', 'nda_signed'].includes(app.stage)) throw new HttpError(400, 'This supplier is not waiting for payment.');
  const plan = await Plan.findOne({ key: planKey || app.payment?.planKey, audience: 'seller' });
  if (!plan) throw new HttpError(400, 'Choose a seller plan.');
  const now = new Date();
  const year = now.getFullYear();
  const amt = amount != null && amount !== '' ? Number(amount) : plan.price;
  app.payment = {
    ...(plain(app, 'payment')),
    planKey: plan.key, planName: plan.name, amount: amt, currency: plan.currency, billingPeriod: plan.billingPeriod,
    paidAt: now, method, ref,
    invoiceNumber: `RV-SINV-${year}-${String(await nextSeq(`supplier-invoice-${year}`)).padStart(5, '0')}`,
  };
  app.supplierCode = app.supplierCode || `RV-SUP-${String(await nextSeq('supplier-code')).padStart(5, '0')}`;
  app.stage = 'active';
  const s = await getSettings();
  app.payment.invoiceFile = await generateSupplierInvoice(app, s);
  logStep(app, by, 'payment.received', `${plan.name} · ${plan.currency} ${amt} via ${method}${ref ? ` (${ref})` : ''}`);
  logStep(app, by, 'supplier.activated', `Supplier code ${app.supplierCode} generated`);
  await app.save();

  const days = { month: 30, quarter: 91, year: 365 }[plan.billingPeriod];
  const user = await User.findById(app.user);
  if (user) {
    user.company = user.company || app.companyName;
    user.phone = user.phone || app.contactNumber;
    user.seller = {
      ...(user.seller?.toObject?.() || {}),
      approval: 'approved', rejectionReason: undefined, supplierCode: app.supplierCode, verificationStage: 'active',
      country: app.country, yearEstablished: app.establishedYear,
      categories: user.seller?.categories?.length ? user.seller.categories : app.categories,
      description: user.seller?.description || app.description, website: user.seller?.website || app.website,
    };
    user.subscription = { ...(user.subscription?.toObject?.() || {}), plan: plan.key, status: 'active', currentPeriodEnd: days ? new Date(now.getTime() + days * 864e5) : undefined, assignedByAdmin: method !== 'stripe' };
    await user.save();
  }
  await notify(app.user, { type: 'supplier_active', title: `You’re live on Ranavista ✓ — code ${app.supplierCode}`, body: 'Payment received. Your invoice is ready and you can now receive exclusive buyer leads.', link: sellerLink, email: false });
  notifyAdmins({ type: 'supplier_paid', title: 'Supplier payment received', body: `${app.companyName} · ${plan.name} · code ${app.supplierCode}`, link: adminLink(app) }, ['finance', 'support']).catch(() => {});
  sendMail(app.email, `Payment confirmed — welcome to Ranavista (${app.supplierCode})`, 'Your supplier account is active',
    `<p>We’ve received your payment for the <b>${esc(plan.name)}</b> plan. Your invoice <b>${esc(app.payment.invoiceNumber)}</b> is attached.</p>
     <p style="font-size:18px">Your supplier code: <b style="color:#0D3B32;letter-spacing:1px">${esc(app.supplierCode)}</b></p>
     <p>Please quote this code in all communication with our team. Complete your company profile and connect payouts so we can start routing buyer leads to you.</p>`,
    { label: 'Open seller dashboard', url: `${env.clientUrl}/seller` },
    [{ filename: `Ranavista-Invoice-${app.payment.invoiceNumber}.pdf`, path: privatePath(app.payment.invoiceFile) }]);
  return app;
}

/** Email the supplier about a scheduled visit / call. */
export function emailSchedule(app, kind) {
  const step = app[kind];
  const isVisit = kind === 'physical';
  const when = fmtDate(step.scheduledAt);
  sendMail(app.email, `${isVisit ? 'Factory visit' : 'Verification call'} scheduled — ${when}`, isVisit ? 'Factory verification visit' : 'Verification video call',
    isVisit
      ? `<p>Our team will visit <b>${esc(app.companyName)}</b> for physical verification on <b>${esc(when)}</b> (IST).</p>
         <p>Location: ${esc(step.location || app.factoryAddress)}${step.assignee ? `<br>Visiting: ${esc(step.assignee)}` : ''}</p>
         <p>Please keep your registration certificates, GST certificate, factory compliance certificates and product samples ready.</p>${step.notes ? `<p>${esc(step.notes)}</p>` : ''}`
      : `<p>We’d like to verify <b>${esc(app.companyName)}</b> over a ${esc(step.platform || 'video')} call on <b>${esc(when)}</b> (IST).</p>
         ${step.link ? `<p>Meeting link: <a href="${esc(step.link)}">${esc(step.link)}</a></p>` : ''}${step.assignee ? `<p>Host: ${esc(step.assignee)}</p>` : ''}
         <p>Please join from the factory floor if possible and keep your documents handy.</p>${step.notes ? `<p>${esc(step.notes)}</p>` : ''}`,
    step.link ? { label: `Join ${step.platform || 'call'}`, url: step.link } : { label: 'Open seller dashboard', url: `${env.clientUrl}${sellerLink}` });
  notify(app.user, { type: 'supplier_schedule', title: isVisit ? 'Factory visit scheduled' : 'Verification call scheduled', body: `${when} (IST)`, link: sellerLink, email: false }).catch(() => {});
}

export { syncUser, adminLink, sellerLink };
