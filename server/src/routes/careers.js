import { Router } from 'express';
import fs from 'fs';
import path from 'path';
import rateLimit from 'express-rate-limit';
import { JobApplication, JobOpening, APPLICATION_STATUSES } from '../models/Career.js';
import { auth, allow, adminRole } from '../middleware/auth.js';
import { ah, HttpError } from '../middleware/error.js';
import { CV_DIR, uploadCv } from '../middleware/upload.js';
import { sendMail } from '../services/mailer.js';
import { notifyAdmins } from '../services/notify.js';
import { audit } from '../utils/audit.js';
import env from '../config/env.js';

/* =========================================================================
 * Careers
 *   Public : GET  /api/public/careers            open positions
 *            POST /api/public/careers/apply      application + CV (multipart, field "cv")
 *   Admin  : /api/admin/careers/*                applications, CV download, openings CRUD
 * ========================================================================= */

const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]);
const clip = (s, n = 300) => (s == null ? undefined : String(s).trim().slice(0, n));
const isEmail = (s) => /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(String(s || ''));
const isUrl = (s) => !s || /^https?:\/\/\S+$/i.test(String(s));
const removeFile = (f) => f && fs.promises.unlink(f.path).catch(() => {});

export const publicCareers = Router();

publicCareers.get('/', ah(async (req, res) => {
  res.json(await JobOpening.find({ active: true }).sort('sort -createdAt').lean());
}));

const applyLimiter = rateLimit({ windowMs: 60 * 60 * 1000, max: 8, standardHeaders: true, legacyHeaders: false, message: { message: 'Too many applications from this network. Please try again in an hour.' } });

publicCareers.post('/apply', applyLimiter, uploadCv.single('cv'), ah(async (req, res) => {
  const b = req.body || {};
  try {
    // Honeypot: real visitors never fill the hidden "website" field
    if (b.website) { await removeFile(req.file); return res.status(201).json({ ok: true }); }

    if (!req.file) throw new HttpError(400, 'Please attach your CV (PDF, DOC or DOCX, up to 5 MB).');
    const missing = [['name', 'Full name'], ['email', 'Email'], ['phone', 'Phone number'], ['country', 'Country'], ['experienceYears', 'Experience']]
      .filter(([k]) => !String(b[k] || '').trim()).map(([, l]) => l);
    if (missing.length) throw new HttpError(400, `Please fill in: ${missing.join(', ')}.`);
    if (!isEmail(b.email)) throw new HttpError(400, 'Please enter a valid email address.');
    if (!isUrl(b.linkedin) || !isUrl(b.portfolio)) throw new HttpError(400, 'Links must start with http:// or https://');
    if (b.consent !== 'true' && b.consent !== true) throw new HttpError(400, 'Please accept the privacy notice so we can process your application.');

    let opening = null;
    if (b.openingId) opening = await JobOpening.findOne({ _id: b.openingId, active: true }).catch(() => null);
    const position = opening?.title || clip(b.position, 120) || 'General application';

    const app = await JobApplication.create({
      opening: opening?._id,
      position,
      name: clip(b.name, 120), email: clip(b.email, 160), phone: clip(b.phone, 40),
      country: clip(b.country, 80), city: clip(b.city, 80),
      currentRole: clip(b.currentRole, 120), currentCompany: clip(b.currentCompany, 120),
      experienceYears: clip(b.experienceYears, 30), highestQualification: clip(b.highestQualification, 120),
      noticePeriod: clip(b.noticePeriod, 60), expectedSalary: clip(b.expectedSalary, 60),
      linkedin: clip(b.linkedin, 300), portfolio: clip(b.portfolio, 300),
      coverLetter: clip(b.coverLetter, 4000), source: clip(b.source, 80),
      cv: { name: clip(req.file.originalname, 200), file: req.file.filename, size: req.file.size, mime: req.file.mimetype },
      consent: true,
      ip: req.ip,
    });

    // Team notifications (admin bell + HR inbox) and applicant acknowledgement — never block the response
    notifyAdmins({ type: 'application', title: 'New job application', body: `${app.name} — ${position}`, link: `/careers/${app._id}` }, ['support']).catch(() => {});
    if (env.careersEmail) {
      sendMail(env.careersEmail, `New application: ${position} — ${app.name}`, 'New job application',
        `<p><b>${esc(app.name)}</b> applied for <b>${esc(position)}</b>.</p>
         <p>${esc(app.email)} · ${esc(app.phone)}<br>${esc([app.city, app.country].filter(Boolean).join(', '))}<br>Experience: ${esc(app.experienceYears)}</p>`,
        { label: 'Open in admin panel', url: `${env.adminUrl}/careers/${app._id}` });
    }
    sendMail(app.email, 'We received your application — Ranavista', `Thank you, ${esc(app.name.split(' ')[0])}`,
      `<p>We’ve received your application for <b>${esc(position)}</b>. Our team reviews every CV personally.</p>
       <p>If your profile matches what we’re looking for, we’ll contact you within 2–3 weeks. We’ll keep your CV on file for future openings too.</p>`);

    res.status(201).json({ ok: true, id: app._id });
  } catch (e) {
    await removeFile(req.file);
    throw e;
  }
}));

/* ------------------------------- ADMIN ------------------------------- */
export const adminCareers = Router();
adminCareers.use(auth, allow('admin'), adminRole('support'));

adminCareers.get('/applications', ah(async (req, res) => {
  const { status, opening, q } = req.query;
  const filter = {};
  if (status && APPLICATION_STATUSES.includes(status)) filter.status = status;
  if (opening === 'general') filter.opening = { $exists: false };
  else if (opening) filter.opening = opening;
  if (q) {
    const rx = new RegExp(String(q).replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i');
    filter.$or = [{ name: rx }, { email: rx }, { position: rx }, { currentCompany: rx }, { city: rx }, { country: rx }];
  }
  const [list, counts] = await Promise.all([
    JobApplication.find(filter).sort('-createdAt').limit(500).select('-notes -coverLetter').lean(),
    JobApplication.aggregate([{ $group: { _id: '$status', n: { $sum: 1 } } }]),
  ]);
  res.json({ list, counts: Object.fromEntries(counts.map((c) => [c._id, c.n])) });
}));

adminCareers.get('/applications/:id', ah(async (req, res) => {
  const app = await JobApplication.findById(req.params.id).populate('opening', 'title department location').populate('notes.by', 'name');
  if (!app) throw new HttpError(404, 'Application not found.');
  res.json(app);
}));

adminCareers.patch('/applications/:id', ah(async (req, res) => {
  const app = await JobApplication.findById(req.params.id);
  if (!app) throw new HttpError(404, 'Application not found.');
  const { status, note, rating } = req.body;
  if (status) {
    if (!APPLICATION_STATUSES.includes(status)) throw new HttpError(400, 'Unknown status.');
    if (status !== app.status) app.notes.push({ by: req.user._id, text: `Status changed: ${app.status} → ${status}` });
    app.status = status;
  }
  if (rating != null) app.rating = Math.max(0, Math.min(5, Number(rating) || 0));
  if (note && String(note).trim()) app.notes.push({ by: req.user._id, text: String(note).trim().slice(0, 2000) });
  await app.save();
  audit(req, 'career.application.update', 'JobApplication', app._id, { status: app.status });
  res.json(await app.populate('notes.by', 'name'));
}));

adminCareers.get('/applications/:id/cv', ah(async (req, res) => {
  const app = await JobApplication.findById(req.params.id).select('cv name');
  if (!app?.cv?.file) throw new HttpError(404, 'CV not found.');
  const full = path.join(CV_DIR, path.basename(app.cv.file));
  if (!fs.existsSync(full)) throw new HttpError(404, 'CV file is missing on the server (it may have been removed by a redeploy).');
  audit(req, 'career.cv.download', 'JobApplication', app._id);
  res.download(full, app.cv.name || path.basename(full));
}));

adminCareers.delete('/applications/:id', adminRole('super'), ah(async (req, res) => {
  const app = await JobApplication.findByIdAndDelete(req.params.id);
  if (app?.cv?.file) fs.promises.unlink(path.join(CV_DIR, path.basename(app.cv.file))).catch(() => {});
  audit(req, 'career.application.delete', 'JobApplication', req.params.id);
  res.json({ ok: true });
}));

/* Openings */
const OPENING_FIELDS = ['title', 'department', 'location', 'type', 'workMode', 'experience', 'summary', 'responsibilities', 'requirements', 'active', 'sort'];
const pick = (b) => {
  const o = {};
  OPENING_FIELDS.forEach((k) => { if (b[k] !== undefined) o[k] = b[k]; });
  ['responsibilities', 'requirements'].forEach((k) => {
    if (typeof o[k] === 'string') o[k] = o[k].split('\n').map((s) => s.trim()).filter(Boolean);
  });
  return o;
};

adminCareers.get('/openings', ah(async (req, res) => {
  const [list, counts] = await Promise.all([
    JobOpening.find().sort('sort -createdAt').lean(),
    JobApplication.aggregate([{ $group: { _id: '$opening', n: { $sum: 1 } } }]),
  ]);
  const by = Object.fromEntries(counts.map((c) => [String(c._id), c.n]));
  res.json(list.map((o) => ({ ...o, applications: by[String(o._id)] || 0 })));
}));

adminCareers.post('/openings', ah(async (req, res) => {
  const o = await JobOpening.create(pick(req.body));
  audit(req, 'career.opening.create', 'JobOpening', o._id, { title: o.title });
  res.status(201).json(o);
}));

adminCareers.patch('/openings/:id', ah(async (req, res) => {
  const o = await JobOpening.findByIdAndUpdate(req.params.id, pick(req.body), { new: true, runValidators: true });
  if (!o) throw new HttpError(404, 'Opening not found.');
  audit(req, 'career.opening.update', 'JobOpening', o._id, { title: o.title, active: o.active });
  res.json(o);
}));

adminCareers.delete('/openings/:id', ah(async (req, res) => {
  await JobOpening.findByIdAndDelete(req.params.id);
  audit(req, 'career.opening.delete', 'JobOpening', req.params.id);
  res.json({ ok: true });
}));
