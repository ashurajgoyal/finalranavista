import { Router } from 'express';
import fs from 'fs';
import mongoose from 'mongoose';
import User from '../models/User.js';
import { Plan } from '../models/misc.js';
import { SUPPLIER_STAGES, SupplierApplication } from '../models/Marketplace.js';
import { auth, allow, adminRole } from '../middleware/auth.js';
import { ah, HttpError } from '../middleware/error.js';
import { upload, fileToRef } from '../middleware/upload.js';
import { audit } from '../utils/audit.js';
import { notify } from '../services/notify.js';
import { sendMail } from '../services/mailer.js';
import { getSettings } from '../services/settings.js';
import { stripe } from '../services/stripe.js';
import { privatePath } from '../services/supplierDocs.js';
import {
  OPEN_STAGES, STAGE_LABEL, announceNewApplication, createSupplierCheckout, emailSchedule, esc, logStep, markSupplierPaid,
  offeredPlans, recordNdaSigned, sendNda, sendPaymentLink, syncUser, validateApplication,
} from '../services/suppliers.js';
import env from '../config/env.js';

const rx = (s) => new RegExp(String(s).replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i');
const sendPrivate = (res, file, name) => {
  const full = privatePath(file);
  if (!file || !fs.existsSync(full)) throw new HttpError(404, 'File not found on the server (it may have been removed by a redeploy — regenerate it from the admin panel).');
  res.download(full, name);
};

/* =====================================================================
 * SELLER SIDE   /api/supplier/*
 * ===================================================================== */
export const supplierRoutes = Router();
supplierRoutes.use(auth, allow('seller'));

const myApp = (req) => SupplierApplication.findOne({ user: req.user._id });

supplierRoutes.get('/application', ah(async (req, res) => {
  const app = await myApp(req).lean();
  const s = await getSettings();
  const plans = app && ['payment_pending', 'nda_signed', 'active'].includes(app.stage) ? await offeredPlans() : [];
  if (app) { delete app.notes; app.log = (app.log || []).filter((l) => !String(l.action).startsWith('note')); }
  res.json({ application: app, stageLabels: STAGE_LABEL, plans, nda: { title: s.ndaTitle, version: s.ndaVersion }, demoPayments: !stripe });
}));

/** Create (existing sellers who registered before the new form) or update while editable. */
supplierRoutes.post('/application', ah(async (req, res) => {
  const data = validateApplication(req.body);
  let app = await myApp(req);
  if (app && !['submitted', 'info_requested'].includes(app.stage)) throw new HttpError(400, 'Your registration is already being verified and can’t be edited. Contact our team for changes.');
  const resubmitted = app?.stage === 'info_requested';
  if (!app) app = new SupplierApplication({ user: req.user._id, ...data, stage: 'submitted', submittedAt: new Date() });
  else { Object.assign(app, data); app.stage = 'submitted'; if (resubmitted) app.submittedAt = new Date(); }
  logStep(app, req.user, app.isNew ? 'application.submitted' : resubmitted ? 'application.resubmitted' : 'application.updated');
  const isNew = app.isNew;
  await app.save();
  await syncUser(app, { company: req.user.company || data.companyName, 'seller.country': data.country, ...(data.categories.length && { 'seller.categories': data.categories }) });
  if (isNew || resubmitted) await announceNewApplication(app, resubmitted);
  res.status(isNew ? 201 : 200).json(app);
}));

supplierRoutes.post('/application/documents', upload.array('files', 5), ah(async (req, res) => {
  const app = await myApp(req);
  if (!app) throw new HttpError(400, 'Submit your registration form first.');
  const kind = String(req.body.kind || 'other').slice(0, 40);
  const refs = (req.files || []).map((f) => ({ ...fileToRef(f), kind }));
  app.documents.push(...refs);
  logStep(app, req.user, 'documents.uploaded', refs.map((d) => d.name).join(', '));
  await app.save();
  // Keep the legacy seller.documents list (used by admin seller page) in sync
  await User.updateOne({ _id: req.user._id }, { $push: { 'seller.documents': { $each: refs.map(({ name, url }) => ({ name, url })) } } });
  res.json(app.documents);
}));

supplierRoutes.get('/nda', ah(async (req, res) => {
  const app = await myApp(req);
  if (!app?.nda?.file) throw new HttpError(404, 'The NDA has not been issued yet.');
  sendPrivate(res, app.nda.file, `Ranavista-NDA-${app.number}.pdf`);
}));

supplierRoutes.post('/nda/sign', ah(async (req, res) => {
  const app = await myApp(req);
  if (!app) throw new HttpError(404, 'Application not found.');
  const signerName = String(req.body.signerName || '').trim().slice(0, 120);
  if (signerName.length < 3) throw new HttpError(400, 'Type your full name to sign.');
  if (!req.body.agree) throw new HttpError(400, 'Please confirm you have read and agree to the NDA.');
  await recordNdaSigned(app, req.user, { method: 'e-sign', signerName, signerTitle: String(req.body.signerTitle || '').slice(0, 80), signerIp: req.ip });
  res.json(await myApp(req));
}));

supplierRoutes.post('/nda/upload', upload.single('file'), ah(async (req, res) => {
  const app = await myApp(req);
  if (!app) throw new HttpError(404, 'Application not found.');
  if (!req.file) throw new HttpError(400, 'Attach the signed NDA (PDF or image).');
  await recordNdaSigned(app, req.user, { method: 'upload', signerName: String(req.body.signerName || app.contactName).slice(0, 120), signerTitle: String(req.body.signerTitle || '').slice(0, 80), signerIp: req.ip, signedCopy: fileToRef(req.file) });
  res.json(await myApp(req));
}));

supplierRoutes.post('/pay', ah(async (req, res) => {
  const app = await myApp(req);
  if (!app || app.stage !== 'payment_pending') throw new HttpError(400, 'Your account is not waiting for payment.');
  const plans = await offeredPlans();
  const plan = plans.find((p) => p.key === req.body.planKey);
  if (!plan) throw new HttpError(400, 'Choose one of the plans shown.');
  if (app.payment.planKey !== plan.key) {
    Object.assign(app.payment, { planKey: plan.key, planName: plan.name, amount: plan.price, currency: plan.currency, billingPeriod: plan.billingPeriod });
    await app.save();
  }
  const session = await createSupplierCheckout(app, plan);
  if (session.demo) {
    await markSupplierPaid(app._id, { method: 'demo', ref: 'demo-mode', planKey: plan.key, by: req.user });
    return res.json({ paid: true, demo: true });
  }
  app.payment.checkoutId = session.id;
  await app.save();
  res.json({ url: session.url });
}));

/** Called when Stripe redirects back — confirms payment even if the webhook isn't configured yet. */
supplierRoutes.post('/pay/verify', ah(async (req, res) => {
  const app = await myApp(req);
  if (!app) throw new HttpError(404, 'Application not found.');
  if (app.payment?.paidAt || !stripe || !req.body.sessionId) return res.json(app);
  const s = await stripe.checkout.sessions.retrieve(String(req.body.sessionId));
  if (s.metadata?.appId === String(app._id) && s.payment_status === 'paid') {
    return res.json(await markSupplierPaid(app._id, { method: 'stripe', ref: s.payment_intent, planKey: s.metadata.planKey }));
  }
  res.json(app);
}));

supplierRoutes.get('/invoice', ah(async (req, res) => {
  const app = await myApp(req);
  if (!app?.payment?.invoiceFile) throw new HttpError(404, 'Invoice not available yet.');
  sendPrivate(res, app.payment.invoiceFile, `Ranavista-Invoice-${app.payment.invoiceNumber}.pdf`);
}));

/* =====================================================================
 * ADMIN SIDE   /api/admin/suppliers/*
 * ===================================================================== */
export const adminSupplierRoutes = Router();
adminSupplierRoutes.use(auth, allow('admin'));
const VIEW = adminRole('support', 'category', 'finance');
const WORK = adminRole('support', 'category');
const MONEY = adminRole('finance', 'support');

const load = async (id) => {
  const app = await SupplierApplication.findById(id);
  if (!app) throw new HttpError(404, 'Application not found.');
  return app;
};
const full = (id) => SupplierApplication.findById(id)
  .populate('user', 'name email phone company status emailVerified createdAt lastLoginAt seller.approval seller.supplierCode subscription')
  .populate('assignedTo', 'name').populate('notes.by', 'name').populate('decision.by', 'name').lean();

adminSupplierRoutes.get('/', VIEW, ah(async (req, res) => {
  const q = {};
  if (req.query.stage === 'open') q.stage = { $in: OPEN_STAGES };
  else if (req.query.stage && SUPPLIER_STAGES.includes(req.query.stage)) q.stage = req.query.stage;
  if (req.query.country) q.country = req.query.country;
  if (req.query.q) q.$or = [{ companyName: rx(req.query.q) }, { contactName: rx(req.query.q) }, { email: rx(req.query.q) }, { number: rx(req.query.q) }, { gst: rx(req.query.q) }, { supplierCode: rx(req.query.q) }, { city: rx(req.query.q) }];
  const [list, counts] = await Promise.all([
    SupplierApplication.find(q).sort(req.query.stage === 'active' ? '-updatedAt' : 'submittedAt').limit(500)
      .select('number companyName contactName email country state city stage submittedAt stageChangedAt supplierCode physical.needed physical.status physical.scheduledAt virtual.needed virtual.status virtual.scheduledAt payment.planName payment.paidAt assignedTo')
      .populate('assignedTo', 'name').lean(),
    SupplierApplication.aggregate([{ $group: { _id: '$stage', n: { $sum: 1 } } }]),
  ]);
  res.json({ list, counts: Object.fromEntries(counts.map((c) => [c._id, c.n])), labels: STAGE_LABEL });
}));

adminSupplierRoutes.get('/:id', VIEW, ah(async (req, res) => {
  const app = await full(req.params.id);
  if (!app) throw new HttpError(404, 'Application not found.');
  const [plans, team] = await Promise.all([Plan.find({ audience: 'seller' }).sort('sort').lean(), User.find({ role: 'admin', status: 'active' }).select('name adminRole').lean()]);
  res.json({ application: app, labels: STAGE_LABEL, plans, team });
}));

/** Step 1 — choose verification layers: A) physical visit  B) virtual call */
adminSupplierRoutes.post('/:id/review', WORK, ah(async (req, res) => {
  const app = await load(req.params.id);
  if (['active', 'rejected', 'nda_sent', 'nda_signed', 'payment_pending'].includes(app.stage)) throw new HttpError(400, 'Verification options can no longer be changed at this stage.');
  const physical = !!req.body.physicalNeeded;
  const virtual = !!req.body.virtualNeeded;
  app.physical.needed = physical;
  app.virtual.needed = virtual;
  if (!physical) app.physical.status = 'not_required'; else if (app.physical.status === 'not_required') app.physical.status = 'pending';
  if (!virtual) app.virtual.status = 'not_required'; else if (app.virtual.status === 'not_required') app.virtual.status = 'pending';
  if (['submitted', 'info_requested'].includes(app.stage)) app.stage = 'under_review';
  if (!app.assignedTo) app.assignedTo = req.user._id;
  logStep(app, req.user, 'verification.options', `Physical verification: ${physical ? 'Yes' : 'No'} · Virtual verification: ${virtual ? 'Yes' : 'No'}`);
  await app.save();
  await syncUser(app);
  if (app.stage === 'under_review' && req.body.notifySeller !== false) {
    notify(app.user, { type: 'supplier_review', title: 'Your registration is under review', body: physical || virtual ? `We’ll schedule a ${[physical && 'factory visit', virtual && 'video call'].filter(Boolean).join(' and ')} with you shortly.` : 'Our team is reviewing your documents.', link: '/seller/verification' }).catch(() => {});
  }
  audit(req, 'supplier.review', 'SupplierApplication', app._id, { physical, virtual });
  res.json(await full(app._id));
}));

adminSupplierRoutes.post('/:id/schedule', WORK, ah(async (req, res) => {
  const app = await load(req.params.id);
  const kind = req.body.kind === 'virtual' ? 'virtual' : 'physical';
  if (!app[kind].needed) throw new HttpError(400, `Mark ${kind} verification as required first.`);
  if (!req.body.scheduledAt || Number.isNaN(new Date(req.body.scheduledAt).getTime())) throw new HttpError(400, 'Choose a date and time.');
  if (kind === 'virtual' && req.body.link && !/^https?:\/\//i.test(req.body.link)) throw new HttpError(400, 'Meeting link must start with https://');
  Object.assign(app[kind], {
    status: 'scheduled', scheduledAt: new Date(req.body.scheduledAt), assignee: req.body.assignee, notes: req.body.notes,
    ...(kind === 'physical' ? { location: req.body.location || app.factoryAddress } : { platform: req.body.platform || 'Zoom', link: req.body.link }),
  });
  if (['submitted', 'under_review', 'info_requested'].includes(app.stage)) app.stage = 'verification_scheduled';
  logStep(app, req.user, `verification.${kind}.scheduled`, `${new Date(req.body.scheduledAt).toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' })}${req.body.assignee ? ` · ${req.body.assignee}` : ''}`);
  await app.save();
  await syncUser(app);
  if (req.body.notifySeller !== false) emailSchedule(app, kind);
  audit(req, `supplier.${kind}.schedule`, 'SupplierApplication', app._id, { scheduledAt: req.body.scheduledAt });
  res.json(await full(app._id));
}));

adminSupplierRoutes.post('/:id/complete', WORK, ah(async (req, res) => {
  const app = await load(req.params.id);
  const kind = req.body.kind === 'virtual' ? 'virtual' : 'physical';
  const result = req.body.result === 'fail' ? 'fail' : 'pass';
  Object.assign(app[kind], { status: result === 'pass' ? 'completed' : 'failed', result, completedAt: new Date(), notes: req.body.notes || app[kind].notes, ...(req.body.report?.url && { report: req.body.report }) });
  logStep(app, req.user, `verification.${kind}.${result}`, req.body.notes);
  await app.save();
  audit(req, `supplier.${kind}.${result}`, 'SupplierApplication', app._id);
  res.json(await full(app._id));
}));

adminSupplierRoutes.post('/:id/request-info', WORK, ah(async (req, res) => {
  const app = await load(req.params.id);
  const message = String(req.body.message || '').trim();
  if (!message) throw new HttpError(400, 'Tell the supplier what to update.');
  if (['active', 'rejected'].includes(app.stage)) throw new HttpError(400, 'Not possible at this stage.');
  app.stage = 'info_requested';
  app.infoRequest = { message, at: new Date() };
  logStep(app, req.user, 'info.requested', message);
  await app.save();
  await syncUser(app);
  await notify(app.user, { type: 'supplier_info', title: 'Please update your supplier registration', body: message.slice(0, 200), link: '/seller/verification', email: false });
  sendMail(app.email, `Update needed on your Ranavista registration (${app.number})`, 'We need a little more information',
    `<p>${esc(message).replace(/\n/g, '<br>')}</p><p>Please update your registration in the seller dashboard and resubmit.</p>`,
    { label: 'Update registration', url: `${env.clientUrl}/seller/verification` });
  audit(req, 'supplier.request_info', 'SupplierApplication', app._id, { message });
  res.json(await full(app._id));
}));

/** Approve verification → NDA goes out automatically. */
adminSupplierRoutes.post('/:id/approve', WORK, ah(async (req, res) => {
  const app = await load(req.params.id);
  if (!['submitted', 'under_review', 'verification_scheduled', 'verified', 'info_requested'].includes(app.stage)) throw new HttpError(400, 'This application has already moved past verification.');
  if (app.physical.needed == null && app.virtual.needed == null && !req.body.force) throw new HttpError(400, 'Choose whether physical / virtual verification is required first.');
  const pending = ['physical', 'virtual'].filter((k) => app[k].needed && app[k].status !== 'completed');
  if (pending.length && !req.body.force) throw new HttpError(400, `Complete the ${pending.join(' and ')} verification first (or approve anyway).`);
  app.decision = { result: 'approved', reason: req.body.note, by: req.user._id, at: new Date() };
  if (req.body.recommendedPlan) app.recommendedPlan = req.body.recommendedPlan;
  app.stage = 'verified';
  logStep(app, req.user, 'verification.approved', req.body.note || (pending.length ? `Approved without completing: ${pending.join(', ')}` : ''));
  await app.save();
  await sendNda(app, req.user);
  audit(req, 'supplier.approve', 'SupplierApplication', app._id, { company: app.companyName });
  res.json(await full(app._id));
}));

adminSupplierRoutes.post('/:id/reject', WORK, ah(async (req, res) => {
  const app = await load(req.params.id);
  const reason = String(req.body.reason || '').trim();
  if (!reason) throw new HttpError(400, 'Give a reason (it is sent to the supplier).');
  app.decision = { result: 'rejected', reason, by: req.user._id, at: new Date() };
  app.stage = 'rejected';
  logStep(app, req.user, 'verification.rejected', reason);
  await app.save();
  await syncUser(app, { 'seller.approval': 'rejected', 'seller.rejectionReason': reason });
  await notify(app.user, { type: 'seller_rejected', title: 'Supplier verification update', body: reason.slice(0, 200), link: '/seller/verification' });
  audit(req, 'supplier.reject', 'SupplierApplication', app._id, { reason });
  res.json(await full(app._id));
}));

adminSupplierRoutes.post('/:id/reopen', WORK, ah(async (req, res) => {
  const app = await load(req.params.id);
  if (app.stage !== 'rejected') throw new HttpError(400, 'Only rejected applications can be reopened.');
  app.stage = 'under_review';
  app.decision = undefined;
  logStep(app, req.user, 'application.reopened', req.body.note);
  await app.save();
  await syncUser(app, { 'seller.approval': 'pending' });
  res.json(await full(app._id));
}));

adminSupplierRoutes.post('/:id/resend-nda', WORK, ah(async (req, res) => {
  const app = await load(req.params.id);
  if (!['verified', 'nda_sent'].includes(app.stage)) throw new HttpError(400, 'The NDA can be (re)sent after verification is approved and before it is signed.');
  await sendNda(app, req.user);
  res.json(await full(app._id));
}));

adminSupplierRoutes.post('/:id/nda-signed', WORK, ah(async (req, res) => {
  const app = await load(req.params.id);
  await recordNdaSigned(app, req.user, { method: 'offline', signerName: req.body.signerName || app.contactName, signerTitle: req.body.signerTitle, signedCopy: req.body.file?.url ? req.body.file : undefined });
  audit(req, 'supplier.nda_offline', 'SupplierApplication', app._id);
  res.json(await full(app._id));
}));

adminSupplierRoutes.post('/:id/send-payment', MONEY, ah(async (req, res) => {
  const app = await load(req.params.id);
  if (!['nda_signed', 'payment_pending'].includes(app.stage)) throw new HttpError(400, 'Payment link is sent after the NDA is signed.');
  await sendPaymentLink(app, req.user, req.body.planKey);
  res.json(await full(app._id));
}));

adminSupplierRoutes.post('/:id/mark-paid', MONEY, ah(async (req, res) => {
  const method = ['bank_transfer', 'upi', 'cheque', 'cash', 'waived', 'other', 'stripe'].includes(req.body.method) ? req.body.method : 'bank_transfer';
  const app = await markSupplierPaid(req.params.id, { method, ref: req.body.ref, planKey: req.body.planKey, amount: req.body.amount, by: req.user });
  audit(req, 'supplier.mark_paid', 'SupplierApplication', app._id, { method, ref: req.body.ref, amount: req.body.amount });
  res.json(await full(app._id));
}));

adminSupplierRoutes.post('/:id/assign', WORK, ah(async (req, res) => {
  const app = await load(req.params.id);
  app.assignedTo = req.body.adminId ? new mongoose.Types.ObjectId(String(req.body.adminId)) : undefined;
  logStep(app, req.user, 'assigned', req.body.adminName || '');
  await app.save();
  res.json(await full(app._id));
}));

adminSupplierRoutes.post('/:id/note', VIEW, ah(async (req, res) => {
  const app = await load(req.params.id);
  const text = String(req.body.text || '').trim();
  if (!text) throw new HttpError(400, 'Write a note.');
  app.notes.push({ by: req.user._id, text: text.slice(0, 2000) });
  await app.save();
  res.json(await full(app._id));
}));

adminSupplierRoutes.get('/:id/nda', VIEW, ah(async (req, res) => {
  const app = await load(req.params.id);
  sendPrivate(res, app.nda?.file, `NDA-${app.number}.pdf`);
}));
adminSupplierRoutes.get('/:id/invoice', VIEW, ah(async (req, res) => {
  const app = await load(req.params.id);
  sendPrivate(res, app.payment?.invoiceFile, `Invoice-${app.payment?.invoiceNumber || app.number}.pdf`);
}));
