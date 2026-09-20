/**
 * Legal and compliance pages.
 *
 * The copy below describes what this codebase actually does. Claims are kept
 * deliberately narrow: HoraSaar stores subscription records in a JSON store,
 * delegates card handling to Razorpay, sends reports over SMTP, and sets two
 * first-party preference cookies plus one admin session cookie. Anything the
 * application does not do (advertising networks, profile selling, third-party
 * trackers) is stated as a negative rather than left ambiguous.
 */
export function legalPages({ id, date, address }) {
  return [
    {
      slug: 'privacy-policy',
      group: 'legal',
      nav: 'Privacy Policy',
      title: 'Privacy Policy',
      description: `How ${id.brand} collects, uses, stores and deletes the birth details, contact details and payment records you give us.`,
      updated: date,
      lede: `${id.brand} asks for birth details because a Jyotish calculation cannot be produced without them. This page explains exactly what is collected, why each item is needed, how long it is kept and how to have it removed.`,
      blocks: [
        { type: 'note', tone: 'info', title: 'The short version', text: 'Birth details entered on the public forecast form are calculated and returned without being stored. Details are stored only when you buy a subscription, because a daily report cannot be generated without them. We do not sell data, we do not run advertising trackers, and we never publish your chart.' },

        { type: 'h', text: 'Who is responsible for your data' },
        { type: 'p', text: `${id.legalName} operates ${id.brand} and is the controller of the personal data described here. Questions, corrections and deletion requests go to ${id.privacyEmail}. Postal address: ${address}.` },

        { type: 'h', text: 'What we collect, and why' },
        { type: 'table', head: ['Data', 'Why it is needed', 'When it is collected'], rows: [
          ['Name', 'Addressing the report and the confirmation email.', 'Forecast form and subscription checkout.'],
          ['Date, time and place of birth', 'Every planetary position, Dasha period and house calculation derives from these three values. Without them no chart exists.', 'Forecast form and subscription checkout.'],
          ['Latitude, longitude and UTC offset', 'Resolved from the birth place you select, used for the ascendant and for local sunrise-based timing.', 'Derived automatically from your place selection.'],
          ['Email address', 'Delivering the daily report, the payment confirmation and subscription notices.', 'Subscription checkout only.'],
          ['Mobile number (optional)', 'An alternate delivery channel where you choose one.', 'Subscription checkout only.'],
          ['Chosen life-area topics and report period', 'Selecting which interpretation rules run for you.', 'Forecast form and subscription checkout.'],
          ['Payment order and payment identifiers', 'Matching a Razorpay payment to your subscription and supporting refunds.', 'At checkout, returned by the payment gateway.'],
          ['Request IP address', 'Rate limiting, to keep the calculation endpoints available. Held in memory for a rolling window and never written to the subscriber record.', 'Every request.'],
        ] },

        { type: 'h', text: 'What we never collect' },
        { type: 'ul', items: [
          'Card numbers, CVV, UPI PIN or net-banking credentials. These are entered inside Razorpay\u2019s own checkout and never reach our servers.',
          'Government identity numbers, biometric data or location tracking from your device.',
          'Advertising identifiers, cross-site cookies or third-party analytics profiles.',
          'Account passwords for ordinary users \u2014 the public site has no user registration at all.',
        ] },

        { type: 'h', text: 'The anonymous-by-default forecast' },
        { type: 'p', text: 'When you use the forecast form on the home page, your birth details are sent to the calculation endpoint, a chart is computed in memory, an interpretation is returned, and the inputs are discarded when the request ends. Nothing is written to disk and no cookie identifies you. This is why the public forecast needs no account.' },

        { type: 'h', text: 'What changes when you subscribe' },
        { type: 'p', text: 'A daily report at 07:00 can only be produced if we keep your birth details and delivery address, so a subscription record is written to our own datastore. It contains your name, birth details, contact channel, selected topics, plan, billing period, payment status and payment identifiers, and a private management token that lets you open and cancel the subscription without an account.' },

        { type: 'h', text: 'Legal bases for processing' },
        { type: 'dl', items: [
          ['Performance of a contract', 'Storing birth details and a delivery address to produce and send the reports you paid for.'],
          ['Legitimate interest', 'Rate limiting, fraud checks on payment verification, and keeping the service secure and available.'],
          ['Legal obligation', 'Retaining payment and tax records for the period Indian law requires.'],
          ['Consent', 'Optional analytics-free preference cookies, and any testimonial you choose to submit for publication.'],
        ] },

        { type: 'h', text: 'Who else sees your data' },
        { type: 'table', head: ['Processor', 'What they receive', 'Why'], rows: [
          [id.paymentProvider, 'Order amount, order reference, and the payment details you enter directly with them.', 'Processing card, UPI, net-banking and wallet payments.'],
          ['Our email provider (SMTP)', 'Your email address, subject line and the rendered report.', 'Delivering the daily report and transactional notices.'],
          ['Our hosting provider', 'Encrypted storage of the application and its datastore.', 'Running the service.'],
        ] },
        { type: 'p', text: 'We do not sell, rent or trade personal data, and we do not share it with advertisers, data brokers or astrologers outside the service. We disclose data to a public authority only where a valid, written and legally binding order requires it, and we record every such disclosure.' },

        { type: 'h', text: 'How long we keep things' },
        { type: 'dl', items: [
          ['Anonymous forecast inputs', 'Not retained. Discarded when the request completes.'],
          ['Active subscription records', 'For as long as the subscription is active.'],
          ['Cancelled subscriptions', 'Marked cancelled immediately; the record and birth details are erased within 30 days unless a payment dispute is open.'],
          ['Payment and invoice records', 'Retained for eight years as required by Indian tax and accounting rules. These hold the transaction, not your birth chart.'],
          ['Support correspondence', 'Twelve months from the last message in the thread.'],
          ['Rate-limiting counters', 'Held in memory for a rolling one-minute to fifteen-minute window and never persisted.'],
        ] },

        { type: 'h', text: 'Security measures' },
        { type: 'ul', items: [
          'HTTPS with HSTS enforced in production.',
          'A strict Content Security Policy, frame denial, and MIME-sniffing protection on every response.',
          'Per-endpoint rate limits on calculation, checkout, payment verification and search.',
          'Server-side signature verification on every Razorpay payment and webhook before a subscription is activated.',
          'Request body size caps and recursive input sanitisation, including prototype-pollution key rejection.',
          'The administrator control room sits on a private route, requires a separate credential and issues a short-lived signed session cookie.',
        ] },
        { type: 'p', text: 'No system is perfectly secure. If a breach affects your personal data we will notify affected subscribers and the relevant authority without undue delay, describing what happened and what to do about it.' },

        { type: 'h', text: 'Your choices' },
        { type: 'p', text: `You can ask for a copy of your data, correct it, have it deleted, or object to a particular use. Write to ${id.privacyEmail} from the address on the subscription, or open the management link in any report email. A detailed description of each right and how we verify requests is on the data rights page.` },

        { type: 'h', text: 'Children' },
        { type: 'p', text: `${id.brand} is not directed at children and we do not knowingly hold data from anyone under 18. A parent or guardian may enter a child\u2019s birth details for a family reading; the account, payment and contact details must belong to the adult. If you believe a child has submitted data directly, write to ${id.privacyEmail} and we will remove it.` },

        { type: 'h', text: 'International transfers' },
        { type: 'p', text: 'Our primary infrastructure is in India. Where a processor stores data outside India, the transfer is covered by contractual safeguards that require an equivalent level of protection.' },

        { type: 'h', text: 'Changes to this policy' },
        { type: 'p', text: `Material changes are announced on this page with a new effective date and, for active subscribers, by email at least seven days before they take effect. The current version is effective from ${date}.` },
      ],
    },

    {
      slug: 'terms',
      group: 'legal',
      nav: 'Terms & Conditions',
      title: 'Terms & Conditions',
      description: `The agreement between you and ${id.legalName} covering use of ${id.brand}, subscriptions, payments and acceptable use.`,
      updated: date,
      lede: `These terms govern your use of ${id.brand}. Using the site means you accept them. They are written to be read, not to be skipped.`,
      blocks: [
        { type: 'h', text: '1. Who you are contracting with' },
        { type: 'p', text: `${id.brand} is operated by ${id.legalName} ("we", "us"). "You" means anyone who opens the site, runs a calculation or buys a subscription. Address: ${address}.` },

        { type: 'h', text: '2. What the service is' },
        { type: 'p', text: 'We compute astronomical quantities \u2014 planetary longitudes, ascendant, Dasha periods, Panchang limbs and similar \u2014 from the birth details you supply, then apply traditional Jyotish rules drawn from classical sources to produce an interpretation. The astronomical part is deterministic arithmetic. The interpretive part is tradition, not science.' },

        { type: 'h', text: '3. Nature of the guidance' },
        { type: 'p', text: 'Everything interpretive on this site is provided for personal reflection and cultural interest. It is not a prediction of fact and not professional advice. The disclaimer page forms part of these terms and you should read it before acting on anything you find here.' },

        { type: 'h', text: '4. Eligibility' },
        { type: 'p', text: 'You must be at least 18 years old and able to enter a binding contract to buy a subscription. If you enter someone else\u2019s birth details, you confirm that you are entitled to do so and that you will handle the resulting report responsibly.' },

        { type: 'h', text: '5. Accuracy of what you enter' },
        { type: 'p', text: 'A chart is only as accurate as its birth time and place. An error of a few minutes can change the ascendant and every house-based reading that follows. We calculate faithfully from what you give us and cannot be responsible for a reading built on incorrect inputs. Correct details from the management link and the next report will use them.' },

        { type: 'h', text: '6. Subscriptions, billing and renewal' },
        { type: 'ul', items: [
          'Plans, prices and billing periods are shown on the pricing page. Prices are in Indian Rupees and include applicable taxes unless stated otherwise.',
          'A subscription activates only after the payment gateway confirms a captured payment and our server verifies its signature.',
          'Each term is charged upfront for the period you chose. A subscription does not auto-charge a new term unless the plan explicitly says so at checkout.',
          'Delivery is a daily report at approximately 07:00 in the subscriber\u2019s local time for the topics selected at checkout.',
          'We may change prices for future terms. Existing paid terms are never repriced, and price changes are announced before your next renewal.',
        ] },

        { type: 'h', text: '7. Cancellation and refunds' },
        { type: 'p', text: 'You can cancel at any time from the management link in any report email or from the track order page. Refund eligibility, the cooling-off window and the process are set out in full on the refund policy page, which forms part of these terms.' },

        { type: 'h', text: '8. Acceptable use' },
        { type: 'p', text: 'You agree not to:' },
        { type: 'ul', items: [
          'Scrape, crawl or bulk-extract calculations, the reference library or the dataset, or defeat the rate limits.',
          'Resell, sublicense or republish reports or reference content as your own service.',
          'Probe, load-test or attempt to gain unauthorised access to any part of the system, including the administrator route.',
          'Submit another person\u2019s personal data without a lawful basis for doing so.',
          'Use the service to harass, defraud or frighten anyone \u2014 including using a reading to pressure someone about marriage, health or money.',
          'Upload content that is unlawful, defamatory, obscene or infringes someone else\u2019s rights.',
        ] },
        { type: 'p', text: 'We may rate-limit, suspend or terminate access where these rules are broken, and will refund the unused portion of a paid term unless the breach was fraudulent.' },

        { type: 'h', text: '9. Intellectual property' },
        { type: 'p', text: `The calculation engine, interpretive rule sets, page design, brand and compiled datasets are owned by ${id.legalName} or licensed to it. Classical Sanskrit sources quoted in the reference library are in the public domain; our selection, translation, arrangement and commentary are not. The report generated from your birth details is yours to keep, print and share privately.` },

        { type: 'h', text: '10. Third-party services' },
        { type: 'p', text: `Payments are handled by ${id.paymentProvider} under their own terms and privacy policy. Some astronomy pages surface public feeds from external providers. We are not responsible for third-party availability or content, though we choose them carefully.` },

        { type: 'h', text: '11. Availability' },
        { type: 'p', text: 'We aim for continuous availability but do not guarantee it. Planned maintenance is announced in advance where practical. Sustained unavailability that prevents delivery of a paid subscription is handled as described in the refund policy.' },

        { type: 'h', text: '12. Limitation of liability' },
        { type: 'p', text: 'To the maximum extent permitted by law, we are not liable for any decision you take on the basis of an interpretation, nor for indirect, incidental or consequential loss. Where liability cannot be excluded, it is limited to the amount you paid us in the twelve months before the claim arose. Nothing here limits liability for fraud, death or personal injury caused by negligence, or anything else that cannot lawfully be limited.' },

        { type: 'h', text: '13. Indemnity' },
        { type: 'p', text: 'You agree to indemnify us against claims arising from your misuse of the service, your breach of these terms, or your submission of another person\u2019s data without the right to do so.' },

        { type: 'h', text: '14. Changes to these terms' },
        { type: 'p', text: 'We may update these terms. Material changes take effect no less than seven days after they are published here, and active subscribers are notified by email. Continuing to use the service after that date means you accept the revision.' },

        { type: 'h', text: '15. Governing law and disputes' },
        { type: 'p', text: `These terms are governed by ${id.governingLaw}, and the parties submit to the exclusive jurisdiction of ${id.jurisdiction}. Before filing anything, please write to ${id.grievanceEmail}: almost every dispute we have seen was a billing mismatch that took one email to fix.` },

        { type: 'h', text: '16. Contact' },
        { type: 'p', text: `${id.legalName} \u2014 ${id.supportEmail}. Grievances: ${id.grievanceEmail}.` },
      ],
    },

    {
      slug: 'disclaimer',
      group: 'legal',
      nav: 'Disclaimer',
      title: 'Disclaimer',
      description: 'What Jyotish guidance on this site is, what it is not, and the decisions you should never base on it.',
      updated: date,
      lede: 'We would rather lose a sale than have someone delay medical treatment or make a financial decision because of a planetary reading. This page is written plainly for that reason.',
      blocks: [
        { type: 'note', tone: 'warn', title: 'Read this first', text: 'Nothing on this site is medical, psychological, legal, financial or investment advice. No interpretation here is a statement of fact about the future. If you are unwell, in debt, in danger or in distress, speak to a qualified professional \u2014 a planetary period is not a treatment plan.' },

        { type: 'h', text: 'Two different kinds of output' },
        { type: 'p', text: 'It matters which part of a page you are reading.' },
        { type: 'dl', items: [
          ['Calculated quantities', 'Planetary longitudes, ascendant degree, nakshatra and pada, Dasha boundaries, tithi, sunrise and sunset, and similar values. These follow published astronomical algorithms and are reproducible: run the same inputs, get the same numbers. Small differences against another program usually come from a different ayanamsa or a different house system, and we label which one was used.'],
          ['Traditional interpretation', 'What a placement is said to signify, whether a period is favourable for a life area, remedial suggestions, compatibility scores, muhurta judgements. These come from classical rule sets. They are cultural tradition applied consistently, not empirical findings.'],
        ] },

        { type: 'h', text: 'Scientific standing' },
        { type: 'p', text: 'Astrology has not been shown, in controlled research, to predict individual life outcomes. We do not claim otherwise, and you should be sceptical of any service that does. What we can honestly claim is that our astronomy is accurate, our rule application is consistent and traceable, and we tell you which classical source a statement came from.' },

        { type: 'h', text: 'Do not use this service for' },
        { type: 'ul', items: [
          'Deciding whether to start, stop, delay or change any medical treatment, medication, therapy or surgery.',
          'Diagnosing a condition in yourself or anyone else.',
          'Investment, trading, lending, business-valuation or tax decisions.',
          'Legal strategy, or deciding whether to sign, settle or litigate.',
          'Deciding whether a person is suitable to marry, employ, trust or avoid. A compatibility score is a traditional index, not an assessment of a human being.',
          'Anything involving a safety risk to you or to another person.',
        ] },

        { type: 'h', text: 'Remedies' },
        { type: 'p', text: 'Gemstone, mantra, yantra, rudraksha, fasting and charity suggestions are recorded from classical and devotional sources as part of the tradition. They are not treatments, they have no tested effect on physical or financial outcomes, and they should never replace medical care. Never fast or change your diet on the strength of a remedy if you are pregnant, diabetic, underweight, taking medication or managing any health condition. Gemstones are expensive; nobody at HoraSaar will ever contact you to sell you one.' },

        { type: 'h', text: 'Accuracy of calculations' },
        { type: 'p', text: 'We use established ephemeris methods and correct for nutation and delta-T, but any software has a tolerance. Do not rely on our numbers for navigation, aviation, surveying, scientific research or any safety-critical purpose.' },

        { type: 'h', text: 'Third-party and external content' },
        { type: 'p', text: 'Some pages surface public astronomy feeds and quote classical texts held by third parties. We do not control those sources and cannot warrant their accuracy or availability. External links are not endorsements.' },

        { type: 'h', text: 'No practitioner relationship' },
        { type: 'p', text: 'Reading this site does not create a consultation, professional or advisory relationship. We do not know your circumstances, and an automated reading cannot take them into account the way a person sitting across from you can.' },

        { type: 'h', text: 'If you are struggling' },
        { type: 'p', text: 'Astrology can be absorbing, and a difficult reading can weigh on you. If you are anxious, hopeless or thinking about harming yourself, please reach out to someone today \u2014 a doctor, a counsellor, a trusted person, or a local helpline. In India, Tele-MANAS can be reached on 14416. You deserve real support, and no planetary period changes that.' },

        { type: 'h', text: 'Questions' },
        { type: 'p', text: `If anything on the site reads as a stronger claim than this page allows, that is a bug in our wording and we want to know. Write to ${id.supportEmail}.` },
      ],
    },

    {
      slug: 'cookie-policy',
      group: 'legal',
      nav: 'Cookie Policy',
      title: 'Cookie Policy',
      description: `Every cookie and browser storage key ${id.brand} sets, what it holds, and how long it lasts.`,
      updated: date,
      lede: 'We use three cookies and three local-storage keys. None of them tracks you across other websites, and none of them is sold to anyone. Here is the complete list.',
      blocks: [
        { type: 'note', tone: 'info', title: 'No advertising, no cross-site tracking', text: 'There is no Google Analytics, no advertising pixel, no social-media tracker and no third-party script on any public page except the payment gateway\u2019s checkout, which loads only when you start a payment.' },

        { type: 'h', text: 'Cookies we set' },
        { type: 'table', head: ['Name', 'Type', 'Purpose', 'Lifetime'], rows: [
          ['hs_consent', 'Strictly necessary', 'Records that you answered the cookie notice so it is not shown again on every page.', '6 months'],
          ['jv_admin_session', 'Strictly necessary', 'Signed session for the private administrator control room. Only ever set after an administrator signs in. Ordinary visitors never receive it.', '8 hours, or until sign-out'],
          ['__cf / rzp_* (by the payment gateway)', 'Strictly necessary', 'Set by Razorpay inside its own checkout to keep the payment session secure. Governed by Razorpay\u2019s cookie policy.', 'Set and cleared by Razorpay'],
        ] },

        { type: 'h', text: 'Browser storage we use' },
        { type: 'p', text: 'These are localStorage entries, not cookies. They stay on your device, are never sent to our server, and you can clear them at any time from your browser settings.' },
        { type: 'table', head: ['Key', 'What it holds', 'Why'], rows: [
          ['jv-locale', 'Your chosen interface language code, e.g. "hi".', 'So the site opens in your language next time.'],
          ['jv-theme', '"light" or "dark".', 'So the site opens in the appearance you chose.'],
          ['hs-cart', 'The plan and topics you selected before checkout.', 'So a half-finished checkout survives a page reload.'],
        ] },

        { type: 'h', text: 'What we deliberately do not do' },
        { type: 'ul', items: [
          'We do not set analytics or advertising cookies, so there is nothing to opt out of.',
          'We do not fingerprint your device or browser.',
          'We do not store your birth details in a cookie or in browser storage.',
          'We do not share any cookie value with a third party.',
        ] },

        { type: 'h', text: 'Managing cookies' },
        { type: 'p', text: 'Every browser lets you block or delete cookies, usually under Settings \u2192 Privacy. Blocking the strictly necessary cookies will not break the public site \u2014 you will simply see the cookie notice again on each visit, and administrators will not be able to sign in. Clearing localStorage resets your language and theme to the defaults.' },

        { type: 'h', text: 'Changes' },
        { type: 'p', text: `If we ever add a cookie, this table is updated before the cookie ships, and the notice is shown again. Questions: ${id.privacyEmail}.` },
      ],
    },

    {
      slug: 'data-rights',
      group: 'legal',
      nav: 'Your Data Rights',
      title: 'Your Data Rights — GDPR, CCPA & India DPDP',
      description: 'Exercise your access, correction, deletion, portability and objection rights, and see how we verify and answer a request.',
      updated: date,
      lede: 'Whichever law applies to you, the practical route is the same: write to us from the email address on your subscription, tell us what you want, and we will do it within the statutory window.',
      blocks: [
        { type: 'h', text: 'How to make a request' },
        { type: 'ol', items: [
          `Email ${id.privacyEmail} from the address on your subscription, or use the contact form and choose "Privacy request".`,
          'Say which right you are exercising \u2014 access, correction, deletion, portability, objection or restriction.',
          'If you are writing from a different address, include your subscription ID or the management link from a report email so we can verify you.',
          'We acknowledge within 72 hours and complete the request within 30 days. Complex requests may take up to 60 days; we will tell you before the first 30 days are up.',
        ] },
        { type: 'note', tone: 'info', title: 'No charge, no retaliation', text: 'Exercising a right is free and never affects your price, your plan or the quality of your reports. We may charge a reasonable fee only for a manifestly excessive repeat request, and we will tell you before doing so.' },

        { type: 'h', text: 'Your rights in detail' },
        { type: 'dl', items: [
          ['Access', 'A copy of the personal data we hold about you, the purposes, the recipients and the retention period. Delivered as a machine-readable JSON file plus a plain-language summary.'],
          ['Correction', 'Fix inaccurate data. Birth time and place are the ones that matter most \u2014 a correction changes every subsequent report.'],
          ['Erasure', 'Deletion of your subscription record and birth details. Payment and tax records are retained for the statutory period because the law requires it; they contain the transaction, not your chart.'],
          ['Portability', 'Your data in a structured, commonly used, machine-readable format, transmitted to you or, where technically feasible, to another controller.'],
          ['Objection and restriction', 'Object to processing based on legitimate interest, or ask us to hold processing while a dispute is resolved.'],
          ['Withdraw consent', 'Withdraw consent at any time where processing relies on it. Withdrawal does not undo processing already carried out lawfully.'],
          ['Human review', 'We use no automated decision-making that produces legal or similarly significant effects. An astrological interpretation is content, not a decision about you.'],
        ] },

        { type: 'h', text: 'If the GDPR applies to you' },
        { type: 'p', text: `Residents of the EEA and the UK have the rights above under Articles 15\u201322 of the GDPR. You also have the right to complain to your national supervisory authority. Where we rely on legitimate interest, we have carried out a balancing assessment and will share its conclusion on request. Our privacy contact is ${id.privacyEmail}${id.dataProtectionOfficer ? ` (${id.dataProtectionOfficer})` : ''}.` },

        { type: 'h', text: 'If you are a California resident' },
        { type: 'p', text: 'Under the CCPA as amended by the CPRA you may ask what categories of personal information we collected in the last 12 months, the sources, the business purpose and the categories of third parties involved; ask for deletion; ask for correction; and limit the use of sensitive personal information.' },
        { type: 'note', tone: 'info', title: 'We do not sell or share your personal information', text: 'We have not sold or shared personal information for cross-context behavioural advertising in the preceding twelve months, and we do not do so now. There is therefore no "Do Not Sell or Share" mechanism to operate \u2014 the answer is already no. We do not use or disclose sensitive personal information for any purpose beyond providing the service you asked for.' },

        { type: 'h', text: 'If you are in India' },
        { type: 'p', text: `Under the Digital Personal Data Protection Act, 2023 you may access a summary of your data and our processing, seek correction or erasure, nominate another person to exercise your rights if you are incapacitated or die, and raise a grievance. Grievances go to ${id.grievanceEmail}${id.grievanceOfficer ? ` (Grievance Officer: ${id.grievanceOfficer})` : ''} and are answered within 30 days. If you are not satisfied you may approach the Data Protection Board of India.` },

        { type: 'h', text: 'Verification' },
        { type: 'p', text: 'We verify a request by matching the requesting email to the subscription record, or by the private management token issued at checkout. We will not ask you for a government ID, and we will never ask for a password \u2014 the public service has none. If we cannot verify you we will say so rather than release data to the wrong person.' },

        { type: 'h', text: 'Authorised agents' },
        { type: 'p', text: 'An agent may act for you with written authorisation, which we will ask you to confirm directly before acting.' },
      ],
    },

    {
      slug: 'copyright',
      group: 'legal',
      nav: 'Copyright & DMCA',
      title: 'Copyright Notice & DMCA Policy',
      description: `What ${id.brand} owns, what you may reuse, and how to report content that infringes your rights.`,
      updated: date,
      lede: 'Classical Jyotish is a shared inheritance. Our compilation, code and commentary are not. This page draws the line and explains how to report a mistake on either side of it.',
      blocks: [
        { type: 'h', text: 'What we claim' },
        { type: 'p', text: `\u00A9 ${id.founded}\u2013${new Date().getUTCFullYear()} ${id.legalName}. All rights reserved in the calculation engine, the interpretive rule sets, the curated datasets, the page design and the ${id.brand} name and mark.` },

        { type: 'h', text: 'What we do not claim' },
        { type: 'ul', items: [
          'The underlying Sanskrit texts \u2014 Brihat Parashara Hora Shastra, Jataka Parijata, Phaladeepika, Saravali and the rest \u2014 are in the public domain, and we claim nothing over the originals.',
          'Astronomical algorithms from published scientific literature belong to their authors and to the public record.',
          'Common Jyotish terminology, traditional planetary attributions and well-known mantras are cultural heritage, not our property.',
        ] },
        { type: 'p', text: 'Our selection, arrangement, translation, structuring into machine-readable rules and accompanying commentary are original work and are protected as a compilation.' },

        { type: 'h', text: 'What you may do without asking' },
        { type: 'ul', items: [
          'Keep, print and privately share the report generated from your own birth details.',
          'Quote a short passage from a public page for review, teaching, research or news, with attribution and a link.',
          'Link to any public page.',
        ] },

        { type: 'h', text: 'What needs written permission' },
        { type: 'ul', items: [
          'Republishing pages, datasets or rule sets in whole or in substantial part.',
          'Scraping or bulk-downloading the reference library, calculators or predictions.',
          'Using our output to train, fine-tune or evaluate a machine-learning model.',
          'Any commercial redistribution, including inside another app or a paid newsletter.',
        ] },
        { type: 'p', text: `Licensing enquiries are welcome at ${id.legalEmail}. We say yes more often than you would expect, especially for teaching.` },

        { type: 'h', text: 'Reporting infringement to us' },
        { type: 'p', text: `If you own rights in something published here, write to ${id.legalEmail} with the subject "Copyright notice" and include:` },
        { type: 'ol', items: [
          'Your name, postal address, email and, if you are acting for the owner, your authority to act.',
          'Identification of the work you say is infringed.',
          'The exact URL and a description of the material on our site you want removed.',
          'A statement that you believe in good faith that the use is not authorised by the owner, its agent or the law.',
          'A statement that the information is accurate, and \u2014 under penalty of perjury \u2014 that you are the owner or authorised to act for them.',
          'Your physical or electronic signature.',
        ] },
        { type: 'p', text: 'We acknowledge within two working days, remove or disable clearly infringing material expeditiously while we investigate, and notify whoever posted it. Repeat infringers lose access.' },

        { type: 'h', text: 'Counter-notice' },
        { type: 'p', text: `If your material was removed and you believe that was a mistake or a misidentification, send a counter-notice to ${id.legalEmail} with your contact details, identification of the removed material and its former location, a statement under penalty of perjury that you hold that good-faith belief, and your consent to jurisdiction. We will forward it to the complainant and may restore the material after 10 working days unless they tell us they have filed suit.` },

        { type: 'h', text: 'Misuse of this process' },
        { type: 'p', text: 'Knowingly filing a false notice or counter-notice can make you liable for damages and costs. Please be sure before you file.' },
      ],
    },

    {
      slug: 'security',
      group: 'legal',
      nav: 'Security & Disclosure',
      title: 'Security & Responsible Disclosure',
      description: 'How the service is secured and how to report a vulnerability safely.',
      updated: date,
      lede: 'If you have found a security problem, we want to hear from you before anyone else does. This page tells you how to report it and what we promise in return.',
      blocks: [
        { type: 'h', text: 'Reporting a vulnerability' },
        { type: 'p', text: `Email ${id.securityEmail} with a description, the steps to reproduce, and the impact you think it has. Please do not open a public issue or post it on social media before we have had a chance to fix it.` },
        { type: 'dl', items: [
          ['Acknowledgement', 'Within 2 working days.'],
          ['Initial assessment', 'Within 7 days, with a severity rating and a target fix date.'],
          ['Fix and disclosure', 'Critical issues are patched as a priority. We will credit you publicly if you want the credit, and stay quiet if you do not.'],
        ] },

        { type: 'h', text: 'Safe harbour' },
        { type: 'p', text: 'We will not pursue legal action against research carried out in good faith under these rules: test only against your own data, do not access or modify anyone else\u2019s records, do not run denial-of-service or volumetric tests, do not use social engineering against our staff or vendors, and stop as soon as you have demonstrated the issue.' },

        { type: 'h', text: 'Out of scope' },
        { type: 'ul', items: [
          'Reports generated solely by an automated scanner with no demonstrated impact.',
          'Missing hardening headers that carry no exploitable consequence on this architecture.',
          'Rate-limit thresholds, unless you can show a practical bypass.',
          'Vulnerabilities in the payment gateway itself \u2014 report those to the provider, and tell us so we can track them.',
          'Social engineering, physical access and third-party services we do not control.',
        ] },

        { type: 'h', text: 'How the service is defended' },
        { type: 'ul', items: [
          'HTTPS with HSTS in production, and a restrictive Content Security Policy that allows only the payment gateway as an external origin.',
          'All request bodies are size-capped and recursively sanitised, with prototype-pollution keys rejected outright.',
          'Per-endpoint rate limits protect calculation, checkout, payment verification, search and administrator sign-in.',
          'Razorpay payment signatures and webhook signatures are verified server-side, and the order amount and currency are re-checked against the stored subscription before activation.',
          'The administrator area is on a private route, is excluded from robots.txt, and uses a short-lived signed session cookie.',
          'Static assets are served from a fixed directory with traversal sequences rejected.',
        ] },
        { type: 'p', text: 'We do not currently run a paid bounty programme. We do write back to every genuine report.' },
      ],
    },

    {
      slug: 'accessibility',
      group: 'legal',
      nav: 'Accessibility',
      title: 'Accessibility Statement',
      description: `How ${id.brand} works with screen readers, keyboards and reduced-motion settings, and how to report a barrier.`,
      updated: date,
      lede: 'We target WCAG 2.1 Level AA. Some of it we have reached, some of it we are still working on, and we would rather tell you which is which.',
      blocks: [
        { type: 'h', text: 'What already works' },
        { type: 'ul', items: [
          'Full keyboard navigation, with a visible focus ring on every interactive element and Escape closing menus and dialogs.',
          'Semantic landmarks, headings and labelled form fields, so screen readers can navigate by structure.',
          'Live status regions that announce calculation results and form outcomes without a page reload.',
          'A dark theme and text that reflows without loss of content at 200% zoom and on narrow screens.',
          'Respect for the operating system\u2019s reduced-motion preference \u2014 animations and the loading spinner stop when you ask for less motion.',
          'Language and direction attributes update with the interface language, including right-to-left support for Urdu.',
        ] },

        { type: 'h', text: 'Known gaps' },
        { type: 'ul', items: [
          'Some dense calculation tables scroll horizontally on very small screens.',
          'A few reference entries mix Sanskrit and English in one paragraph, which can confuse a screen reader\u2019s pronunciation.',
          'Chart diagrams are rendered as SVG with a text summary; the summary is shorter than we would like for complex charts.',
        ] },
        { type: 'p', text: 'These are on the backlog, not forgotten.' },

        { type: 'h', text: 'Tell us about a barrier' },
        { type: 'p', text: `Write to ${id.supportEmail} with the page address, what you were trying to do, and the assistive technology and browser you use. We aim to respond within ${id.responseTarget} and will offer the information in another format while we fix the underlying issue.` },
      ],
    },
  ];
}
