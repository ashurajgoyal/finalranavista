export const usd = (n, digits = 2) =>
  Number(n || 0).toLocaleString('en-US', { style: 'currency', currency: 'USD', minimumFractionDigits: digits, maximumFractionDigits: digits });

export const usd0 = (n) => usd(n, 0);
export const num = (n, d = 0) => Number(n || 0).toLocaleString('en-US', { maximumFractionDigits: d });

export const date = (d) => (d ? new Date(d).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) : '—');
export const dateTime = (d) => (d ? new Date(d).toLocaleString('en-US', { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' }) : '—');

export function timeAgo(d) {
  const s = (Date.now() - new Date(d).getTime()) / 1000;
  if (s < 60) return 'just now';
  if (s < 3600) return `${Math.floor(s / 60)}m ago`;
  if (s < 86400) return `${Math.floor(s / 3600)}h ago`;
  if (s < 604800) return `${Math.floor(s / 86400)}d ago`;
  return date(d);
}

export function timeLeft(d) {
  const s = (new Date(d).getTime() - Date.now()) / 1000;
  if (s <= 0) return 'overdue';
  if (s < 3600) return `${Math.ceil(s / 60)} min left`;
  if (s < 86400) return `${Math.floor(s / 3600)}h left`;
  return `${Math.floor(s / 86400)}d left`;
}

// Imperial helpers (shown alongside metric)
export const cbmToCuFt = (cbm) => Number(cbm || 0) * 35.3147;
export const kgToLb = (kg) => Number(kg || 0) * 2.20462;

export const US_STATES = [
  'AL','AK','AZ','AR','CA','CO','CT','DE','DC','FL','GA','HI','ID','IL','IN','IA','KS','KY','LA','ME','MD','MA','MI','MN','MS','MO','MT','NE','NV','NH','NJ','NM','NY','NC','ND','OH','OK','OR','PA','RI','SC','SD','TN','TX','UT','VT','VA','WA','WV','WI','WY',
];

export const CATEGORIES = [
  'Home Decor', 'Furniture', 'Home Textiles', 'Rugs & Carpets', 'Kitchen & Dining', 'Lighting', 'Bath & Spa', 'Garden & Outdoor',
  'Handicrafts', 'Fashion Accessories', 'Jewelry', 'Apparel', 'Leather Goods', 'Gifts & Seasonal', 'Packaging', 'Other',
];

export const INCOTERMS = ['FOB', 'EXW', 'CIF', 'CFR', 'DDP', 'DAP'];
export const UNITS = ['pcs', 'sets', 'pairs', 'dozen', 'cartons', 'yards', 'meters', 'kg', 'lbs'];

/** Any currency, e.g. money(1499, 'INR') → ₹1,499 */
export const money = (n, currency = 'USD', digits = 0) =>
  Number(n || 0).toLocaleString(currency === 'INR' ? 'en-IN' : 'en-US', { style: 'currency', currency, minimumFractionDigits: digits, maximumFractionDigits: digits });

export const PERIOD_LABEL = { month: '/month', quarter: '/3 months', year: '/year', one_time: 'one-time', custom: '' };

/** Display parts for a subscription plan card. */
export function planPrice(p) {
  if (p.customPricing) return { main: p.priceLabel || 'Custom', suffix: p.priceNote || 'Tailored to your requirements' };
  if (!p.price) return { main: 'Free', suffix: p.priceNote || 'Forever' };
  const period = PERIOD_LABEL[p.billingPeriod || 'month'] ?? '';
  return { main: money(p.price, p.currency || 'USD'), suffix: period, compareAt: p.compareAtPrice ? money(p.compareAtPrice, p.currency || 'USD') : null };
}

export const COUNTRIES = [
  'United States', 'Canada', 'United Kingdom', 'Australia', 'Germany', 'France', 'Netherlands', 'United Arab Emirates', 'Saudi Arabia', 'India',
  'Afghanistan', 'Albania', 'Algeria', 'Andorra', 'Angola', 'Antigua and Barbuda', 'Argentina', 'Armenia', 'Austria', 'Azerbaijan', 'Bahamas', 'Bahrain',
  'Bangladesh', 'Barbados', 'Belarus', 'Belgium', 'Belize', 'Benin', 'Bhutan', 'Bolivia', 'Bosnia and Herzegovina', 'Botswana', 'Brazil', 'Brunei',
  'Bulgaria', 'Burkina Faso', 'Burundi', 'Cambodia', 'Cameroon', 'Cape Verde', 'Central African Republic', 'Chad', 'Chile', 'China', 'Colombia',
  'Comoros', 'Congo', 'Costa Rica', 'Croatia', 'Cuba', 'Cyprus', 'Czech Republic', 'Denmark', 'Djibouti', 'Dominica', 'Dominican Republic',
  'DR Congo', 'Ecuador', 'Egypt', 'El Salvador', 'Equatorial Guinea', 'Eritrea', 'Estonia', 'Eswatini', 'Ethiopia', 'Fiji', 'Finland', 'Gabon',
  'Gambia', 'Georgia', 'Ghana', 'Greece', 'Grenada', 'Guatemala', 'Guinea', 'Guinea-Bissau', 'Guyana', 'Haiti', 'Honduras', 'Hong Kong', 'Hungary',
  'Iceland', 'Indonesia', 'Iran', 'Iraq', 'Ireland', 'Israel', 'Italy', 'Ivory Coast', 'Jamaica', 'Japan', 'Jordan', 'Kazakhstan', 'Kenya', 'Kiribati',
  'Kosovo', 'Kuwait', 'Kyrgyzstan', 'Laos', 'Latvia', 'Lebanon', 'Lesotho', 'Liberia', 'Libya', 'Liechtenstein', 'Lithuania', 'Luxembourg', 'Macau',
  'Madagascar', 'Malawi', 'Malaysia', 'Maldives', 'Mali', 'Malta', 'Marshall Islands', 'Mauritania', 'Mauritius', 'Mexico', 'Micronesia', 'Moldova',
  'Monaco', 'Mongolia', 'Montenegro', 'Morocco', 'Mozambique', 'Myanmar', 'Namibia', 'Nauru', 'Nepal', 'New Zealand', 'Nicaragua', 'Niger',
  'Nigeria', 'North Korea', 'North Macedonia', 'Norway', 'Oman', 'Pakistan', 'Palau', 'Palestine', 'Panama', 'Papua New Guinea', 'Paraguay', 'Peru',
  'Philippines', 'Poland', 'Portugal', 'Qatar', 'Romania', 'Russia', 'Rwanda', 'Saint Kitts and Nevis', 'Saint Lucia', 'Saint Vincent and the Grenadines',
  'Samoa', 'San Marino', 'Sao Tome and Principe', 'Senegal', 'Serbia', 'Seychelles', 'Sierra Leone', 'Singapore', 'Slovakia', 'Slovenia',
  'Solomon Islands', 'Somalia', 'South Africa', 'South Korea', 'South Sudan', 'Spain', 'Sri Lanka', 'Sudan', 'Suriname', 'Sweden', 'Switzerland',
  'Syria', 'Taiwan', 'Tajikistan', 'Tanzania', 'Thailand', 'Timor-Leste', 'Togo', 'Tonga', 'Trinidad and Tobago', 'Tunisia', 'Turkey', 'Turkmenistan',
  'Tuvalu', 'Uganda', 'Ukraine', 'Uruguay', 'Uzbekistan', 'Vanuatu', 'Vatican City', 'Venezuela', 'Vietnam', 'Yemen', 'Zambia', 'Zimbabwe',
];

/* ---------- Supplier registration ---------- */
export const COMPANY_TYPES = ['Proprietorship', 'Partnership', 'LLP', 'Private Limited', 'Public Limited', 'One Person Company', 'Co-operative', 'Other'];
export const CERTIFICATIONS = [
  'ISO 9001', 'ISO 14001', 'ISO 45001', 'OEKO-TEX Standard 100', 'GOTS', 'GRS (Global Recycled Standard)', 'FSC', 'BSCI / amfori', 'Sedex / SMETA',
  'SA8000', 'WRAP', 'Fair Trade', 'CE', 'FDA / LFGB food contact', 'BIS', 'Export House (DGFT)', 'IEC (Import Export Code)', 'MSME / Udyam', 'Handicraft (EPCH) member',
];
export const COMPLIANCE_AUDITS = ['BSCI / amfori', 'Sedex / SMETA', 'SA8000', 'WRAP', 'ISO 45001', 'Higg FEM', 'Walmart / Target audit', 'Buyer-specific audit', 'Fire & building safety'];
export const TURNOVER_CURRENCIES = ['INR', 'USD', 'EUR', 'GBP', 'AED', 'CNY', 'VND'];
export const SOURCING_CURRENCIES = ['USD', 'INR', 'EUR', 'GBP', 'AUD', 'CAD', 'AED', 'JPY', 'CNY'];
