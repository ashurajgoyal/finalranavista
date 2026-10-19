# Ranavista — B2B Quotation Marketplace (MERN)

Admin-managed, single-seller lead routing marketplace for home & lifestyle sourcing.
Built for buyers worldwide (USD buyer plans, INR seller plans, any country address, in/lb ↔ CBM/kg) with the Ranavista brand guide
(Primary Dark Green `#0D3B32`, Brand Gold `#B89B6B`, Warm Cream `#F7F3EA`, Playfair Display + Poppins).

```
ranavista/
├── server/   Express + MongoDB API, Socket.io chat, Stripe Connect + Billing, PDF invoices, cron reminders
├── client/   Website + Buyer dashboard + Seller dashboard   (www.yourdomain.com)
└── admin/    Admin panel                                     (manage.yourdomain.com)
```

---

## What changed — October 2026 update

| Area | Change |
|---|---|
| **Brand** | Finalised lotus logo everywhere (website, dashboards, admin panel, favicons, PDF invoices, emails). Vector source in `client/public/brand/` + `components/brandPaths.js`. |
| **Global market** | Footer and site copy now say *global* retailers and brands. Buyer registration, settings and RFQ delivery use a country picker (US keeps state + ZIP; other countries get province + postal code). |
| **Escrow explained** | New "What paid through escrow means" section on the home page, FAQ entries and a full Payment Protection policy page. |
| **Careers** | `/careers` page with open positions + application form with CV upload (PDF/DOC/DOCX, 5 MB). CVs are stored privately (`server/uploads/cvs`, never public). Admin → **Careers**: applications pipeline, CV download, notes, rating, and open-positions manager. Set `CAREERS_EMAIL` to get an email per application. |
| **Plans** | Buyer plans from the client sheet (Free, Starter $29/3 months, Professional $49/mo, Business $99/mo, Enterprise custom). Seller plans in INR (Basic ₹299, Enhanced ₹1,499, Premium ₹2,999, Enterprise custom) + add-on services table. Plans support monthly / 3-monthly / yearly / one-time / custom billing, USD or INR, and an optional struck-through launch price — all editable in Admin → Subscriptions. Existing databases are upgraded automatically on the next server start. |
| **Policies** | `/legal/*`: Privacy, Terms, Payment Protection (Escrow), Refund & Cancellation, Shipping & Delivery, Buyer Policy, Seller Policy, Subscriptions & Payments. **Template text — lawyer review needed.** |
| **UI** | New top bar, navbar with gold underline states, richer footer, redesigned pricing cards, mobile fixes. |

New `.env` keys: `CAREERS_EMAIL`, `INR_PER_USD` (reporting only), optional `EMAIL_LOGO_URL`.


## What changed — 19 October 2026 update (pending items 3, 5–11)

| # | Area | What was added |
|---|---|---|
| 3 | **Manage · USD & INR** | Every amount in the admin panel now shows **USD and INR** together (dashboards, transactions, ledgers, disputes, RFQs, plans, revenue, reports). Orders store the exchange rate of the day they were created (`fxInrPerUsd`) so old INR figures don’t move. Live **$1 = ₹…** chip in the admin top bar. |
| 5 | **Website · Products by country** | 21 sourcing countries with their products (USA, India, Europe, Australia, UK, China, Japan, Vietnam, Indonesia, Malaysia, Thailand, Cambodia, Laos, South Africa, Brazil, UAE, Oman, South Korea, Turkey + Mexico, Portugal). Products page → *By country*, navbar mega-menu, home page section and `/products/country/:slug` pages with category filters, MOQ / indicative prices and “Request a quote”. Everything is editable in **Admin → Countries & products** (add products, photos, featured flags, hide/show countries). Verified-seller counts per country are live. |
| 6 | **Website + Manage · Sourcing** | `/sourcing-request`: buyers (or guests) upload up to 6 product photos, specifications, target price (any currency, per unit or total), quantity and required-by date. Each request becomes a **Sourcing project** (`SRC-2026-00001`) in **Admin → Sourcing projects**: status pipeline, owner, priority, internal notes, supplier-quote comparison, send a quotation to the buyer (email + buyer dashboard accept/decline), one-click **convert to RFQ**. Buyers see their requests under *Buyer → Sourcing requests*. Team gets an email + bell notification. |
| 7 | **Manage · Currency rates** | **Admin → Currency rates**: USD, Europe (EUR), UK (GBP), Canada (CAD), Australia (AUD), Japan (JPY), UAE (AED) against INR and USD, 24 h / 7 day change, 30-day trend, converter, manual refresh. Free providers (open.er-api.com → frankfurter.app fallback), no API key; refreshed every `FX_REFRESH_HOURS` and cached in MongoDB (keeps working if the provider is down). |
| 8 | **Manage · Reports** | **Admin → Reports**: Buyers, Sellers, Seller registrations & verification, Seller plan payments, RFQs, Orders & transactions, Sourcing requests, Liaison enquiries, Contact enquiries, Job applications, Disputes. Time presets (today, this/last week, last 7/30 days, this/last month, quarter, year, all) or **custom from–to dates**, filters (status, country, category, plan, service, search), column picker, weekly / monthly summary, preview, export to **Excel (.xlsx)**, **PDF** and CSV. Money columns in USD and INR. Every export is in the audit log. |
| 9 | **Manage · Buyer & Seller dashboards** | **Buyers → Dashboard** and **Sellers → Dashboard** tabs: totals, new this week/month, paying users, plans, top countries, categories, sign-ups chart, RFQ pipeline, GMV / escrow / payouts, top buyers and top-rated sellers, and the verification pipeline. |
| 10 | **Seller verification** | Seller sign-up is now a 5-step **supplier registration** (all fields required): name, address, contact number, email, **country → state → city dropdowns**, GST, factory address, company type, established year, turnover, employees, factory units, certifications, production capacity (containers), product categories, SKUs, exporting since, export markets, factory compliance. On submit Ranavista gets **“New supplier registration received” by email (with date) and in the admin panel**. **Admin → Seller verification**: A) physical verification Yes/No → schedule visit, B) virtual verification Yes/No → schedule Teams/Zoom call (supplier is emailed), record results, approve → **NDA PDF emailed automatically** → supplier e-signs (or uploads a signed copy) → **plan details & payment link** emailed → payment (Stripe in INR, or mark bank transfer/UPI received) → **invoice PDF emailed** → **supplier code `RV-SUP-00001` generated** and the seller is activated. Pending verifications are highlighted on the dashboard, in the sidebar and in the seller dashboard; daily reminder if one waits 3+ days. Full activity log, notes and owner per application. Existing sellers are asked to complete the form from *Seller → Verification*. |
| 11 | **Website · Liaison Services** | `/liaison-services` next to Buyers & Sellers (top bar, navbar, home page, footer): Sourcing, Procurement, Inspection Services, Shipping Services, Graphic Designing, Product Photography, Digital Marketing, Product Designing, Content Creation, White Labelling — with an enquiry form. **Admin → Liaison enquiries**: status pipeline, owner, notes, reply to the client by email. |
| + | **Extra admin features** | Dashboard **action centre** (pending verifications, sourcing projects, new liaison & contact enquiries, live rates) · **Admin → Settings** (team inboxes, company details for invoices/NDA, editable NDA text & version, which plans are offered after the NDA) · sidebar badges for every queue · CSV export. |

**New `.env` keys (server):** `TEAM_EMAIL`, `SELLER_REQUESTS_EMAIL`, `SOURCING_EMAIL`, `LIAISON_EMAIL`, `COMPANY_LEGAL_NAME`, `COMPANY_ADDRESS`, `COMPANY_GSTIN`, `COMPANY_EMAIL`, `COMPANY_PHONE`, `FX_REFRESH_HOURS`, `REPORT_TZ_OFFSET_MINUTES`. **Admin:** optional `VITE_SITE_URL`.
**New server packages:** `exceljs` (Excel reports) and `country-state-city` (state/city dropdowns) — installed by `npm run install:all`.

**Upgrading an existing deployment:** pull the code → `npm run install:all` → redeploy API, website and admin. On first start the API adds the 21 countries and starts loading currency rates; nothing else needs migrating. Then set the inboxes and company details in **Admin → Settings** and have a lawyer review the NDA text there.

> Supplier plan payments use Stripe Checkout in the plan’s currency (INR). Make sure your Stripe account can accept INR, or collect by bank transfer/UPI and use **Mark payment received**. NDAs and supplier invoices are stored privately in `server/uploads/private` (served only to admins and the supplier) — like other uploads, move them to S3/R2 before launch on hosts with temporary disks.

---

## 1. Run it on your computer

**Needs:** Node.js 18+ and MongoDB (local, or a free MongoDB Atlas cluster).

```bash
cd ranavista
npm install                 # installs "concurrently" for the root dev script
npm run install:all         # installs server, client, admin

cp server/.env.example server/.env     # then edit MONGO_URI and JWT_SECRET
npm run seed:demo           # plans + super admin + demo buyer/sellers/RFQs
npm run dev                 # API :5000 · website :5173 · admin :5174
```

| App | URL | Login |
|---|---|---|
| Website | http://localhost:5173 | `buyer@demo.com` / `Demo@12345` |
| Seller | http://localhost:5173 | `seller1@demo.com` … `seller4@demo.com` / `Demo@12345` |
| Admin | http://localhost:5174 | `admin@ranavista.com` / `Admin@12345` (from `.env`) |

**Demo mode:** with `STRIPE_SECRET_KEY` empty, payments, payouts and paid plans are simulated so you can click through
the full flow. With `SMTP_HOST` empty, OTP codes and emails are printed in the **server terminal**.

### Try the full flow (5 minutes)
1. **Admin → Pending queue** → open a demo RFQ → Seller Selection Panel → *Push lead* to one seller.
2. **Seller** (`seller1@demo.com`) → My leads → enter unit prices → *Send quotation*.
3. **Buyer** → My RFQs → open it → *Counter-offer* or *Accept* → chat with the seller.
4. Buyer → Order → *Pay securely* (instant in demo) → funds show **held**; PDF invoice is generated.
5. Seller → *Mark as shipped* → Buyer → *Confirm delivery* → funds **released**, both sides leave reviews.
6. Admin → Transactions / Disputes / Revenue / Audit log to see every step recorded.

---

## 2. What's included

**Website (client)** — Home, About, Products, Sourcing Countries, Trade Fairs, Pricing, Contact, Careers, 8 policy pages ·
separate buyer & seller sign-up · email OTP verification · forgot/reset password.

**Buyer** — dashboard · post RFQ (multi-item cart, imperial or metric carton specs, attachments, auto-saved draft) ·
**Container Fill Optimizer** (20′/40′/40′HC by CBM + weight, smallest-container recommendation, "add more to optimize"
with one-click fill) · quote review with target-price comparison · counter-offer / accept / decline (and request
another seller) · real-time chat · Stripe Checkout payment held in escrow · confirm delivery · disputes · PDF invoice ·
reviews · plans & billing · notifications.

**Seller** — dashboard · exclusive leads with response-window countdown · line-by-line quotation · revise after counter ·
decline lead · chat · ship with tracking · Stripe Connect payouts · reviews · company profile & verification documents ·
plans.

**Admin panel** — role-based (Super Admin, Finance, Support, Category Manager) · dashboard KPIs ·
**Pending RFQ Queue** · **Seller Selection Panel** (category-matched sellers side-by-side with rating, tier, response
rate, open leads, payout status) · single-seller push with **assignment lock**, response window, reassign / pull back ·
full **audit trail** · seller verification · buyers · **transaction control center** (all orders, buyer ledger, seller
ledger, manual release / full or partial refund, ledger notes, chargebacks) · **dispute workspace** (public replies +
internal notes, chat transcript, refund / release / partial) · subscription plans (edit prices, Stripe Price IDs,
limits) and per-user plan assignment · revenue (MRR, ARR, churn, tiers, fees by month, GMV by category) ·
review moderation · website enquiries · admin team management.

**Automations** (hourly) — quote-due reminders to sellers, overdue-lead alerts to admins, buyer deadline reminders,
unpaid-order and delivery-confirmation nudges.

Out of scope as agreed (Phase 2): freight booking, 3D bin-packing, multi-container split, commission/lead-credits,
mobile app, multi-language website. (Admin panel now shows USD + INR.)

---

## 3. Go live for free (starter setup)

| Piece | Free option | Notes |
|---|---|---|
| Database | **MongoDB Atlas** M0 | Copy the connection string into `MONGO_URI`. |
| API (`server/`) | **Render** Web Service (free) | Build `npm install`, start `npm start`. Free tier sleeps after inactivity — first request takes ~30–50 s. |
| Website (`client/`) | **Vercel** or **Netlify** | Root dir `client`, build `npm run build`, output `dist`. Set `VITE_API_URL=https://api.yourdomain.com`. |
| Admin (`admin/`) | **Vercel** or **Netlify** (2nd project) | Root dir `admin`, same settings, custom domain `manage.yourdomain.com`. |

SPA routing files (`vercel.json`, `public/_redirects`) are already included.

**Server environment on Render:** copy every key from `server/.env.example`, and set
`CLIENT_URL=https://www.yourdomain.com`, `ADMIN_URL=https://manage.yourdomain.com`, `API_URL=https://api.yourdomain.com`.
Then open the Render shell once and run `npm run seed` to create plans and the first Super Admin.

**File uploads:** stored on the server disk (`server/uploads`). Render's free disk is wiped on redeploy — before real
launch switch `server/src/middleware/upload.js` to S3 / Cloudinary / Cloudflare R2 (the rest of the code doesn't change).

---

## 4. Turn on real payments (Stripe)

1. Create a Stripe account → enable **Connect** (Express accounts) and **Billing**.
2. Put the secret key in `STRIPE_SECRET_KEY`.
3. Products → create a recurring Price for each paid plan → paste each `price_…` into **Admin → Subscriptions → Edit plan**.
4. Developers → Webhooks → endpoint `https://api.yourdomain.com/api/webhooks/stripe` with events:
   `checkout.session.completed`, `customer.subscription.created`, `customer.subscription.updated`,
   `customer.subscription.deleted`, `invoice.payment_failed`, `charge.dispute.created`, `account.updated`.
   Copy the signing secret to `STRIPE_WEBHOOK_SECRET`.
5. Settings → Billing → Customer portal → activate (used by the "Manage billing" button).

**Escrow model:** buyer pays the platform (Stripe Checkout) → money is **held** in your Stripe balance → on delivery
confirmation (or admin decision) a **Transfer** sends `total − platform fee` to the seller's connected account.
`PLATFORM_FEE_PERCENT` controls the fee.

> ⚠️ Check Stripe's cross-border payout country list for your sellers' countries before launch. If a seller's country
> isn't supported, keep the order held and pay them outside Stripe, then record it with a ledger note.
> Holding funds for long periods may require Stripe's approval for your account — confirm with Stripe and your
> lawyer that the escrow-style flow fits your business before going live.

---

## 5. Email, SMS & WhatsApp

- **Email:** any SMTP (Gmail app password, Zoho, Brevo, SendGrid, Amazon SES) → `SMTP_*` keys.
- **SMS/WhatsApp (optional):** Twilio keys in `.env`; `sendSms()` in `server/src/services/mailer.js` is ready to call
  from `notify()` for the events you want.

---

## 6. API overview

| Area | Endpoints |
|---|---|
| Auth | `POST /api/auth/register · login · verify-email · resend-otp · forgot-password · reset-password` · `GET/PATCH /api/auth/me` |
| RFQ | `POST /api/rfqs` · `GET /api/rfqs` · `GET /api/rfqs/:id` · `POST /api/rfqs/:id/cancel · decline · quote` · `POST /api/rfqs/container-fill` |
| Quotes | `POST /api/rfqs/quotes/:id/counter · revise · accept · reject` |
| Orders | `GET /api/orders` · `GET /api/orders/:id` · `POST …/pay · verify-payment · ship · confirm-delivery · dispute · dispute/message · review` · `GET …/invoice` |
| Chat | `GET/POST /api/chat/:rfqId` (+ Socket.io `message`, `notification` events) |
| Account | `/api/notifications` · `/api/dashboard` · `/api/subscription` · `/api/payouts` · `/api/uploads` · `/api/public/*` |
| Admin | `/api/admin/overview · rfqs · rfqs/:id/candidates · lock · assign · reassign · unassign · users · orders · ledgers · disputes · plans · revenue · audit · team …` |
| Admin (Oct 2026) | `/api/admin/suppliers/*` (verification workflow) · `/api/admin/sourcing/*` · `/api/admin/liaison/*` · `/api/admin/countries` · `/api/admin/fx` · `/api/admin/reports/meta` · `/api/admin/reports/:type?format=json\|xlsx\|pdf\|csv` · `/api/admin/insights/buyers\|sellers` · `/api/admin/action-center` · `/api/admin/settings` |
| Supplier | `/api/supplier/application · application/documents · nda · nda/sign · nda/upload · pay · pay/verify · invoice` |
| Public (Oct 2026) | `/api/public/geo/countries\|states\|cities` · `/api/public/countries[/:slug]` · `POST /api/public/sourcing-requests` (multipart, field `images`) · `POST /api/public/liaison` · buyer `/api/sourcing[/:id][/respond]` |
