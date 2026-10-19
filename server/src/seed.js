/*
 * npm run seed            → creates plans + the first Super Admin (from .env)
 * npm run seed -- --demo  → also creates demo buyer, sellers and RFQs to click through
 */
import mongoose from 'mongoose';
import { connectDB } from './config/db.js';
import User from './models/User.js';
import RFQ from './models/RFQ.js';
import { ensurePlans } from './utils/plans.js';
import { JobOpening } from './models/Career.js';
import { LiaisonEnquiry, SourcingRequest, SupplierApplication } from './models/Marketplace.js';
import { ensureCountries } from './utils/countries.js';

const demo = process.argv.includes('--demo');

async function upsertUser(data) {
  let u = await User.findOne({ email: data.email });
  if (!u) u = await User.create(data);
  return u;
}

await connectDB();
await ensurePlans();
console.log('✓ Plans ready');
await ensureCountries();
console.log('✓ Sourcing countries & products ready');

const admin = await upsertUser({
  name: 'Super Admin',
  email: process.env.SEED_ADMIN_EMAIL || 'admin@ranavista.com',
  password: process.env.SEED_ADMIN_PASSWORD || 'Admin@12345',
  role: 'admin',
  adminRole: 'super',
  emailVerified: true,
});
console.log(`✓ Super admin: ${admin.email}`);

if (demo) {
  const pw = 'Demo@12345';
  const buyer = await upsertUser({
    name: 'Emily Carter', email: 'buyer@demo.com', password: pw, role: 'buyer', emailVerified: true,
    company: 'Hearth & Home Co.', phone: '+1 512 555 0142',
    address: { line1: '1200 Congress Ave', city: 'Austin', state: 'TX', zip: '78701', country: 'United States' },
  });
  const sellers = [
    { name: 'Rohit Mehta', email: 'seller1@demo.com', company: 'Jaipur Textile House', country: 'India', categories: ['Home Textiles', 'Rugs & Carpets'], rating: 4.8, ratingCount: 31, plan: 'seller_premium' },
    { name: 'Anh Nguyen', email: 'seller2@demo.com', company: 'Saigon Rattan Works', country: 'Vietnam', categories: ['Furniture', 'Home Decor'], rating: 4.6, ratingCount: 18, plan: 'seller_enhanced' },
    { name: 'Priya Sharma', email: 'seller3@demo.com', company: 'Moradabad Brass Studio', country: 'India', categories: ['Home Decor', 'Kitchen & Dining', 'Lighting'], rating: 4.4, ratingCount: 9, plan: 'free' },
  ];
  for (const s of sellers) {
    await upsertUser({
      name: s.name, email: s.email, password: pw, role: 'seller', emailVerified: true, company: s.company,
      seller: { approval: 'approved', categories: s.categories, country: s.country, rating: s.rating, ratingCount: s.ratingCount, description: `${s.company} — export-ready manufacturer.`, payoutsEnabled: false },
      subscription: s.plan === 'free' ? {} : { plan: s.plan, status: 'active', currentPeriodEnd: new Date(Date.now() + 30 * 864e5) },
    });
  }
  const kemal = await upsertUser({
    name: 'Kemal Aydin', email: 'seller4@demo.com', password: pw, role: 'seller', emailVerified: true, company: 'Denizli Towel Mills',
    seller: { approval: 'pending', categories: ['Home Textiles', 'Bath & Spa'], country: 'Turkey', verificationStage: 'submitted' },
  });
  // Demo supplier registration waiting for verification (shows up highlighted on the admin dashboard)
  if (!(await SupplierApplication.exists({ user: kemal._id }))) {
    await SupplierApplication.create({
      user: kemal._id, companyName: 'Denizli Towel Mills', contactName: 'Kemal Aydin', address: 'Organize Sanayi Bölgesi 3. Cad. No 12',
      contactNumber: '+90 258 555 0142', email: 'seller4@demo.com', country: 'Turkey', state: 'Denizli', city: 'Merkezefendi', postalCode: '20330',
      gst: 'TR4810293845', factoryAddress: 'Organize Sanayi Bölgesi 3. Cad. No 12, Denizli', companyType: 'Private Limited', establishedYear: 2004,
      turnover: { amount: 6500000, currency: 'USD' }, employees: 240, factoryUnits: 2, certifications: ['OEKO-TEX Standard 100', 'ISO 9001', 'GOTS'],
      productionCapacity: 18, containerSize: '40ft', productCategoriesCount: 6, skuCount: 320, exportingSince: 2008,
      exportMarkets: ['Germany', 'United States', 'United Kingdom', 'United Arab Emirates'], compliance: { status: 'certified', audits: ['BSCI / amfori', 'Sedex / SMETA'] },
      categories: ['Home Textiles', 'Bath & Spa'], description: 'Vertically integrated Turkish towel and bathrobe mill.',
      stage: 'submitted', submittedAt: new Date(Date.now() - 2 * 864e5), stageChangedAt: new Date(Date.now() - 2 * 864e5),
      log: [{ action: 'application.submitted', byName: 'Kemal Aydin (supplier)', at: new Date(Date.now() - 2 * 864e5) }],
    });
  }
  if (!(await SourcingRequest.exists({}))) {
    const sr = new SourcingRequest({
      buyer: buyer._id, contact: { name: buyer.name, email: buyer.email, phone: buyer.phone, company: buyer.company, country: 'United States' },
      title: 'Hand-hammered copper serving bowls', category: 'Kitchen & Dining',
      specifications: 'Set of 3 nesting bowls (8, 10, 12 in). Food-safe tin lining inside, hammered copper outside. Gift box per set with our logo.',
      specs: { material: 'Copper, tin lined', size: '8 / 10 / 12 in', finish: 'Hammered, lacquered outside', packaging: 'Printed gift box per set' },
      images: [{ name: 'reference.png', url: `${process.env.CLIENT_URL || 'http://localhost:5173'}/brand/ranavista-og.png` }], quantity: 1200, unit: 'sets', targetPrice: 18, priceBasis: 'unit', currency: 'USD', targetPriceUsd: 18,
      requiredBy: new Date(Date.now() + 45 * 864e5), destination: { country: 'United States', city: 'Austin' }, incoterm: 'FOB',
      log: [{ action: 'created', byName: buyer.name, note: 'Demo data' }],
    });
    await sr.save();
    await new LiaisonEnquiry({
      name: 'Sophie Laurent', company: 'Maison Claire', email: 'sophie@example.com', country: 'France', services: ['Inspection Services', 'Product Photography', 'White Labelling'],
      budget: '€5,000 – €10,000', timeline: 'Next 2 months', message: 'We are launching a private-label linen range made in India and need pre-shipment inspections plus catalogue photography.',
      log: [{ action: 'created', byName: 'Sophie Laurent' }],
    }).save();
  }

  if (!(await RFQ.exists({ buyer: buyer._id }))) {
    const soon = (d) => new Date(Date.now() + d * 864e5);
    for (const doc of [
      {
        buyer: buyer._id, title: 'Hand-block printed cotton table linens', category: 'Home Textiles', deadline: soon(21), containerType: '20ft', incoterm: 'FOB',
        description: 'Spring collection, 4 colorways. OEKO-TEX preferred. Private label packaging.',
        destination: { city: 'Austin', state: 'TX', zip: '78701', country: 'United States' }, budget: 42000,
        items: [
          { name: 'Table runner 14×72 in', quantity: 3000, unit: 'pcs', targetUnitPrice: 4.2, cbmPerUnit: 0.0015, weightKgPerUnit: 0.25 },
          { name: 'Napkin set of 4', quantity: 5000, unit: 'sets', targetUnitPrice: 3.1, cbmPerUnit: 0.0012, weightKgPerUnit: 0.2 },
        ],
        history: [{ action: 'created', by: buyer._id }],
      },
      {
        buyer: buyer._id, title: 'Rattan accent chairs', category: 'Furniture', deadline: soon(30), containerType: '40ft_hc', incoterm: 'FOB',
        description: 'Natural finish, KD (knock-down) preferred for container efficiency.',
        destination: { city: 'Austin', state: 'TX', zip: '78701', country: 'United States' }, budget: 60000,
        items: [{ name: 'Rattan accent chair', quantity: 400, unit: 'pcs', targetUnitPrice: 85, cbmPerUnit: 0.14, weightKgPerUnit: 9 }],
        history: [{ action: 'created', by: buyer._id }],
      },
    ]) await RFQ.create(doc);
  }
  if (!(await JobOpening.exists({}))) {
    await JobOpening.insertMany([
      {
        title: 'Sourcing Executive — Home Décor', department: 'Sourcing', location: 'Jaipur, India', type: 'Full-time', workMode: 'On-site', experience: '2–4 years', sort: 1,
        summary: 'Match buyer RFQs with the right manufacturers and follow every order from sample to shipment.',
        responsibilities: ['Review incoming RFQs and shortlist suitable manufacturers', 'Coordinate samples, pricing and timelines with factories', 'Support quality checks and pre-shipment inspections'],
        requirements: ['Experience in export houses, buying offices or sourcing agencies', 'Good knowledge of home décor / textiles / furniture production', 'Clear written and spoken English'],
      },
      {
        title: 'Business Development Manager — International Buyers', department: 'Sales', location: 'Remote', type: 'Full-time', workMode: 'Remote', experience: '4+ years', sort: 2,
        summary: 'Bring retailers, brands and importers from around the world onto Ranavista.',
        responsibilities: ['Build a pipeline of retail and wholesale buyers', 'Run discovery calls and product demos', 'Work with the sourcing team on first orders'],
        requirements: ['B2B sales experience in home, lifestyle or consumer goods', 'Comfortable working across time zones', 'CRM discipline and strong communication'],
      },
      {
        title: 'Full-Stack Developer (MERN)', department: 'Technology', location: 'Jaipur, India', type: 'Full-time', workMode: 'Hybrid', experience: '2+ years', sort: 3,
        summary: 'Help build the marketplace — buyer and seller dashboards, the admin panel and integrations.',
        responsibilities: ['Ship features across React, Node.js, Express and MongoDB', 'Integrate payments, email and third-party APIs', 'Write clean, tested, maintainable code'],
        requirements: ['Solid JavaScript, React and Node.js', 'Experience with MongoDB and REST APIs', 'Portfolio or GitHub we can look at'],
      },
    ]);
  }
  console.log('✓ Demo data: buyer@demo.com / seller1..4@demo.com  (password Demo@12345)');
}

await mongoose.disconnect();
console.log('Done.');
