import { Setting } from '../models/Marketplace.js';
import env from '../config/env.js';

/*
 * Site settings = values saved in Admin → Settings, falling back to .env.
 * Cached for 60 s so every request doesn't hit the database.
 */

export const DEFAULT_NDA_TITLE = 'Supplier Non-Disclosure & Non-Circumvention Agreement';
export const DEFAULT_NDA_VERSION = '2026.1';

// TEMPLATE TEXT — have your lawyer review before relying on it.
// Placeholders: {{supplierName}} {{supplierAddress}} {{supplierGst}} {{companyLegalName}} {{companyAddress}} {{date}}
export const DEFAULT_NDA_BODY = `This Agreement is made on {{date}} between {{companyLegalName}}{{companyAddress}} ("Ranavista") and {{supplierName}}, {{supplierAddress}} (GST / Tax ID: {{supplierGst}}) (the "Supplier").

1. Purpose. Ranavista operates a B2B sourcing marketplace and will share with the Supplier buyer requirements, quotation requests, designs, specifications, prices, buyer identities and other business information ("Confidential Information") so that the Supplier can quote for and fulfil orders placed through Ranavista.

2. Confidentiality. The Supplier shall keep all Confidential Information strictly confidential, use it only to quote for and fulfil orders placed through Ranavista, and disclose it only to employees and contractors who need to know it and are bound by obligations at least as strict as these.

3. Designs and samples. Designs, artwork, samples, tech packs and specifications provided by buyers or by Ranavista remain the property of their owners. The Supplier shall not reproduce, sell or offer them to any third party.

4. Non-circumvention. For 24 months after the Supplier is introduced to a buyer through Ranavista, the Supplier shall not, directly or indirectly, solicit, quote, sell to or accept orders from that buyer outside the Ranavista platform without Ranavista's prior written consent.

5. Exceptions. Obligations do not apply to information that is or becomes public through no fault of the Supplier, was lawfully known to the Supplier before disclosure, or must be disclosed by law (with prompt notice to Ranavista where permitted).

6. Return of information. On request, or when the Supplier leaves the platform, the Supplier shall return or destroy Confidential Information in its possession.

7. Remedies. A breach may cause irreparable harm; Ranavista may seek injunctive relief in addition to any other remedy, and may suspend or remove the Supplier from the platform.

8. Term. This Agreement starts on signature and confidentiality obligations survive for 3 years after the Supplier's last activity on Ranavista.

9. Governing law. This Agreement is governed by the laws of India, and the courts at Jaipur, Rajasthan shall have exclusive jurisdiction.

10. Electronic signature. The parties agree that signing this Agreement electronically (typing the full name and accepting on the Ranavista website) is as binding as a handwritten signature.`;

const FIELDS = ['teamEmail', 'sellerRequestsEmail', 'sourcingEmail', 'liaisonEmail', 'companyLegalName', 'companyAddress', 'companyGstin', 'companyEmail', 'companyPhone', 'ndaTitle', 'ndaBody', 'ndaVersion', 'verificationPlans'];
let cached = null;
let cachedAt = 0;

export async function getSettings(fresh = false) {
  if (!fresh && cached && Date.now() - cachedAt < 60e3) return cached;
  const doc = (await Setting.findById('site').lean()) || {};
  const s = {
    teamEmail: doc.teamEmail || env.teamEmail || env.smtp.user || '',
    sellerRequestsEmail: doc.sellerRequestsEmail || env.sellerRequestsEmail || '',
    sourcingEmail: doc.sourcingEmail || env.sourcingEmail || '',
    liaisonEmail: doc.liaisonEmail || env.liaisonEmail || '',
    companyLegalName: doc.companyLegalName || env.company.legalName,
    companyAddress: doc.companyAddress || env.company.address,
    companyGstin: doc.companyGstin || env.company.gstin,
    companyEmail: doc.companyEmail || env.company.email,
    companyPhone: doc.companyPhone || env.company.phone,
    ndaTitle: doc.ndaTitle || DEFAULT_NDA_TITLE,
    ndaBody: doc.ndaBody || DEFAULT_NDA_BODY,
    ndaVersion: doc.ndaVersion || DEFAULT_NDA_VERSION,
    verificationPlans: doc.verificationPlans || [],
    updatedAt: doc.updatedAt,
  };
  cached = s;
  cachedAt = Date.now();
  return s;
}

export async function saveSettings(patch) {
  const set = {};
  FIELDS.forEach((k) => { if (patch[k] !== undefined) set[k] = patch[k]; });
  await Setting.updateOne({ _id: 'site' }, { $set: set }, { upsert: true });
  return getSettings(true);
}

/** Inbox for a kind of request: 'seller' | 'sourcing' | 'liaison' (falls back to the team inbox). */
export async function inboxFor(kind) {
  const s = await getSettings();
  const specific = { seller: s.sellerRequestsEmail, sourcing: s.sourcingEmail, liaison: s.liaisonEmail }[kind];
  return specific || s.teamEmail || '';
}
