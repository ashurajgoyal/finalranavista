import dotenv from 'dotenv';
dotenv.config();

const env = {
  port: Number(process.env.PORT || 5000),
  nodeEnv: process.env.NODE_ENV || 'development',
  mongoUri: process.env.MONGO_URI || 'mongodb://127.0.0.1:27017/ranavista',
  jwtSecret: process.env.JWT_SECRET || 'dev-secret-change-me',
  jwtExpires: process.env.JWT_EXPIRES || '7d',
  clientUrl: process.env.CLIENT_URL || 'http://localhost:5173',
  adminUrl: process.env.ADMIN_URL || 'http://localhost:5174',
  apiUrl: process.env.API_URL || 'http://localhost:5000',
  stripeKey: process.env.STRIPE_SECRET_KEY || '',
  stripeWebhookSecret: process.env.STRIPE_WEBHOOK_SECRET || '',
  platformFeePercent: Number(process.env.PLATFORM_FEE_PERCENT || 3),
  smtp: {
    host: process.env.SMTP_HOST || '',
    port: Number(process.env.SMTP_PORT || 587),
    user: process.env.SMTP_USER || '',
    pass: process.env.SMTP_PASS || '',
    from: process.env.MAIL_FROM || 'Ranavista <no-reply@ranavista.com>',
  },
  twilio: {
    sid: process.env.TWILIO_SID || '',
    token: process.env.TWILIO_TOKEN || '',
    from: process.env.TWILIO_FROM || '',
  },
  // Inbox that receives new job applications from /careers (falls back to admin bell notifications only)
  inrPerUsd: Number(process.env.INR_PER_USD || 88), // only for reporting INR plan revenue as USD in admin
  // Public URL of a PNG logo for email headers (SVG is blocked by most email apps). Defaults to the website's copy.
  logoUrl: process.env.EMAIL_LOGO_URL || `${process.env.CLIENT_URL || 'http://localhost:5173'}/brand/ranavista-email-logo.png`,
  careersEmail: process.env.CAREERS_EMAIL || '',
  // Ranavista's registered inbox for "new request" emails (supplier registrations, sourcing, liaison).
  // Each can be overridden below, and all of them can also be changed later in Admin → Settings.
  teamEmail: process.env.TEAM_EMAIL || '',
  sellerRequestsEmail: process.env.SELLER_REQUESTS_EMAIL || '',
  sourcingEmail: process.env.SOURCING_EMAIL || '',
  liaisonEmail: process.env.LIAISON_EMAIL || '',
  // Shown on supplier-registration invoices and the NDA (also editable in Admin → Settings)
  company: {
    legalName: process.env.COMPANY_LEGAL_NAME || 'Ranavista',
    address: process.env.COMPANY_ADDRESS || '',
    gstin: process.env.COMPANY_GSTIN || '',
    email: process.env.COMPANY_EMAIL || 'hello@ranavista.com',
    phone: process.env.COMPANY_PHONE || '',
  },
  fxRefreshHours: Number(process.env.FX_REFRESH_HOURS || 3),
  leadResponseHours: Number(process.env.LEAD_RESPONSE_HOURS || 48),
};

env.demoPayments = !env.stripeKey;
export default env;
