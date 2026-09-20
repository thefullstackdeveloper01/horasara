/**
 * Content/SEO pages and the technical utility pages. The blog index, sitemap
 * and search results are widget-driven because their content is generated at
 * request time from the article library, the route table and the reference
 * index respectively.
 */
export function resourcePages({ id, date }) {
  return [
    {
      slug: 'blog',
      group: 'resources',
      nav: 'Blog & Articles',
      title: 'Blog & Articles',
      description: 'Guides to reading a chart, understanding Dasha timing, using Panchang and telling good astrology from bad.',
      updated: date,
      lede: 'Long-form explanations of the things people ask us most. No horoscopes, no sales pitch \u2014 just how the system works and how to think about it.',
      blocks: [
        { type: 'widget', id: 'blog-index' },
        { type: 'h', text: 'How we write these' },
        { type: 'ul', items: [
          'Every technical claim is checked against the calculation engine before publication.',
          'Classical statements name the text they came from.',
          'Where a tradition is disputed, we present the disagreement instead of picking the tidier answer.',
          'Nothing is written to sell a subscription. If an article ends without a call to action, that is deliberate.',
        ] },
      ],
    },

    {
      slug: 'community',
      group: 'resources',
      nav: 'Community',
      title: 'Community & Discussion',
      description: `How ${id.brand} readers, students and practitioners can ask questions and contribute corrections.`,
      updated: date,
      lede: 'We have deliberately not launched an open forum yet, and this page explains why, and how to reach the community work we do run.',
      blocks: [
        { type: 'note', tone: 'info', title: 'Why no open forum yet', text: 'An unmoderated astrology forum turns into a marketplace within weeks \u2014 strangers offering paid readings, gemstone sellers, and people frightening each other about doshas. We will not open one until we can moderate it properly. That is a staffing question, not a technical one.' },

        { type: 'h', text: 'What you can join today' },
        { type: 'cards', items: [
          { title: 'Corrections and source review', text: 'Spotted a rule attributed to the wrong text, a mistranslation or a calculation that disagrees with your own working? Send it with the reference and we will investigate. Accepted corrections are credited on the changelog.', href: '/contact' },
          { title: 'Reader feedback', text: 'Public reviews of the service, published as written, including critical ones.', href: '/testimonials' },
          { title: 'Article requests', text: 'Tell us what you want explained. Most of the blog exists because somebody asked.', href: '/blog' },
          { title: 'Scholar collaboration', text: 'Working on classical sources or regional traditions? We work with independent scholars and translators on the reference library.', href: '/careers' },
        ] },

        { type: 'h', text: 'House rules, for when we do open discussion' },
        { type: 'ul', items: [
          'No paid readings, no gemstone or puja sales, and no soliciting anyone privately.',
          'No predicting death, terminal illness or disaster for a named person. Ever.',
          'No posting someone else\u2019s birth details without their permission.',
          'Disagree with a chart reading, not with the person reading it.',
          'Name your source when you assert a classical rule.',
          'Anyone frightening a stranger into paying for a remedy is removed permanently on the first instance.',
        ] },

        { type: 'h', text: 'A note on asking for readings' },
        { type: 'p', text: 'People often arrive frightened \u2014 about a marriage, an illness, a court case, a job. If that is you, please talk to a doctor, a lawyer or a counsellor about the actual problem first. Astrology is not an emergency service, and nobody here can tell you what will happen. If you are in distress, please contact a local helpline today; in India, Tele-MANAS is available on 14416.' },
      ],
    },

    {
      slug: 'affiliates',
      group: 'resources',
      nav: 'Affiliate & Partners',
      title: 'Affiliate & Partner Programme',
      description: `Terms for referring readers to ${id.brand}, and the promotional practices we refuse to allow.`,
      updated: date,
      lede: 'We run a small referral programme with unusually strict rules, because most of the harm in this industry is done by affiliates rather than by the services themselves.',
      blocks: [
        { type: 'h', text: 'How it works' },
        { type: 'ol', items: [
          `Apply at ${id.affiliateEmail} with your site, channel or newsletter and how you intend to promote the service.`,
          'Approved partners get a tracked referral link and a dashboard-free monthly statement by email.',
          'A commission is earned on the first paid term of each new subscriber you refer, after the 7-day cooling-off period closes.',
          'Commission rates and the attribution window are set out in your partner agreement. Payouts are monthly in INR, subject to a minimum balance and applicable TDS.',
        ] },

        { type: 'h', text: 'Who we approve' },
        { type: 'ul', items: [
          'Astrology educators, writers and YouTubers who teach rather than frighten.',
          'Practising astrologers who want a reliable calculation layer for their clients.',
          'Publications and newsletters with a genuine audience and an honest disclosure practice.',
          'Developers integrating our calculators into their own product under licence.',
        ] },

        { type: 'h', text: 'Prohibited promotion' },
        { type: 'note', tone: 'warn', title: 'Immediate termination, commission forfeited', text: 'These are not warnings. Any one of them ends the partnership and voids unpaid commission.' },
        { type: 'ul', items: [
          'Fear-based marketing \u2014 claiming a reader faces death, disease, divorce, bankruptcy or a curse that our reports will avert.',
          'Guaranteeing outcomes, accuracy percentages or "100% true predictions".',
          'Presenting astrology as scientifically proven, or citing research that does not exist.',
          'Cold calling, unsolicited SMS or WhatsApp broadcasts, and any spam.',
          'Bidding on our brand name in paid search, or running ads that impersonate us.',
          'Cookie stuffing, forced clicks, typosquatting or any undisclosed redirect.',
          'Promoting alongside gemstone, puja or remedy sales that imply our endorsement.',
          'Targeting minors, or anyone in visible medical or financial crisis.',
          'Failing to disclose the commercial relationship as advertising law requires.',
        ] },

        { type: 'h', text: 'What you may say about us' },
        { type: 'p', text: 'Use the approved description on the press page. You may say the calculations are deterministic and reproducible. You may not say the predictions are proven, validated or guaranteed \u2014 our own disclaimer says the opposite, and a partner claiming more than the service claims is a liability for both of us.' },

        { type: 'h', text: 'Brand use' },
        { type: 'p', text: 'The logo may be used unmodified to identify the service. Do not alter the colours or proportions, do not imply we endorse your other products, and do not register domains, handles or app names containing our brand.' },

        { type: 'h', text: 'Ending the partnership' },
        { type: 'p', text: 'Either side may end it at any time with written notice. Commission already earned on completed, non-refunded terms is paid out at the next cycle. Commission on a subscription that is refunded or charged back is reversed.' },
      ],
    },

    {
      slug: 'sitemap',
      group: 'resources',
      nav: 'Sitemap',
      title: 'Sitemap',
      description: `Every public page on ${id.brand}, grouped by section.`,
      updated: date,
      lede: 'The human-readable index. Search engines should use the XML sitemap instead.',
      blocks: [
        { type: 'widget', id: 'html-sitemap' },
        { type: 'h', text: 'For crawlers' },
        { type: 'ul', items: [
          'XML sitemap: /sitemap.xml \u2014 generated at request time and includes every calculator, reference topic, list group and rāśi page.',
          'Crawler directives: /robots.txt',
          'Machine-readable service summary: /llms.txt',
        ] },
      ],
    },

    {
      slug: 'search',
      group: 'resources',
      nav: 'Search',
      title: 'Search',
      description: `Search the ${id.brand} reference library, calculators, articles and site pages.`,
      updated: date,
      robots: 'noindex,follow',
      lede: 'One box across the reference library, the calculator directory, the articles and the administrative pages.',
      blocks: [
        { type: 'widget', id: 'site-search' },
        { type: 'h', text: 'Search tips' },
        { type: 'ul', items: [
          'Use the Sanskrit or the English term \u2014 both are indexed, so "Guru" and "Jupiter" both work.',
          'Two or three words beat a full sentence.',
          'For a calculator, search what it does ("moon sign", "sade sati") rather than its file name.',
          'Reference entries are grouped by topic, so searching a topic name lists everything under it.',
        ] },
      ],
    },

    {
      slug: 'maintenance',
      group: 'system',
      nav: 'Maintenance',
      title: 'Scheduled Maintenance',
      description: `${id.brand} is briefly unavailable while we complete scheduled maintenance.`,
      updated: date,
      hidden: true,
      robots: 'noindex,nofollow',
      status: 503,
      lede: 'We are making a planned change and will be back shortly. Nothing you have bought is affected.',
      blocks: [
        { type: 'note', tone: 'info', title: 'Your subscription is safe', text: 'Subscription records and scheduled deliveries are unaffected by maintenance. Any report that falls due during this window is sent as soon as the service returns, and if a day is missed your term is extended to make it up.' },
        { type: 'h', text: 'What is happening' },
        { type: 'p', text: 'Planned maintenance usually means a dataset update, an ephemeris refresh or a database migration. We schedule it outside the 07:00 delivery window wherever possible, and these windows are normally measured in minutes.' },
        { type: 'h', text: 'What to do' },
        { type: 'ul', items: [
          'Wait a few minutes and reload the page.',
          'If you were part-way through a payment, do not pay again \u2014 check the track order page once we are back, or write to us and we will reconcile it.',
          `If the outage continues beyond the window announced, write to ${id.supportEmail}.`,
        ] },
      ],
    },

    {
      slug: 'coming-soon',
      group: 'system',
      nav: 'Coming Soon',
      title: 'Coming Soon',
      description: `A new ${id.brand} feature is on the way.`,
      updated: date,
      hidden: true,
      robots: 'noindex,follow',
      lede: 'This page is reserved for something we are still building. Here is what is already working.',
      blocks: [
        { type: 'h', text: 'Available now' },
        { type: 'cards', items: [
          { title: 'Personal forecast', text: 'Daily, weekly, monthly and yearly guidance from your birth chart, free and without an account.', href: '/' },
          { title: 'Rāśi horoscope', text: 'Sign-based readings with life-area ratings, lucky factors and remedies.', href: '/horoscope' },
          { title: 'Panchang & muhurta', text: 'Tithi, nakshatra, yoga, karana, Choghadiya, Hora and Rahu Kaal for any date and place.', href: '/panchang' },
          { title: 'Calculators', text: 'Deterministic tools for charts, Dasha, doshas, compatibility and numerology.', href: '/calculators' },
          { title: 'Reference library', text: 'Deities, mantras, yantras, gemstones, rudraksha, nakshatras, yogas and classical texts.', href: '/knowledge' },
          { title: 'Articles', text: 'Guides to reading a chart and understanding the timing behind a forecast.', href: '/blog' },
        ] },
        { type: 'h', text: 'Want to hear when it ships' },
        { type: 'p', text: `Subscribers are told about new features in their daily report, so there is no separate mailing list to join. If you are not a subscriber and want a note when something specific launches, write to ${id.supportEmail} and say which feature.` },
      ],
    },

    {
      slug: 'server-error',
      group: 'system',
      nav: 'Server Error',
      title: 'Something went wrong on our side',
      description: 'An unexpected server error occurred.',
      updated: date,
      hidden: true,
      robots: 'noindex,nofollow',
      status: 500,
      lede: 'This is our fault, not yours. The error has been logged with a reference and nothing you entered was saved.',
      blocks: [
        { type: 'h', text: 'What to try' },
        { type: 'ol', items: [
          'Reload the page. Many transient errors clear on a second attempt.',
          'If you were part-way through a calculation, re-enter the details \u2014 nothing was stored, so nothing is stuck.',
          'If you were part-way through a payment, do not pay again. Check the track order page first; if the payment was captured we will have it.',
          `If it keeps happening, write to ${id.supportEmail} with the page address, the time, and the error reference shown above if there is one. That reference points straight at the log entry.`,
        ] },
        { type: 'note', tone: 'info', title: 'Your data is safe', text: 'A failed request does not corrupt a subscription record. Scheduled daily deliveries run from a separate process and are unaffected by a web error.' },
        { type: 'h', text: 'Meanwhile' },
        { type: 'cards', items: [
          { title: 'Home', text: 'Personal birth-chart forecast.', href: '/' },
          { title: 'Horoscope', text: 'Daily, weekly, monthly and yearly by rāśi.', href: '/horoscope' },
          { title: 'Panchang', text: 'Tithi, nakshatra and auspicious windows.', href: '/panchang' },
          { title: 'Contact us', text: 'Tell us what broke.', href: '/contact' },
        ] },
      ],
    },
  ];
}
