import mongoose from 'mongoose';
import { nextSeq } from './misc.js';

const { ObjectId } = mongoose.Schema.Types;
const fileRef = new mongoose.Schema({ name: String, url: String }, { _id: false });
const logEntry = new mongoose.Schema(
  { by: { type: ObjectId, ref: 'User' }, byName: String, action: String, note: String, at: { type: Date, default: Date.now } },
  { _id: false }
);
const noteEntry = new mongoose.Schema({ by: { type: ObjectId, ref: 'User' }, text: String, at: { type: Date, default: Date.now } }, { _id: false });

/** Adds a human-readable number like SRC-2026-00001 on first save. */
function numbered(schema, prefix, counter) {
  schema.pre('save', async function setNumber(next) {
    if (this.number) return next();
    const year = new Date().getFullYear();
    const seq = await nextSeq(`${counter}-${year}`);
    this.number = `${prefix}-${year}-${String(seq).padStart(5, '0')}`;
    next();
  });
}

/* =====================================================================
 * Sourcing request — buyer can't find a product → uploads image, specs,
 * target price, quantity and date. Handled as a "sourcing project" in Manage.
 * ===================================================================== */
export const SOURCING_STATUSES = ['new', 'in_review', 'sourcing', 'quoted', 'accepted', 'converted', 'closed', 'cancelled'];

const sourcingSchema = new mongoose.Schema(
  {
    number: { type: String, unique: true },
    buyer: { type: ObjectId, ref: 'User', index: true }, // set when submitted by a signed-in buyer
    contact: { name: String, email: { type: String, lowercase: true, trim: true }, phone: String, company: String, country: String },
    title: { type: String, required: true, trim: true },
    category: String,
    specifications: { type: String, required: true },
    specs: { material: String, size: String, color: String, finish: String, packaging: String, customization: String },
    images: { type: [fileRef], validate: (v) => v.length > 0 },
    quantity: { type: Number, required: true, min: 1 },
    unit: { type: String, default: 'pcs' },
    targetPrice: { type: Number, required: true, min: 0 },
    priceBasis: { type: String, enum: ['unit', 'total'], default: 'unit' },
    currency: { type: String, default: 'USD' },
    targetPriceUsd: Number, // normalised for reports
    requiredBy: { type: Date, required: true },
    destination: { country: String, city: String },
    incoterm: String,
    preferredOrigin: String, // optional preferred sourcing country
    status: { type: String, enum: SOURCING_STATUSES, default: 'new', index: true },
    priority: { type: String, enum: ['low', 'normal', 'high'], default: 'normal' },
    assignedTo: { type: ObjectId, ref: 'User' },
    notes: [noteEntry], // internal only
    supplierQuotes: [
      {
        supplier: String,
        seller: { type: ObjectId, ref: 'User' },
        country: String,
        unitPrice: Number,
        currency: { type: String, default: 'USD' },
        moq: String,
        leadTimeDays: Number,
        notes: String,
        file: fileRef,
        by: { type: ObjectId, ref: 'User' },
        at: { type: Date, default: Date.now },
      },
    ],
    quote: { unitPrice: Number, currency: String, total: Number, leadTime: String, validUntil: Date, message: String, sentAt: Date, by: { type: ObjectId, ref: 'User' } },
    buyerResponse: { decision: { type: String, enum: ['accepted', 'declined'] }, note: String, at: Date },
    rfq: { type: ObjectId, ref: 'RFQ' },
    log: [logEntry],
    ip: String,
  },
  { timestamps: true }
);
numbered(sourcingSchema, 'SRC', 'sourcing');
export const SourcingRequest = mongoose.model('SourcingRequest', sourcingSchema);

/* =====================================================================
 * Liaison services enquiry (international clients)
 * ===================================================================== */
export const LIAISON_SERVICES = [
  'Sourcing', 'Procurement', 'Inspection Services', 'Shipping Services', 'Graphic Designing',
  'Product Photography', 'Digital Marketing', 'Product Designing', 'Content Creation', 'White Labelling',
];
export const LIAISON_STATUSES = ['new', 'contacted', 'proposal_sent', 'won', 'lost', 'closed'];

const liaisonSchema = new mongoose.Schema(
  {
    number: { type: String, unique: true },
    name: { type: String, required: true, trim: true },
    company: String,
    email: { type: String, required: true, lowercase: true, trim: true },
    phone: String,
    country: String,
    services: { type: [String], validate: (v) => v.length > 0 },
    budget: String,
    timeline: String,
    message: { type: String, required: true },
    status: { type: String, enum: LIAISON_STATUSES, default: 'new', index: true },
    assignedTo: { type: ObjectId, ref: 'User' },
    notes: [noteEntry],
    log: [logEntry],
    ip: String,
  },
  { timestamps: true }
);
numbered(liaisonSchema, 'LIA', 'liaison');
export const LiaisonEnquiry = mongoose.model('LiaisonEnquiry', liaisonSchema);

/* =====================================================================
 * Sourcing countries & their products (website → Products → By country)
 * ===================================================================== */
const countryProductSchema = new mongoose.Schema({
  name: { type: String, required: true },
  category: String,
  description: String,
  moq: String,
  priceRange: String,
  image: String,
  featured: { type: Boolean, default: false },
});

const countrySchema = new mongoose.Schema(
  {
    slug: { type: String, required: true, unique: true, lowercase: true, trim: true },
    name: { type: String, required: true },
    code: String, // ISO-2 (EU for Europe)
    flag: String,
    region: String,
    currency: String,
    intro: String,
    strengths: [String],
    hubs: [String],
    leadTime: String,
    ports: [String],
    sellerCountries: [String], // seller.country values that count as this market (Europe → many)
    products: [countryProductSchema],
    active: { type: Boolean, default: true },
    sort: { type: Number, default: 0 },
    version: { type: Number, default: 1 },
  },
  { timestamps: true }
);
export const SourcingCountry = mongoose.model('SourcingCountry', countrySchema);

/* =====================================================================
 * Supplier (seller) registration & verification workflow
 * ===================================================================== */
export const SUPPLIER_STAGES = [
  'submitted', // seller filled the registration form
  'under_review', // admin opened it / chose verification options
  'info_requested', // admin asked the seller to correct something
  'verification_scheduled', // physical visit and/or virtual call scheduled
  'verified', // verification approved (NDA goes out right after)
  'nda_sent',
  'nda_signed',
  'payment_pending', // plan details + payment link sent
  'active', // paid → supplier code generated, seller can receive leads
  'rejected',
];
export const COMPANY_TYPES = ['Proprietorship', 'Partnership', 'LLP', 'Private Limited', 'Public Limited', 'One Person Company', 'Co-operative', 'Other'];

const verificationStep = {
  needed: { type: Boolean, default: null }, // null = not decided yet
  status: { type: String, enum: ['not_required', 'pending', 'scheduled', 'completed', 'failed'], default: 'pending' },
  scheduledAt: Date,
  assignee: String, // team member visiting / hosting
  location: String, // physical visit address
  platform: String, // Zoom | Microsoft Teams | Google Meet
  link: String, // meeting link
  notes: String,
  result: { type: String, enum: ['pass', 'fail'] },
  report: fileRef,
  completedAt: Date,
};

const supplierAppSchema = new mongoose.Schema(
  {
    number: { type: String, unique: true },
    user: { type: ObjectId, ref: 'User', required: true, unique: true },

    // ---- Registration details (all required on the form) ----
    companyName: { type: String, required: true, trim: true },
    contactName: { type: String, required: true, trim: true },
    address: { type: String, required: true },
    contactNumber: { type: String, required: true },
    email: { type: String, required: true, lowercase: true, trim: true },
    country: { type: String, required: true },
    state: { type: String, required: true },
    city: { type: String, required: true },
    postalCode: String,
    gst: { type: String, required: true, trim: true }, // GSTIN (India) or tax / VAT registration no.
    factoryAddress: { type: String, required: true },
    companyType: { type: String, required: true },
    establishedYear: { type: Number, required: true },
    turnover: { amount: { type: Number, required: true }, currency: { type: String, default: 'INR' } },
    employees: { type: Number, required: true },
    factoryUnits: { type: Number, required: true },
    certifications: { type: [String], validate: (v) => v.length > 0 },
    productionCapacity: { type: Number, required: true }, // containers per month
    containerSize: { type: String, default: '40ft' },
    productCategoriesCount: { type: Number, required: true },
    skuCount: { type: Number, required: true },
    exportingSince: { type: Number, required: true },
    exportMarkets: { type: [String], validate: (v) => v.length > 0 },
    compliance: {
      status: { type: String, enum: ['certified', 'checked', 'in_progress', 'no'], required: true },
      audits: [String], // BSCI, SMETA, ISO 9001 …
      details: String,
    },
    categories: [String], // marketplace categories the seller makes
    website: String,
    description: String,
    documents: [{ _id: false, name: String, url: String, kind: String, at: { type: Date, default: Date.now } }],

    // ---- Workflow ----
    stage: { type: String, enum: SUPPLIER_STAGES, default: 'submitted', index: true },
    submittedAt: { type: Date, default: Date.now },
    stageChangedAt: { type: Date, default: Date.now },
    physical: verificationStep,
    virtual: verificationStep,
    decision: { result: { type: String, enum: ['approved', 'rejected'] }, reason: String, by: { type: ObjectId, ref: 'User' }, at: Date },
    infoRequest: { message: String, at: Date },
    recommendedPlan: String,
    nda: {
      version: String,
      sentAt: Date,
      signedAt: Date,
      method: { type: String, enum: ['e-sign', 'upload', 'offline'] },
      signerName: String,
      signerTitle: String,
      signerIp: String,
      signedCopy: fileRef,
      file: String, // generated NDA PDF (private)
    },
    payment: {
      planKey: String,
      planName: String,
      amount: Number,
      currency: String,
      billingPeriod: String,
      sentAt: Date,
      checkoutId: String,
      paidAt: Date,
      method: { type: String, enum: ['stripe', 'bank_transfer', 'upi', 'cheque', 'cash', 'demo', 'waived', 'other'] },
      ref: String,
      invoiceNumber: String,
      invoiceFile: String, // private path
    },
    supplierCode: { type: String, unique: true, sparse: true },
    assignedTo: { type: ObjectId, ref: 'User' },
    notes: [noteEntry],
    log: [logEntry],
  },
  { timestamps: true }
);
supplierAppSchema.pre('save', function stageTime(next) {
  if (this.isModified('stage')) this.stageChangedAt = new Date();
  next();
});
numbered(supplierAppSchema, 'SUP', 'supplierapp');
export const SupplierApplication = mongoose.model('SupplierApplication', supplierAppSchema);

/* =====================================================================
 * Site settings (Super Admin → Settings)
 * ===================================================================== */
const settingSchema = new mongoose.Schema(
  {
    _id: { type: String, default: 'site' },
    teamEmail: String, // Ranavista's registered inbox — receives all "new request" emails
    sellerRequestsEmail: String,
    sourcingEmail: String,
    liaisonEmail: String,
    companyLegalName: String,
    companyAddress: String,
    companyGstin: String,
    companyEmail: String,
    companyPhone: String,
    ndaTitle: String,
    ndaBody: String,
    ndaVersion: String,
    verificationPlans: [String], // seller plan keys offered after NDA (empty = all active paid seller plans)
  },
  { timestamps: true }
);
export const Setting = mongoose.model('Setting', settingSchema);
