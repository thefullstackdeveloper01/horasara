/**
 * Trust and informational pages. The contact, feedback and careers pages carry
 * a `widget` block that the client script hydrates into a working form posting
 * to /api/contact or /api/feedback.
 */
export function companyPages({ id, date, address }) {
  return [
    {
      slug: 'about',
      group: 'company',
      nav: 'About Us',
      title: `About ${id.brand}`,
      description: `Why ${id.brand} exists, how it is built, and the line it refuses to cross between calculation and claim.`,
      updated: date,
      lede: `${id.brand} was built out of frustration with two kinds of astrology website: the ones that bury you in numbers you cannot read, and the ones that promise certainty they cannot possibly have.`,
      blocks: [
        { type: 'h', text: 'The problem we started with' },
        { type: 'p', text: 'Open most Jyotish sites and you get one of two experiences. Either a wall of degrees, divisional charts and Sanskrit abbreviations that only a practising astrologer can read, or a soothing paragraph that could apply to anyone, sitting next to a button selling a gemstone. Neither tells an ordinary person what they actually came to find out: what is happening in my life right now, when does it shift, and where does that reading come from?' },

        { type: 'h', text: 'What we built instead' },
        { type: 'p', text: 'HoraSaar computes the astronomy first and properly \u2014 planetary longitudes from a VSOP87-derived ephemeris, nutation and delta-T corrections, ayanamsa of your choosing, ascendant from local sidereal time, and the full Vimshottari and related Dasha trees. Then it applies classical interpretive rules to that chart and writes the result as timing: which windows are favourable for the life area you chose, which are difficult, and why.' },
        { type: 'p', text: 'The technical layer is always available if you want it, and never forced on you if you do not.' },

        { type: 'h', text: 'What we will not do' },
        { type: 'cards', items: [
          { title: 'No fear selling', text: 'We will never tell you that something terrible is coming and that a remedy we sell will prevent it. We do not sell gemstones, pujas or consultations, and nobody from HoraSaar will phone you.' },
          { title: 'No false certainty', text: 'Interpretations are labelled as traditional rule-based guidance, not established fact. Where a classical source disagrees with another, we say so instead of picking the more dramatic one.' },
          { title: 'No data trade', text: 'Birth details are the most personal thing you can give an astrology site. We store them only when a daily subscription requires it, never sell them, and delete them when you leave.' },
          { title: 'No dark patterns', text: 'Cancellation is one link in every email. No retention maze, no "are you sure" loop, no hidden auto-renewal.' },
        ] },

        { type: 'h', text: 'How it is built' },
        { type: 'dl', items: [
          ['Calculation', 'A deterministic engine: the same inputs always produce the same chart, and every reported value is reproducible against published algorithms.'],
          ['Interpretation', 'Rule sets compiled from classical texts into machine-readable datasets, with the source recorded alongside each rule so a reading can be traced back to where it came from.'],
          ['Validation', 'A large internal test and benchmark suite compares calculated values against reference cases and checks that generated reports stay internally consistent.'],
          ['Privacy', 'The public forecast runs without an account and without storing your details. The service has no user registration at all.'],
        ] },

        { type: 'h', text: 'What we are honest about' },
        { type: 'p', text: 'Astrology has not been demonstrated to predict individual outcomes under controlled conditions. We say that plainly on the disclaimer page rather than hiding it in small print. What we can stand behind is that our astronomy is correct, our rules are applied consistently, and our sources are named. Whether you find meaning in the tradition is your decision, taken with clear information.' },

        { type: 'h', text: 'Who it is for' },
        { type: 'ul', items: [
          'People who grew up with Jyotish in the family and want a reading they can actually read.',
          'Students of astrology who need accurate calculations and traceable classical rules.',
          'Practitioners who want a fast, reliable calculation layer under their own judgement.',
          'Curious sceptics who would like to know what the tradition says, stated without exaggeration.',
        ] },

        { type: 'h', text: 'Where we are going' },
        { type: 'p', text: 'Deeper regional-language coverage, richer Panchang and muhurta tooling, better explanations of why a rule fired, and continued expansion of the classical reference library. Feature requests from subscribers shape the order; the contact page reaches a human.' },

        { type: 'h', text: 'Details' },
        { type: 'dl', items: [
          ['Operated by', id.legalName],
          ['Based in', id.country],
          ['Contact', id.supportEmail],
          ['Address', address],
        ] },
      ],
    },

    {
      slug: 'contact',
      group: 'company',
      nav: 'Contact Us',
      title: 'Contact Us',
      description: `Reach the ${id.brand} team about support, billing, privacy, press, partnerships or a bug.`,
      updated: date,
      lede: `A person reads every message. We aim to reply within ${id.responseTarget}, and faster for billing and delivery problems.`,
      blocks: [
        { type: 'h', text: 'Write to the right desk' },
        { type: 'table', head: ['Topic', 'Address', 'Typical reply'], rows: [
          ['Support, delivery and general questions', id.supportEmail, id.responseTarget],
          ['Billing, refunds and cancellation', id.supportEmail, '1 working day'],
          ['Privacy, data access and deletion', id.privacyEmail, 'Acknowledged in 72 hours'],
          ['Grievances (India DPDP / IT Rules)', id.grievanceEmail, '30 days, usually far sooner'],
          ['Copyright and legal notices', id.legalEmail, '2 working days'],
          ['Security vulnerabilities', id.securityEmail, '2 working days'],
          ['Press and media', id.pressEmail, '2 working days'],
          ['Partnerships and affiliates', id.affiliateEmail, '5 working days'],
          ['Careers', id.careersEmail, 'When a role is open'],
        ] },

        { type: 'h', text: 'Send a message' },
        { type: 'widget', id: 'contact-form' },

        { type: 'h', text: 'Details that help us help you' },
        { type: 'ul', items: [
          'For a billing or delivery problem: your subscription ID or the email address you paid with, and the Razorpay payment ID if you have it.',
          'For a calculation that looks wrong: the birth date, time, place and ayanamsa you used, and what you expected instead.',
          'For a bug: the page address, your browser, and what you were doing when it happened.',
          'Please do not send passwords, card numbers or UPI PINs. We will never ask for them.',
        ] },

        { type: 'h', text: 'Postal and registration' },
        { type: 'dl', items: [
          ['Operated by', id.legalName],
          ['Address', address],
          ...(id.phone ? [['Phone', `${id.phone} \u2014 ${id.supportHours}`]] : []),
          ...(id.gstin ? [['GSTIN', id.gstin]] : []),
          ...(id.cin ? [['CIN', id.cin]] : []),
          ['Support hours', id.supportHours],
        ] },
        { type: 'note', tone: 'info', title: 'We do not cold-call', text: 'Nobody from HoraSaar will ever phone you to warn about a dosha, offer a gemstone or ask for a payment. If you get such a call, it is not us \u2014 please report it to us so we can warn others.' },
      ],
    },

    {
      slug: 'faq',
      group: 'company',
      nav: 'FAQ',
      title: 'Frequently Asked Questions',
      description: 'Answers about accuracy, birth times, subscriptions, refunds, privacy and how the calculations work.',
      updated: date,
      lede: 'If your question is not here, the contact page reaches a person.',
      blocks: [
        { type: 'h', text: 'Using the service' },
        { type: 'faq', items: [
          { q: 'Do I need to create an account?', a: 'No. The public forecast works without registration \u2014 enter your birth details, choose a topic and read the result. An account is never created, and the details from a public forecast are not stored. Only a paid subscription keeps a record, because a daily report cannot be produced without one.' },
          { q: 'I do not know my exact birth time. Can I still use it?', a: 'Partly. Moon sign, nakshatra, Dasha timing and most planetary positions move slowly and remain usable with an approximate time. The ascendant changes roughly every two hours, so the house-based parts of the reading \u2014 and anything derived from them \u2014 become unreliable. Use the closest time you have, treat house-specific statements with caution, and if you find a birth certificate later, update the details from your management link.' },
          { q: 'Which ayanamsa should I choose?', a: 'Lahiri is the standard in India and the default here. True Lahiri applies the current nutation to the same basis. Raman and KP are used by their respective schools, and Fagan-Bradley by Western sidereal astrologers. Pick the one your tradition uses and stay with it \u2014 switching mid-way will shift positions by roughly a degree and can move a planet across a sign boundary.' },
          { q: 'Why does another website show a different chart?', a: 'Almost always one of three reasons: a different ayanamsa, a different house system, or a different interpretation of the birth time zone for historical dates. We label the ayanamsa and house system used on every calculation so you can compare like with like.' },
          { q: 'Which languages are available?', a: 'The interface and forecasts are available in the languages listed in the language menu in the header, including Hindi, Gujarati, Marathi, Bengali, Tamil, Telugu, Kannada, Malayalam, Punjabi and Urdu alongside English. Your choice is remembered on your device.' },
        ] },

        { type: 'h', text: 'Accuracy and honesty' },
        { type: 'faq', items: [
          { q: 'How accurate are the calculations?', a: 'The astronomical layer follows published ephemeris algorithms with nutation and delta-T corrections and is reproducible to a small fraction of a degree for ordinary birth dates. It is not intended for navigation, aviation or scientific work.' },
          { q: 'Is astrology scientifically proven?', a: 'No, and we will not tell you otherwise. Controlled research has not shown that astrology predicts individual life outcomes. What this site does is compute the astronomy correctly and apply classical rules consistently, with the source of each rule recorded. The disclaimer page sets this out in full.' },
          { q: 'Should I make medical or financial decisions from a reading?', a: 'No. Never delay treatment, change medication, or make an investment, legal or marriage decision on the strength of a planetary reading. Speak to a qualified professional. This is the single most important thing on the site.' },
          { q: 'Why does a prediction sometimes feel wrong?', a: 'Traditional rules are general statements applied to a chart; they cannot know your circumstances, and they are not evidence about the future. Treat a reading as a prompt for reflection rather than a forecast of fact.' },
        ] },

        { type: 'h', text: 'Subscriptions and payment' },
        { type: 'faq', items: [
          { q: 'What do I get with a subscription?', a: 'A personalised report by email each day at about 07:00 in your local time, covering the life-area topics you chose, with the day\u2019s favourable and difficult windows and the planetary reasoning behind them.' },
          { q: 'Which payment methods work?', a: `Payments are handled by ${id.paymentProvider}: UPI including GPay, PhonePe and Paytm, credit and debit cards, net banking from major Indian banks, and popular wallets. Card details are entered inside Razorpay\u2019s checkout and never reach our servers.` },
          { q: 'Will I be charged automatically when the term ends?', a: 'Not unless the plan explicitly says so at checkout. Any automatic renewal is stated on the pricing page and in your confirmation email, with the date and amount.' },
          { q: 'How do I cancel?', a: 'Open the management link at the bottom of any report email, or use the track order page with your subscription ID and token, and choose cancel. It takes effect immediately and there is no retention flow to argue with.' },
          { q: 'Can I get a refund?', a: 'Yes, within the cooling-off window described on the refund policy page, and always where we failed to deliver. Refunds return to the original payment method.' },
          { q: 'My payment succeeded but nothing activated.', a: 'This usually means the gateway captured the payment while the confirmation was in flight. It normally resolves within a few minutes as the payment webhook arrives. If it does not, send us the Razorpay payment ID and we will reconcile it manually the same working day.' },
        ] },

        { type: 'h', text: 'Delivery' },
        { type: 'faq', items: [
          { q: 'What time will the report arrive?', a: 'Around 07:00 in the local time of the birth place on your subscription. Mail delivery adds a few minutes at busy times.' },
          { q: 'The report is not arriving.', a: 'Check spam and any promotions tab first, and add our sending address to your contacts. If it is still missing, write to us with the email address on the subscription and we will check the delivery log and resend.' },
          { q: 'Can I change my topics or delivery address?', a: 'Yes, from the management link in any report email. Changes apply from the next day\u2019s report.' },
        ] },

        { type: 'h', text: 'Privacy' },
        { type: 'faq', items: [
          { q: 'What happens to my birth details?', a: 'For a public forecast: computed in memory and discarded when the request finishes. For a subscription: stored so the daily report can be generated, and erased within 30 days of cancellation.' },
          { q: 'Do you sell or share my data?', a: 'No. No sale, no advertising networks, no data brokers, no cross-site tracking. The full list of processors \u2014 the payment gateway, the email provider and the host \u2014 is on the privacy policy page.' },
          { q: 'How do I delete everything you hold about me?', a: `Cancel the subscription and email ${id.privacyEmail} asking for erasure. We confirm within 30 days. Payment records are kept for the statutory period because tax law requires it; they hold the transaction, not your chart.` },
        ] },
      ],
    },

    {
      slug: 'team',
      group: 'company',
      nav: 'Our Team',
      title: 'Our Team',
      description: `The people and disciplines behind ${id.brand}.`,
      updated: date,
      lede: 'A small team. Astronomy and software on one side, classical Jyotish scholarship on the other, and an argument between them whenever the two disagree.',
      blocks: [
        { type: 'note', tone: 'info', title: 'Publishing named profiles', text: `Individual names, photographs and biographies are published here once each person has consented to appear publicly. Until then we describe the roles honestly rather than invent a leadership page. To reach any of these functions, write to ${id.supportEmail} with the area in your subject line.` },

        { type: 'h', text: 'How the work divides' },
        { type: 'cards', items: [
          { title: 'Astronomy & calculation', text: 'Owns the ephemeris layer, ayanamsa handling, nutation and delta-T corrections, house systems and the Dasha engines. Every number the site shows is this team\u2019s responsibility, and a reported discrepancy of even a few arc-minutes gets investigated.' },
          { title: 'Jyotish scholarship', text: 'Reads the classical texts and turns them into machine-readable rules with the source recorded. Decides what to do when Parashara and Phaladeepika disagree \u2014 usually by presenting both rather than choosing.' },
          { title: 'Product & writing', text: 'Turns rule output into language an ordinary reader can use, and enforces the house rule that nothing may be stated more confidently than the evidence allows.' },
          { title: 'Engineering & reliability', text: 'Builds the application, the payment and delivery pipeline and the validation suite, and keeps the daily 07:00 send on time.' },
          { title: 'Support & trust', text: 'Answers every message, handles refunds without argument, and processes privacy requests.' },
        ] },

        { type: 'h', text: 'How we make decisions' },
        { type: 'ul', items: [
          'A calculation change ships only with a test case that would have caught the old behaviour.',
          'An interpretive rule ships only with a named classical source.',
          'If a sentence would read as a guarantee about someone\u2019s future, it gets rewritten before release.',
          'A support complaint about a wrong number outranks whatever was on the roadmap that week.',
        ] },

        { type: 'h', text: 'Working with us' },
        { type: 'p', text: 'We work with independent Jyotish scholars and translators on the reference library, and credit their contributions. If that is your field, the careers page explains how to get in touch.' },
      ],
    },

    {
      slug: 'testimonials',
      group: 'company',
      nav: 'Feedback & Reviews',
      title: 'Feedback & Reviews',
      description: `Share your experience of ${id.brand} and read what other readers have said.`,
      updated: date,
      lede: 'We publish feedback as it is written, including the critical kind. Editing reviews to look better would defeat the point of having them.',
      blocks: [
        { type: 'h', text: 'Leave your feedback' },
        { type: 'widget', id: 'feedback-form' },

        { type: 'h', text: 'What readers have said' },
        { type: 'widget', id: 'testimonial-list' },

        { type: 'h', text: 'How we handle reviews' },
        { type: 'ul', items: [
          'Every submission is read by a person before it appears, to filter spam, abuse and anything that identifies a third party.',
          'We do not edit the substance of a review. We may trim personal data, such as a full name, phone number or subscription ID.',
          'Critical reviews are published alongside favourable ones. We may add a short reply where a factual correction is needed.',
          'We never pay for reviews, never offer a discount in exchange for one, and never post fabricated feedback.',
          'You can withdraw a published review at any time by writing to us with the date you submitted it.',
        ] },
        { type: 'note', tone: 'info', title: 'Please do not include personal details', text: 'Keep birth details, contact numbers and other people\u2019s names out of a public review. If you need us to look into something specific, use the contact page instead \u2014 that stays private.' },
      ],
    },

    {
      slug: 'press',
      group: 'company',
      nav: 'Press & Media',
      title: 'Press & Media Kit',
      description: `Facts, positioning and brand assets for journalists writing about ${id.brand}.`,
      updated: date,
      lede: `Writing about ${id.brand} or about astrology apps generally? Everything here can be quoted, and ${id.pressEmail} reaches us quickly.`,
      blocks: [
        { type: 'h', text: 'Boilerplate' },
        { type: 'note', tone: 'info', title: 'Approved description', text: `${id.brand} is a Jyotish web application that computes birth charts, Dasha timing and Panchang from published astronomical algorithms, then applies classical interpretive rules to produce daily, weekly, monthly and yearly guidance in plain language. It is operated by ${id.legalName} and states openly that the interpretive layer is cultural tradition rather than scientific prediction.` },

        { type: 'h', text: 'Fast facts' },
        { type: 'dl', items: [
          ['Operated by', id.legalName],
          ['Founded', id.founded],
          ['Based in', id.country],
          ['Category', 'Jyotish / Vedic astrology software'],
          ['Model', 'Free public calculations and forecasts; optional paid daily report subscription'],
          ['Accounts', 'None \u2014 the public service requires no registration'],
          ['Payments', `${id.paymentProvider} (UPI, cards, net banking, wallets)`],
          ['Press contact', id.pressEmail],
        ] },

        { type: 'h', text: 'What makes the story different' },
        { type: 'ul', items: [
          'A commercial astrology service that publishes an explicit statement that astrology is not scientifically validated, on its own disclaimer page rather than buried in terms.',
          'A hard separation between deterministic astronomical calculation and traditional interpretation, shown in the interface.',
          'Interpretive rules carry the classical source they came from, so a reading can be traced back to a text.',
          'No gemstone sales, no consultation upsell, no outbound calls \u2014 the failure modes that generate most consumer complaints in this sector.',
          'Anonymous by default: public forecasts store nothing.',
        ] },

        { type: 'h', text: 'Brand assets' },
        { type: 'p', text: 'The wordmark is "HoraSaar", one word, capital H and capital S. The symbol is the \u0950 mark shown in the site header. The primary colour is deep maroon (#7b1e25) with a gold accent (#c68a23). The logo may be reproduced at its original proportions and must not be recoloured, stretched, rotated or placed on a busy background.' },
        { type: 'p', text: `High-resolution logo files and screenshots are sent on request \u2014 email ${id.pressEmail} with your publication, the piece you are writing and your deadline, and we will reply the same or next working day.` },

        { type: 'h', text: 'Interviews and expert comment' },
        { type: 'p', text: 'We can speak on the record about how ephemeris calculation works, how classical rule sets are encoded, how astrology apps are regulated as consumer products in India, and the ethics of selling predictive content. We will not provide a reading about a named public figure, and we will not comment on anyone\u2019s personal chart.' },

        { type: 'h', text: 'Corrections' },
        { type: 'p', text: `If something published about us is factually wrong, write to ${id.pressEmail} and we will supply a documented correction rather than a complaint.` },
      ],
    },

    {
      slug: 'careers',
      group: 'company',
      nav: 'Careers',
      title: 'Careers',
      description: `Roles, the kind of work involved and how hiring runs at ${id.brand}.`,
      updated: date,
      lede: 'A small team where the astronomy has to be right and the writing has to be honest. If both of those appeal to you, read on.',
      blocks: [
        { type: 'h', text: 'Current openings' },
        { type: 'widget', id: 'job-list' },

        { type: 'h', text: 'The kind of work' },
        { type: 'ul', items: [
          'Numerical astronomy and calendar mathematics \u2014 ephemeris accuracy, coordinate transforms, calendrical edge cases and historical time zones.',
          'Classical Jyotish scholarship \u2014 reading Sanskrit sources and turning them into structured, attributable rules.',
          'Backend engineering \u2014 a dependency-light Node.js service, payment and delivery pipelines, and a large validation suite.',
          'Interface and content \u2014 making a technical reading readable in ten languages without overstating it.',
          'Support \u2014 answering people carefully about something they often care about deeply.',
        ] },

        { type: 'h', text: 'How we hire' },
        { type: 'ol', items: [
          'Send your CV or portfolio with a short note about what drew you to the role.',
          'A 30-minute conversation about your background and what the work involves.',
          'A small paid exercise from real work, scoped to a few hours. We pay for it whether or not you are hired.',
          'A conversation about the exercise with the people you would work alongside.',
          'A written offer with the salary, the scope and the expectations spelled out.',
        ] },
        { type: 'p', text: 'We tell you where you stand at every stage, including a no. Nobody is left waiting without an answer.' },

        { type: 'h', text: 'What we offer' },
        { type: 'ul', items: [
          'Remote-first working with flexible hours across Indian time zones.',
          'Small team, direct ownership, no committee between your work and the user.',
          'A budget and time for books, courses and conferences \u2014 particularly for classical study.',
          'Paid leave, festival holidays of your own choosing, and a genuine expectation that you take them.',
        ] },

        { type: 'h', text: 'Equal opportunity' },
        { type: 'p', text: 'We hire on ability and consider every applicant regardless of caste, religion, gender, sexual orientation, disability, age, region or language. Tell us what adjustments you need for the process and we will make them without asking why.' },

        { type: 'h', text: 'Apply' },
        { type: 'p', text: `Write to ${id.careersEmail} with the role in the subject line. Speculative applications are welcome \u2014 tell us what you would want to own and why. We reply to every application from a real person; we do not reply to bulk recruitment-agency mail.` },
      ],
    },
  ];
}
