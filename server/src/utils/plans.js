import { Plan } from '../models/misc.js';

/*
 * Default subscription plans — taken from the client's "Buyer Plan" and "Sellers Plan" documents.
 * Everything here is editable later in Admin → Subscriptions (prices, features, limits, Stripe Price IDs).
 *
 *  - Buyers  : USD. Free (fallback) + Starter (3-month) + Professional + Business (monthly) + Enterprise (custom quote)
 *  - Sellers : INR registration plans Basic / Enhanced / Premium (yearly — change to one-time in admin if needed) + Enterprise (custom)
 *
 * PLAN_VERSION: bump it when these defaults change so existing databases pick the new content up once.
 * Plans an admin has edited after the upgrade keep the admin's values.
 */
export const PLAN_VERSION = 2;

const RETIRED_KEYS = ['buyer_growth', 'seller_pro']; // plans from the first build, hidden after the upgrade

export const DEFAULT_PLANS = [
  /* ------------------------------ BUYERS ------------------------------ */
  {
    key: 'buyer_basic', audience: 'buyer', name: 'Free', tagline: 'Explore Ranavista at no cost', audienceNote: 'New buyers',
    price: 0, currency: 'USD', billingPeriod: 'month', sort: 0,
    features: ['Buyer account', '3 RFQs per month', 'Vetted seller matching', 'Escrow-protected payments', 'Email support'],
    limits: { rfqsPerMonth: 3, categories: 0, priority: 0, savedProducts: 10, projects: 1, virtualContainers: 1, teamMembers: 1 },
  },
  {
    key: 'buyer_starter', audience: 'buyer', name: 'Starter', tagline: 'For small retailers and independent importers', audienceNote: 'Small retailers',
    price: 29, currency: 'USD', billingPeriod: 'quarter', sort: 1,
    features: [
      'Everything in Free', 'Up to 25 RFQs per month', 'Save up to 100 products', 'Up to 5 sourcing projects per month',
      'Virtual Container — up to 5 plans', 'Compare up to 10 supplier quotations', 'Swatch & product samples on request',
      'Inspection & audit services', 'Enhanced product & MOQ filters', 'Basic quotation comparison reports',
      'Track RFQs, quotations & order documents', 'Email support',
    ],
    limits: { rfqsPerMonth: 25, categories: 0, priority: 0, savedProducts: 100, projects: 5, virtualContainers: 5, teamMembers: 1 },
  },
  {
    key: 'buyer_professional', audience: 'buyer', name: 'Professional', tagline: 'For regular importers, wholesalers and growing e-commerce businesses', audienceNote: 'Regular importers',
    price: 49, currency: 'USD', billingPeriod: 'month', sort: 2, highlighted: true,
    features: [
      'Everything in Starter', 'Up to 100 RFQs per month', 'Save up to 500 products', 'Up to 50 sourcing projects',
      'Virtual Container — up to 50 plans', 'Compare up to 50 supplier quotations', 'AI-assisted product requirement extraction',
      'AI supplier matching & recommendations', 'Advanced quotation comparison', 'Landed-cost estimation tools',
      'Container capacity & CBM calculator', 'Product & supplier risk assessment', 'Procurement document management',
      'Repeat-order tracking', 'Priority support',
    ],
    limits: { rfqsPerMonth: 100, categories: 0, priority: 1, savedProducts: 500, projects: 50, virtualContainers: 50, teamMembers: 1 },
  },
  {
    key: 'buyer_business', audience: 'buyer', name: 'Business', tagline: 'For established importers, distributors and multi-location retailers', audienceNote: 'Established importers',
    price: 99, currency: 'USD', billingPeriod: 'month', sort: 3,
    features: [
      'Everything in Professional', 'Up to 300 RFQs per month', 'Unlimited saved products', 'Up to 200 active sourcing projects',
      'Virtual Container — up to 200 plans', 'Multi-supplier quote analysis', 'Advanced AI procurement assistance',
      'Advanced landed-cost & margin analysis', 'Container planning for LCL, 20 FT, 40 FT & 40 FT HQ',
      'Container utilisation & remaining-capacity analysis', 'Consolidated order & shipment dashboard', 'Supplier performance history',
      'Procurement analytics & reorder recommendations', 'Priority help with sourcing & inspections', 'Up to 5 team members',
    ],
    limits: { rfqsPerMonth: 300, categories: 0, priority: 2, savedProducts: -1, projects: 200, virtualContainers: 200, teamMembers: 5 },
  },
  {
    key: 'buyer_enterprise', audience: 'buyer', name: 'Enterprise', tagline: 'For large businesses and procurement teams', audienceNote: 'Procurement teams',
    price: 0, currency: 'USD', billingPeriod: 'custom', customPricing: true, priceLabel: 'Custom', priceNote: 'Quotation based on your procurement requirements', sort: 4,
    features: [
      'Everything in Business, within agreed scope', 'Custom RFQ, sourcing & Virtual Container limits', 'Multiple departments, teams & permissions',
      'Approval workflows & purchasing controls', 'Custom supplier sourcing programmes', 'Advanced AI procurement copilot',
      'Custom reporting & procurement analytics', 'ERP / business-system integration, where supported', 'Dedicated account & sourcing support',
      'Custom compliance & documentation workflows', 'Negotiated inspections, logistics & private-label packages', 'Agreed service-level commitments',
    ],
    limits: { rfqsPerMonth: -1, categories: 0, priority: 3, savedProducts: -1, projects: -1, virtualContainers: -1, teamMembers: -1 },
  },

  /* ------------------------------ SELLERS ------------------------------ */
  {
    // Internal fallback for sellers who haven't bought a plan yet — not shown on the pricing page.
    key: 'seller_starter', audience: 'seller', name: 'Unregistered', tagline: 'Profile under review', active: false,
    price: 0, currency: 'INR', billingPeriod: 'year', sort: 0,
    features: ['Company profile', 'Admin verification'],
    limits: { rfqsPerMonth: 0, categories: 2, priority: 0, productListings: 0, imagesPerProduct: 0 },
  },
  {
    key: 'seller_basic', audience: 'seller', name: 'Basic', tagline: 'For small suppliers and beginners', audienceNote: 'Small suppliers',
    price: 299, currency: 'INR', billingPeriod: 'year', priceNote: 'Registration', sort: 1,
    features: [
      'Basic company profile', '25 product listings', 'Up to 5 images per product', 'Up to 10 product categories',
      'Basic digital catalogue', 'Basic document uploads', 'Basic supplier verification', 'Standard search visibility',
      'Standard sourcing-requirement eligibility', 'Basic enquiry dashboard & quotation management', 'Basic activity information',
    ],
    limits: { rfqsPerMonth: 0, categories: 10, priority: 0, productListings: 25, imagesPerProduct: 5 },
  },
  {
    key: 'seller_enhanced', audience: 'seller', name: 'Enhanced', tagline: 'For growing manufacturers and traders', audienceNote: 'Growing manufacturers',
    price: 1499, currency: 'INR', billingPeriod: 'year', priceNote: 'Registration', sort: 2, highlighted: true,
    features: [
      'Enhanced company profile', '75 product listings', 'Up to 8 images per product', 'Up to 20 product categories',
      'Enhanced catalogue', 'Multiple company documents', 'Enhanced supplier verification', 'Enhanced profile presentation',
      'Featured supplier & products (paid add-on)', 'Enhanced enquiry dashboard', 'Full quotation management',
      'Basic performance insights', 'Standard support',
    ],
    limits: { rfqsPerMonth: 0, categories: 20, priority: 1, productListings: 75, imagesPerProduct: 8 },
  },
  {
    key: 'seller_premium', audience: 'seller', name: 'Premium', tagline: 'For established manufacturers and exporters', audienceNote: 'Established exporters',
    price: 2999, currency: 'INR', billingPeriod: 'year', priceNote: 'Registration', sort: 3,
    features: [
      'Premium company profile', '150 product listings', 'Up to 10 images per product', 'Up to 50 product categories',
      'Premium catalogue', 'Priority verification processing', 'Higher visibility opportunities', 'Limited promotional & featured-product slots',
      'Enhanced sourcing-requirement matching', 'Advanced enquiry dashboard & notification settings', 'Advanced analytics',
      'Selected promotional benefits', 'Priority support',
    ],
    limits: { rfqsPerMonth: 0, categories: 50, priority: 2, productListings: 150, imagesPerProduct: 10 },
  },
  {
    key: 'seller_enterprise', audience: 'seller', name: 'Enterprise', tagline: 'For large manufacturers and strategic suppliers', audienceNote: 'Strategic suppliers',
    price: 0, currency: 'INR', billingPeriod: 'custom', customPricing: true, priceLabel: 'Custom', priceNote: 'Tailored to your business', sort: 4,
    features: [
      'Enterprise company profile', '300 product listings', 'Custom images, categories & catalogue', 'Tailored verification support',
      'Custom visibility & promotional package', 'Custom sourcing support', 'Custom dashboard, workflows & reports',
      'Dedicated account support', 'API / system integration (optional, subject to scope)',
    ],
    limits: { rfqsPerMonth: 0, categories: -1, priority: 3, productListings: 300, imagesPerProduct: -1 },
  },
];

/** Monthly-equivalent price in the plan's own currency (used for MRR). One-time and custom plans count as 0. */
export function monthlyEquivalent(p) {
  if (p.customPricing || !p.price) return 0;
  return { month: p.price, quarter: p.price / 3, year: p.price / 12 }[p.billingPeriod || 'month'] || 0;
}

export async function ensurePlans() {
  for (const def of DEFAULT_PLANS) {
    const p = { active: true, highlighted: false, customPricing: false, priceLabel: '', priceNote: '', compareAtPrice: 0, ...def, version: PLAN_VERSION };
    p.priceMonthly = monthlyEquivalent(p);
    const existing = await Plan.findOne({ key: p.key }).select('version stripePriceId').lean();
    if (!existing) await Plan.create(p);
    else if ((existing.version || 1) < PLAN_VERSION) {
      // Upgrade old default content once; keep any Stripe Price ID already configured
      await Plan.updateOne({ key: p.key }, { $set: { ...p, stripePriceId: existing.stripePriceId } });
    }
  }
  await Plan.updateMany({ key: { $in: RETIRED_KEYS }, version: { $ne: PLAN_VERSION } }, { $set: { active: false, version: PLAN_VERSION } });
}

/** Active plan for a user (falls back to the free tier for their role). */
export async function planFor(user) {
  const freeKey = user.role === 'seller' ? 'seller_starter' : 'buyer_basic';
  const key = user.subscription?.status === 'active' ? user.subscription.plan : freeKey;
  return (await Plan.findOne({ key })) || (await Plan.findOne({ key: freeKey }));
}
