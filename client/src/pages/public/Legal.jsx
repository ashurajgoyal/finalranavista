import { Link, Navigate, NavLink, useParams } from 'react-router-dom';
import { FileText } from 'lucide-react';
import { Alert, cx } from '../../components/ui';
import { PageHero } from './Pages';

/*
 * Website policies — TEMPLATE TEXT.
 * Written to match how Ranavista actually works (single-seller routing, escrow-style payments via Stripe,
 * USD buyer plans, INR seller plans). Have a lawyer review and complete the [bracketed] details before launch.
 */
const UPDATED = 'October 2026';
const ENTITY = '[Registered company name], [registered address]';

export const POLICIES = [
  {
    slug: 'privacy', title: 'Privacy Policy', short: 'Privacy',
    intro: 'This policy explains what personal information Ranavista collects, why we collect it and the choices you have. It applies to our website, buyer and seller dashboards and related services.',
    sections: [
      ['Who we are', [`Ranavista is operated by ${ENTITY} (“Ranavista”, “we”, “us”). For privacy questions write to privacy@ranavista.com.`]],
      ['Information we collect', [
        '• Account details — name, company, job title, email, phone, address and password (stored encrypted).',
        '• Business information — RFQs, product specifications, quotations, messages, documents and verification records you upload.',
        '• Transaction information — orders, invoices and payout details. Card and bank details are collected and stored by Stripe; we never see or store full card numbers.',
        '• Careers — CVs and application details you send through our Careers page.',
        '• Technical data — IP address, device and browser information and basic usage logs used for security and to improve the service.',
      ]],
      ['How we use it', [
        'To create and secure your account; to review and route RFQs to a suitable seller; to process subscriptions, order payments, refunds and payouts; to provide support and resolve disputes; to send service emails and notifications; to prevent fraud and meet legal obligations; and, for job applicants, to assess your application.',
      ]],
      ['Who we share it with', [
        '• The assigned seller or buyer — only what is needed to quote and fulfil an order. Buyer contact details are restricted until an order relationship exists.',
        '• Service providers — payment processing (Stripe), hosting, email delivery and analytics, under contracts that protect your data.',
        '• Authorities — when required by law or to protect rights and safety.',
        'We do not sell personal information.',
      ]],
      ['International transfers', ['Ranavista serves buyers and manufacturers in many countries, so your information may be processed outside your country. We use appropriate safeguards for such transfers.']],
      ['How long we keep it', ['Account and transaction records are kept for as long as your account is active and afterwards as required for tax, accounting and legal purposes. Job applications are kept for up to 24 months unless you ask us to delete them sooner.']],
      ['Your rights', ['Depending on where you live (for example under GDPR, UK GDPR, the California CCPA/CPRA or India’s DPDP Act), you may have the right to access, correct, delete or export your data, to object to or restrict certain processing and to withdraw consent. Email privacy@ranavista.com and we will respond within the time the law requires.']],
      ['Security', ['We use encryption in transit, hashed passwords, role-based admin access and audit logs. No system is perfectly secure — please use a strong, unique password.']],
      ['Changes', ['We will post updates here and, for material changes, notify you by email or in your dashboard.']],
    ],
  },
  {
    slug: 'terms', title: 'Terms & Conditions', short: 'Terms',
    intro: 'These terms govern your use of the Ranavista marketplace. By creating an account or using the website you agree to them.',
    sections: [
      ['The service', [`Ranavista, operated by ${ENTITY}, is a curated B2B sourcing platform. Buyers post requests for quotation (RFQs); our team reviews each RFQ and routes it to a verified manufacturer selected at our discretion. Quotations are offers from independent sellers — Ranavista is not the seller of the goods.`]],
      ['Accounts', ['You must be at least 18 and acting for a business. Keep your login details confidential and your information accurate. We may verify your identity and business, and may refuse, suspend or close accounts that break these terms.']],
      ['Buyers and sellers', ['Buyer and seller obligations are set out in our Buyer Policy and Seller Policy, which form part of these terms.']],
      ['Payments', ['Order payments are made through Ranavista and handled under our Payment Protection Policy. Subscriptions are governed by our Subscription & Payment Policy.']],
      ['No off-platform deals', ['Buyers and sellers introduced through Ranavista agree not to complete, or try to complete, transactions with each other outside the platform for 24 months after the introduction, unless Ranavista agrees in writing. Off-platform orders are not protected by escrow or dispute resolution.']],
      ['Content and conduct', ['You are responsible for what you upload. Do not post false, infringing or unlawful content, attempt to access other accounts, scrape the site or interfere with its operation.']],
      ['Liability', ['The platform is provided “as is”. To the extent the law allows, Ranavista is not liable for indirect or consequential losses, and our total liability for any claim is limited to the fees you paid us in the 12 months before the claim. Nothing limits liability that cannot be limited by law.']],
      ['Governing law', ['These terms are governed by the laws of [jurisdiction], and disputes are subject to the courts of [city], unless mandatory local law says otherwise.']],
      ['Changes', ['We may update these terms; continued use after the effective date means you accept the update.']],
    ],
  },
  {
    slug: 'payment-protection', title: 'Payment Protection (Escrow) Policy', short: 'Payment protection',
    intro: 'Escrow means the buyer’s money is held by a neutral party — not paid straight to the seller — until the goods are delivered as agreed. This page explains how Ranavista applies that idea to every order.',
    sections: [
      ['How it works', [
        '1. The buyer accepts a quotation and pays the order total to Ranavista through Stripe.',
        '2. Ranavista holds the funds. The seller is told the money is secured and starts production.',
        '3. The seller ships and adds tracking. The buyer inspects the goods on arrival.',
        '4. The buyer confirms delivery — or the confirmation window closes without a dispute — and Ranavista releases the payment to the seller, less the platform fee.',
      ]],
      ['If something goes wrong', ['While funds are held, the buyer can open a dispute (not received, not as described, damaged, short quantity or late). The funds stay frozen while our team reviews evidence from both sides and decides on a full release, a full refund or a partial refund.']],
      ['Release timing', ['Buyers should confirm or dispute within [7] days of delivery. If neither happens, funds may be released to the seller automatically.']],
      ['What is not covered', ['Orders paid outside Ranavista; freight, duties and taxes paid to third parties; changes agreed outside the platform; and normal variations disclosed in the quotation.']],
      ['Important', ['Payments are processed and held through Stripe’s marketplace payment services. Ranavista is not a bank or a licensed escrow agent, and held funds do not earn interest.']],
    ],
  },
  {
    slug: 'refund-cancellation', title: 'Refund & Cancellation Policy', short: 'Refunds & cancellation',
    intro: 'How cancellations and refunds work for orders and for subscription plans.',
    sections: [
      ['Order cancellations', [
        '• Before payment — either party may decline or withdraw a quotation at no cost.',
        '• After payment, before production — the buyer may request cancellation; if the seller agrees, the order amount is refunded less any non-recoverable processing fees.',
        '• After production has started — cancellation needs the seller’s agreement and may be subject to costs already incurred.',
      ]],
      ['Order refunds', ['Refunds for goods that are not received, not as described, damaged or short are handled through the dispute process in our Payment Protection Policy. Approved refunds go back to the original payment method, usually within 5–10 business days of approval.']],
      ['Subscription cancellations', ['You can cancel a plan at any time from Plan & billing. Your plan stays active until the end of the period already paid for, and it will not renew.']],
      ['Subscription refunds', ['Subscription and registration fees are non-refundable once the billing period has started, except where the law requires otherwise or where Ranavista could not provide the service. Platform fees on completed orders are non-refundable.']],
      ['How to ask', ['Email support@ranavista.com with your order or account details.']],
    ],
  },
  {
    slug: 'shipping-delivery', title: 'Shipping & Delivery Policy', short: 'Shipping & delivery',
    intro: 'Ranavista connects buyers with manufacturers; goods ship directly from the seller under the trade terms agreed in each quotation.',
    sections: [
      ['Trade terms (Incoterms)', ['Every RFQ and quotation states an Incoterm (for example FOB, EXW, CIF, DAP or DDP). It defines who arranges and pays for freight, insurance, export and import clearance, and where risk passes from seller to buyer.']],
      ['Lead times', ['Production and shipping lead times are given by the seller in the quotation. They are estimates — sellers must keep buyers updated in the order chat about any delay.']],
      ['Shipping and tracking', ['Sellers mark orders as shipped and provide the carrier, tracking or bill-of-lading number in the dashboard.']],
      ['Duties and taxes', ['Unless the Incoterm is DDP, import duties, taxes and customs fees are the buyer’s responsibility.']],
      ['Damage, loss and shortages', ['Inspect goods on arrival and report problems within the release window by opening a dispute with photos and documents. Note visible damage on the carrier’s delivery receipt where possible.']],
      ['Samples', ['Samples and swatches are shipped at the cost agreed between buyer and seller unless a plan or quotation says otherwise.']],
    ],
  },
  {
    slug: 'buyer-policy', title: 'Buyer Policy', short: 'Buyer policy',
    intro: 'Rules for retailers, brands, importers and other businesses that buy on Ranavista.',
    sections: [
      ['Eligibility', ['Buyer accounts are for businesses buying for resale, production or commercial use. Provide accurate company and contact information.']],
      ['RFQs', ['Post genuine requirements with honest quantities, target prices, deadlines and delivery details. RFQ limits depend on your plan. Ranavista decides which seller receives each RFQ.']],
      ['Quotations and negotiation', ['Review quotations carefully, negotiate through the platform and accept only what you intend to buy. Accepting a quotation and paying creates a binding order with the seller.']],
      ['Payment and delivery', ['Pay through Ranavista so your order is protected. Confirm delivery promptly once goods arrive as agreed, or open a dispute within the release window.']],
      ['Fair dealing', ['Do not share sellers’ confidential pricing or designs, post fake reviews, or contact sellers to buy outside the platform.']],
      ['Plans', ['Plan features and limits are described on the Pricing page. Inspection, audit and other services may carry separate fees where stated.']],
    ],
  },
  {
    slug: 'seller-policy', title: 'Seller Policy', short: 'Seller policy',
    intro: 'Standards for manufacturers and exporters who receive leads through Ranavista.',
    sections: [
      ['Verification', ['Sellers must provide true company details and documents (for example registration, GST, IEC, certifications and factory details) and pass Ranavista verification before receiving leads. We may re-verify at any time.']],
      ['Leads', ['Leads are exclusive and confidential. Respond within the response window shown in your dashboard, quote honestly and decline promptly if you cannot fulfil a request. Repeated non-response lowers your priority.']],
      ['Product information', ['Listings and quotations must accurately describe materials, dimensions, weights, packaging, certifications (for example FSC or CARB) and lead times. Do not list counterfeit, restricted or infringing goods.']],
      ['Quality and delivery', ['Deliver goods that match the accepted quotation and approved samples, on time, with proper export packaging and documents.']],
      ['Payouts', ['Payouts are made to your connected Stripe account after buyer confirmation or a dispute decision, less the platform fee shown in your dashboard.']],
      ['Conduct', ['Communicate through the platform, do not ask buyers to pay outside Ranavista and do not post fake reviews. Buyer contact details are restricted on every plan, and no plan guarantees orders.']],
      ['Plans and add-ons', ['Registration plans and add-on services are described on the Pricing page and billed in INR.']],
    ],
  },
  {
    slug: 'subscription-payment', title: 'Subscription & Payment Policy', short: 'Subscriptions & payments',
    intro: 'How plans are billed for buyers and manufacturers.',
    sections: [
      ['Plans and currency', ['Buyer plans are billed in US dollars (USD). Manufacturer plans are billed in Indian rupees (INR), plus GST where applicable. Current prices are on the Pricing page.']],
      ['Billing and renewal', ['Paid plans are charged in advance for each billing period (monthly, every 3 months or yearly, as shown) and renew automatically until cancelled. One-time fees are charged once.']],
      ['Price changes', ['Launch prices may change. We will give at least 30 days’ notice of a price change; it applies from your next renewal.']],
      ['Payment methods and failures', ['Payments are processed securely by Stripe. If a renewal payment fails we will notify you; your plan may be downgraded if it is not resolved.']],
      ['Upgrades and downgrades', ['Upgrades take effect immediately. Downgrades take effect at the end of the current period.']],
      ['Custom plans', ['Enterprise plans are priced by written agreement, which takes precedence over this page where they differ.']],
      ['Order payments and fees', ['Order payments follow the Payment Protection Policy. Card, ACH and wire processing fees are charged at cost; Ranavista’s platform fee is deducted from the seller payout.']],
    ],
  },
];

export function Legal() {
  const { slug } = useParams();
  const p = POLICIES.find((x) => x.slug === slug);
  if (!p) return <Navigate to="/legal/privacy" replace />;
  return (
    <>
      <PageHero eyebrow="Legal" title={p.title} text={`Last updated ${UPDATED}`} />
      <section className="container-x grid gap-10 py-14 lg:grid-cols-[260px_1fr]">
        <aside className="min-w-0 lg:sticky lg:top-28 lg:self-start">
          <p className="label">Policies</p>
          <nav className="flex gap-1 overflow-x-auto pb-2 lg:flex-col lg:overflow-visible lg:pb-0">
            {POLICIES.map((x) => (
              <NavLink key={x.slug} to={`/legal/${x.slug}`} className={({ isActive }) => cx('flex shrink-0 items-center gap-2 rounded-lg px-3 py-2 text-sm transition', isActive ? 'bg-forest text-white' : 'text-ink-medium hover:bg-white hover:text-forest')}>
                <FileText className="h-4 w-4 shrink-0 opacity-70" />{x.short}
              </NavLink>
            ))}
          </nav>
        </aside>
        <article className="card card-pad min-w-0 max-w-3xl sm:p-10">
          <Alert type="warning" className="mb-8">Template text prepared for Ranavista’s marketplace model. Have your lawyer review it and fill in the [bracketed] details before launch.</Alert>
          <p className="text-lg leading-relaxed text-ink">{p.intro}</p>
          {p.sections.map(([h, paras], i) => (
            <section key={h} className="mt-9">
              <h2 className="flex items-baseline gap-3 text-2xl text-forest"><span className="font-sans text-sm font-medium text-gold-dark">{String(i + 1).padStart(2, '0')}</span>{h}</h2>
              <div className="mt-3 space-y-2.5 leading-relaxed text-ink-medium">
                {paras.map((t) => <p key={t} className={cx(/^(•|\d\.)/.test(t) && 'pl-4 -indent-4')}>{t}</p>)}
              </div>
            </section>
          ))}
          <p className="mt-12 border-t border-mist pt-6 text-sm text-ink-medium">Questions about this policy? <Link to="/contact" className="link">Contact us</Link> or email legal@ranavista.com.</p>
        </article>
      </section>
    </>
  );
}
