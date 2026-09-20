/**
 * Single source of truth for the identity, contact and legal-entity details
 * that the administrative pages (privacy, terms, contact, refunds, …) quote.
 *
 * Every field is overridable through the environment so that a deployment can
 * publish its real registered details without editing source. The defaults are
 * marked `placeholder:true` when they are obviously not a real value, and the
 * renderer surfaces an operator warning on the page instead of silently
 * publishing a fake postal address or a fake GSTIN — a legal page carrying
 * invented company details is worse than one that says "not configured yet".
 */

const env = (key, fallback = '') => {
  const raw = process.env[key];
  return typeof raw === 'string' && raw.trim() ? raw.trim() : fallback;
};

const PLACEHOLDER = /(replace|example\.com|example\.in|your-domain|xxxx|to-be|tbd|changeme)/i;

export function siteIdentity() {
  const legalName = env('COMPANY_LEGAL_NAME', 'HoraSaar (sole proprietorship)');
  const domain = env('PUBLIC_BASE_URL', 'https://horasaar.example').replace(/\/+$/, '');
  const supportEmail = env('SUPPORT_EMAIL', 'support@horasaar.example');

  const identity = {
    brand: env('BRAND_NAME', 'HoraSaar'),
    tagline: env('BRAND_TAGLINE', 'Personal Jyotish guidance, explained as timing'),
    legalName,
    baseUrl: domain,
    founded: env('COMPANY_FOUNDED_YEAR', '2024'),
    country: env('COMPANY_COUNTRY', 'India'),
    jurisdiction: env('LEGAL_JURISDICTION', 'the courts of Ahmedabad, Gujarat, India'),
    governingLaw: env('GOVERNING_LAW', 'the laws of India'),

    supportEmail,
    privacyEmail: env('PRIVACY_EMAIL', supportEmail),
    grievanceEmail: env('GRIEVANCE_EMAIL', supportEmail),
    legalEmail: env('LEGAL_EMAIL', supportEmail),
    pressEmail: env('PRESS_EMAIL', supportEmail),
    careersEmail: env('CAREERS_EMAIL', supportEmail),
    securityEmail: env('SECURITY_EMAIL', supportEmail),
    affiliateEmail: env('AFFILIATE_EMAIL', supportEmail),

    phone: env('SUPPORT_PHONE', ''),
    supportHours: env('SUPPORT_HOURS', 'Monday to Saturday, 10:00–18:00 IST'),
    responseTarget: env('SUPPORT_RESPONSE_TARGET', 'two working days'),

    addressLines: env('COMPANY_ADDRESS', '').split('|').map(s => s.trim()).filter(Boolean),
    gstin: env('COMPANY_GSTIN', ''),
    cin: env('COMPANY_CIN', ''),

    grievanceOfficer: env('GRIEVANCE_OFFICER_NAME', ''),
    dataProtectionOfficer: env('DPO_NAME', ''),

    paymentProvider: 'Razorpay Software Private Limited',
    currency: env('RAZORPAY_CURRENCY', 'INR'),
  };

  identity.placeholders = Object.entries({
    'PUBLIC_BASE_URL': identity.baseUrl,
    'SUPPORT_EMAIL': identity.supportEmail,
    'COMPANY_LEGAL_NAME': identity.legalName,
    'COMPANY_ADDRESS': identity.addressLines.join(', '),
  }).filter(([, value]) => !value || PLACEHOLDER.test(String(value))).map(([key]) => key);

  identity.configured = identity.placeholders.length === 0;
  return identity;
}

/** Last substantive revision of the legal texts. Bump when the wording changes. */
export const POLICY_EFFECTIVE_DATE = env('POLICY_EFFECTIVE_DATE', '2026-01-15');

/** Human-readable postal address, or an honest note when none is configured. */
export function postalAddress(identity = siteIdentity()) {
  return identity.addressLines.length
    ? identity.addressLines.join(', ')
    : 'Registered postal address is available on request by writing to the support address above.';
}
