/**
 * Transactional pages. HoraSaar sells a digital subscription, so the classic
 * "shipping" page is written honestly as a delivery policy rather than
 * inventing couriers and postal charges that do not exist.
 */
export function commercePages({ id, date }) {
  return [
    {
      slug: 'pricing',
      group: 'commerce',
      nav: 'Pricing & Plans',
      title: 'Pricing & Plans',
      description: `What is free on ${id.brand}, what a subscription costs, and exactly what it includes.`,
      updated: date,
      lede: 'Most of this site is free and always will be. The one paid thing is the daily report delivered to your inbox.',
      blocks: [
        { type: 'h', text: 'Free, with no account' },
        { type: 'ul', items: [
          'Full birth-chart calculation with your choice of ayanamsa.',
          'Personal daily, weekly, monthly and yearly forecasts on the home page.',
          'Rāśi horoscopes with life-area ratings, lucky factors and remedies.',
          'Panchang, Choghadiya, Hora, Rahu Kaal, muhurta and the Hindu calendar.',
          'Kundali Milan compatibility with the full Ashtakoot breakdown.',
          'Every calculator in the tools directory.',
          'The complete reference library \u2014 deities, mantras, yantras, gemstones, rudraksha, nakshatras, yogas and classical texts.',
        ] },

        { type: 'h', text: 'The paid subscription' },
        { type: 'widget', id: 'plan-list' },
        { type: 'p', text: 'Every plan delivers the same thing: a report written for your chart, for the life-area topics you selected, arriving each morning at about 07:00 in your local time. The longer billing period is simply cheaper per day.' },

        { type: 'h', text: 'What is in a daily report' },
        { type: 'dl', items: [
          ['Your day in one line', 'Whether the overall balance is favourable, mixed or difficult, and why.'],
          ['Hour-by-hour timing', 'Which parts of the day support the topics you chose and which do not.'],
          ['Topic sections', 'A section for each life area you selected \u2014 career, money, health, relationships, education, travel, property, family or spiritual practice.'],
          ['The reasoning', 'The Dasha period, transits and classical rules that produced the reading, so it is never a black box.'],
          ['Panchang context', 'The day\u2019s tithi, nakshatra, yoga and karana, and the auspicious and inauspicious windows.'],
          ['Remedial suggestions', 'Where the tradition offers one, recorded with its source and never sold to you.'],
        ] },

        { type: 'h', text: 'Billing' },
        { type: 'ul', items: [
          'Prices are in Indian Rupees and include applicable taxes unless stated at checkout.',
          'The full term is charged upfront. A term is never repriced once paid.',
          'Automatic renewal applies only where the plan says so at checkout, and the date and amount appear in your confirmation email.',
          'Cancel from the link in any report email or the track order page. No retention flow, no phone call.',
          'A GST invoice is issued by email with the payment confirmation.',
        ] },

        { type: 'h', text: 'Common questions' },
        { type: 'faq', items: [
          { q: 'Can I change my topics after paying?', a: 'Yes, at any time from the management link. Changes apply from the next morning\u2019s report.' },
          { q: 'Can I pause instead of cancelling?', a: 'Write to us and we will pause delivery and extend your term by the paused days. There is no charge for this.' },
          { q: 'Do you offer a free trial?', a: 'The public forecast is effectively the trial: it is the same calculation engine and the same interpretive rules, free and unlimited. The subscription adds daily delivery, multi-topic depth and the reasoning trail.' },
          { q: 'Is there a family or multi-chart plan?', a: 'Not as a listed plan yet. Write to us with what you need and we will quote something sensible.' },
          { q: 'Can I buy a gift subscription?', a: `Yes \u2014 email ${id.supportEmail} with the recipient\u2019s birth details and delivery address and we will set it up manually. Please make sure the recipient wants it; an unwanted astrology report is an odd gift.` },
        ] },
      ],
    },

    {
      slug: 'payment-methods',
      group: 'commerce',
      nav: 'Payment Methods & Security',
      title: 'Payment Methods & Security',
      description: 'Which payment methods work, how the transaction is secured, and what we can and cannot see.',
      updated: date,
      lede: `All payments run through ${id.paymentProvider}, a PCI-DSS compliant and RBI-authorised payment aggregator. Your card and UPI credentials are entered on their systems, never on ours.`,
      blocks: [
        { type: 'h', text: 'Accepted methods' },
        { type: 'table', head: ['Method', 'Details', 'Notes'], rows: [
          ['UPI', 'GPay, PhonePe, Paytm, BHIM, and any UPI app via VPA or QR.', 'Usually the fastest; confirmation is typically instant.'],
          ['Credit & debit cards', 'Visa, Mastercard, RuPay, American Express, Diners Club.', 'Domestic cards carry an additional bank OTP step.'],
          ['Net banking', 'Major Indian banks.', 'Confirmation can take a minute or two after you return from the bank page.'],
          ['Wallets', 'Popular Indian wallets supported by the gateway.', 'Subject to your wallet balance and limits.'],
          ['International cards', 'Accepted where the gateway supports the issuing country.', 'Charged in INR; your bank may add a foreign-exchange fee.'],
        ] },
        { type: 'p', text: 'The exact list shown at checkout reflects what the gateway has enabled for this merchant account at that moment, so it can differ slightly from this table.' },

        { type: 'h', text: 'What we can see, and what we cannot' },
        { type: 'dl', items: [
          ['We never see', 'Your full card number, expiry, CVV, UPI PIN, net-banking password or OTP. None of these ever touch our servers.'],
          ['We do store', 'The order reference, the payment identifier, the method type (for example "upi" or "card"), the amount, the currency and the timestamp \u2014 the minimum needed to match a payment to a subscription and to process a refund.'],
        ] },

        { type: 'h', text: 'How a payment is verified' },
        { type: 'ol', items: [
          'Choosing a plan creates an order on the gateway with a server-generated reference tied to your pending subscription.',
          'You complete payment inside the gateway\u2019s own secure checkout.',
          'The gateway returns a cryptographically signed result, which our server verifies with a secret that never leaves the server.',
          'The server independently re-fetches the order and payment from the gateway and confirms the status is captured.',
          'The amount and currency are checked against the stored subscription. A mismatch of even one rupee aborts activation.',
          'Only then is the subscription activated and the confirmation email sent.',
        ] },
        { type: 'p', text: 'A signed webhook from the gateway provides a second, independent path to activation, so a payment that succeeds while your browser is closing still gets processed.' },

        { type: 'h', text: 'Security on our side' },
        { type: 'ul', items: [
          'HTTPS everywhere, with HSTS enforced in production.',
          'A Content Security Policy that permits the payment gateway as the only external origin, which blocks injected payment-skimming scripts.',
          'Rate limits on checkout and payment verification to frustrate card testing.',
          'No card data stored, so there is no card data to breach.',
        ] },

        { type: 'h', text: 'If a payment goes wrong' },
        { type: 'dl', items: [
          ['Money debited, nothing activated', 'Usually a delayed confirmation; it normally settles within a few minutes as the webhook arrives. If it does not, send us the payment ID and we reconcile it the same working day.'],
          ['Payment failed but money debited', 'Failed transactions are auto-reversed by the bank, typically in 5\u20137 working days. We never received the money in this case, but tell us and we will chase the gateway with you.'],
          ['Charged twice', 'Tell us immediately with both payment IDs. The duplicate is refunded in full, no questions asked.'],
          ['You do not recognise a charge', `Write to ${id.supportEmail} straight away. Our charges appear on statements under our merchant name via the payment gateway.`] ,
        ] },

        { type: 'h', text: 'Protect yourself' },
        { type: 'note', tone: 'warn', title: 'We will never ask for these', text: 'Nobody from HoraSaar will ever ask for your OTP, UPI PIN, CVV or card number, by phone, email or message, for any reason. We will never ask you to install a screen-sharing or remote-access app. We will never phone you about a dosha and ask for payment. If someone does any of this claiming to be us, it is fraud \u2014 do not pay, and please report it to us.' },
      ],
    },

    {
      slug: 'delivery-policy',
      group: 'commerce',
      nav: 'Delivery Policy',
      title: 'Shipping & Delivery Policy',
      description: `How ${id.brand} delivers what you buy, when it arrives, and what happens if it does not.`,
      updated: date,
      lede: 'Everything we sell is digital. There is no parcel, no courier, no shipping charge and nothing to track through the post.',
      blocks: [
        { type: 'note', tone: 'info', title: 'No physical goods', text: 'HoraSaar does not ship any physical product. We do not sell gemstones, yantras, rudraksha, books or puja items, and we never will. Anyone offering to courier you such an item in our name is not us.' },

        { type: 'h', text: 'What gets delivered and when' },
        { type: 'table', head: ['What you bought', 'Channel', 'When'], rows: [
          ['Subscription activation', 'Email confirmation with your invoice and management link', 'Within minutes of a verified payment'],
          ['Daily report', 'Email to the address on the subscription', 'Each day at approximately 07:00 local time from the day after activation'],
          ['Public forecast', 'On screen, immediately', 'A few seconds after you submit the form'],
        ] },
        { type: 'p', text: 'Local time is derived from the birth place recorded on your subscription. If you have moved and want delivery timed to where you now live, tell us and we will adjust it.' },

        { type: 'h', text: 'Charges' },
        { type: 'p', text: 'There are no delivery, handling, shipping or convenience charges. The plan price on the pricing page is the whole price, and no payment-method surcharge is added at checkout.' },

        { type: 'h', text: 'Where we deliver' },
        { type: 'p', text: 'Anywhere email reaches. Calculations work for any location on Earth; the interpretive content is written in the languages listed in the language menu.' },

        { type: 'h', text: 'If a report does not arrive' },
        { type: 'ol', items: [
          'Check the spam, junk and promotions folders, and add our sending address to your contacts.',
          'Confirm the address on your subscription from the track order page \u2014 a mistyped address is the most common cause.',
          'Corporate mail filters sometimes quarantine daily mail; a personal address is more reliable.',
          `Write to ${id.supportEmail} with your subscription ID. We check the delivery log, resend the missing days and fix the underlying cause.`,
        ] },

        { type: 'h', text: 'Missed days are made up' },
        { type: 'p', text: 'If we fail to deliver a day\u2019s report for a reason on our side, we extend your subscription by the number of days missed at no charge. You do not have to ask. If a sustained failure makes the subscription useless to you, the refund policy applies instead.' },

        { type: 'h', text: 'Interruptions we cannot control' },
        { type: 'p', text: 'Mailbox full, address disabled, a mail provider blocking our sender, or a bounce loop will pause delivery. After three consecutive hard bounces we suspend sending to protect the sender reputation, and write to you at the same address with a note explaining how to restore it. Suspended days are still made up once delivery resumes.' },
      ],
    },

    {
      slug: 'refund-policy',
      group: 'commerce',
      nav: 'Refund & Cancellation',
      title: 'Return, Refund & Cancellation Policy',
      description: 'When you can cancel, when a refund is due, how long it takes and how to ask.',
      updated: date,
      lede: 'The rule we work to: if the service did not do what we said it would, you get your money back. We would rather refund you than argue with you.',
      blocks: [
        { type: 'h', text: 'Cancelling' },
        { type: 'p', text: 'Cancel at any time from the management link at the bottom of every report email, or from the track order page using your subscription ID and token. Cancellation is immediate and unconditional. There is no retention questionnaire, no phone call and no waiting period.' },
        { type: 'p', text: 'Cancelling stops future delivery and any future billing. It does not by itself issue a refund for the current term \u2014 the rules below decide that.' },

        { type: 'h', text: 'When a refund is due' },
        { type: 'table', head: ['Situation', 'Refund', 'Notes'], rows: [
          ['Within 7 days of first activation', 'Full refund', 'Our cooling-off period. No reason needed, even if reports were delivered.'],
          ['We failed to deliver', 'Full refund, or a pro-rata refund for the affected period', 'Applies to sustained delivery failure on our side.'],
          ['Duplicate or accidental double charge', 'Full refund of the duplicate', 'Refunded as soon as we see it, usually without you asking.'],
          ['Wrong amount charged', 'Refund of the difference', 'Immediate.'],
          ['Unauthorised transaction', 'Full refund once verified', 'Tell us at once; we work with the gateway and your bank.'],
          ['Service discontinued by us', 'Pro-rata refund of the unused term', 'We also give notice before withdrawing a plan.'],
          ['Cancelling mid-term after day 7', 'Pro-rata at our discretion', 'We usually refund the unused whole months on an annual plan. Ask.'],
        ] },

        { type: 'h', text: 'When a refund is not due' },
        { type: 'ul', items: [
          'Dissatisfaction with what an interpretation said. A reading is content, not an outcome, and a difficult reading is not a defect.',
          'A prediction that did not come true. Our disclaimer is explicit that nothing here is a statement of fact about the future, and that is the basis on which the subscription is sold.',
          'Incorrect birth details supplied by you. Correct them from the management link and we will regenerate; the calculation itself was delivered as promised.',
          'Reports going to spam where the address was correct and delivery succeeded \u2014 though we will always help you fix it.',
          'Termination for a serious breach of the terms, such as scraping or resale.',
        ] },
        { type: 'p', text: 'Even here, write to us. Genuine cases that do not fit this table are settled on the facts, and our bias is towards the customer.' },

        { type: 'h', text: 'How to request one' },
        { type: 'ol', items: [
          `Email ${id.supportEmail} with the subject "Refund request".`,
          'Include your subscription ID or the email address you paid with, and the Razorpay payment ID if you have it.',
          'Tell us in one line what went wrong. You do not need to justify a cooling-off request.',
          'We acknowledge within one working day and approve or explain within three.',
        ] },

        { type: 'h', text: 'How long the money takes' },
        { type: 'dl', items: [
          ['Our approval', 'Within 3 working days of a complete request.'],
          ['Gateway processing', 'Initiated within 1 working day of approval.'],
          ['UPI and wallets', 'Typically 1\u20133 working days to reach you.'],
          ['Cards', 'Typically 5\u20137 working days, depending on your issuing bank.'],
          ['Net banking', 'Typically 5\u201310 working days.'],
        ] },
        { type: 'p', text: 'Refunds always return to the original payment method \u2014 the gateway and RBI rules require it, and it protects you from refund fraud. We cannot send a refund to a different account, in cash, or as store credit unless the original method has genuinely closed.' },

        { type: 'h', text: 'Returns' },
        { type: 'p', text: 'There is nothing to return. We sell no physical goods, so no item needs to be sent back before a refund is processed.' },

        { type: 'h', text: 'Chargebacks' },
        { type: 'p', text: `If you raise a chargeback with your bank we will cooperate fully with the investigation. Please write to us first \u2014 a direct refund reaches you far faster than a chargeback, which can take weeks. If a chargeback is filed we may suspend the subscription until it is resolved.` },

        { type: 'h', text: 'Still unhappy' },
        { type: 'p', text: `Escalate to ${id.grievanceEmail} with your case details. Grievances are answered within 30 days and usually within a few days. Nothing in this policy limits your rights under the Consumer Protection Act, 2019 or other applicable consumer law.` },
      ],
    },

    {
      slug: 'track-order',
      group: 'commerce',
      nav: 'Track Order',
      title: 'Track Your Order',
      description: 'Check the status of a subscription, see your next delivery, or cancel.',
      updated: date,
      lede: 'Because the service has no accounts, your subscription is opened with the private link we emailed you. Paste it below, or enter the ID and token from it.',
      blocks: [
        { type: 'widget', id: 'track-order' },

        { type: 'h', text: 'Where to find your link' },
        { type: 'ol', items: [
          'Open the payment confirmation email we sent after activation, or any daily report.',
          'Scroll to the bottom and find the "Manage subscription" link.',
          'Open it, or copy it and paste it into the box above. The ID and token are the two values in the address.',
        ] },
        { type: 'note', tone: 'warn', title: 'Keep the link private', text: 'The management token is the only credential your subscription has. Anyone holding it can view and cancel the subscription, so do not post it in a public place or forward it. If you think it has leaked, tell us and we will reissue it.' },

        { type: 'h', text: 'What you can do here' },
        { type: 'ul', items: [
          'See whether the subscription is active, pending payment or cancelled.',
          'See the plan, billing period, amount paid and the end of the current term.',
          'See the delivery address, the topics selected and the next scheduled send.',
          'Cancel immediately.',
        ] },

        { type: 'h', text: 'Lost the link' },
        { type: 'p', text: `Write to ${id.supportEmail} from the email address on the subscription and we will resend it there. For your protection we can only send it to the address already on the record \u2014 never to a different one.` },

        { type: 'h', text: 'Paid but no confirmation' },
        { type: 'p', text: 'Wait a few minutes: the gateway webhook usually completes activation on its own. If nothing arrives, send us the Razorpay payment ID from your bank or UPI app message and we will reconcile it manually the same working day.' },
      ],
    },

    {
      slug: 'cart',
      group: 'commerce',
      nav: 'Cart',
      title: 'Your Cart',
      description: 'Review the plan and topics you selected before going to checkout.',
      updated: date,
      hidden: true,
      robots: 'noindex,follow',
      lede: 'Nothing is charged here. Review your selection, then continue to the secure payment step.',
      blocks: [
        { type: 'widget', id: 'cart-view' },
        { type: 'note', tone: 'info', title: 'Stored on your device only', text: 'Your cart lives in this browser\u2019s local storage and is never sent to our server until you start checkout. Clearing your browser data clears the cart.' },
        { type: 'h', text: 'What happens next' },
        { type: 'ol', items: [
          'You enter your birth details and delivery address on the checkout page.',
          'A payment order is created and the secure gateway opens.',
          'After the payment is verified, the subscription activates and your confirmation email arrives with the management link.',
        ] },
      ],
    },

    {
      slug: 'checkout',
      group: 'commerce',
      nav: 'Checkout',
      title: 'Checkout',
      description: 'Complete your subscription securely.',
      updated: date,
      hidden: true,
      robots: 'noindex,nofollow',
      lede: 'Card and UPI details are entered inside the payment gateway, never on this page.',
      blocks: [
        { type: 'widget', id: 'checkout-redirect' },
        { type: 'h', text: 'Before you pay' },
        { type: 'ul', items: [
          'Check the birth date, time and place carefully \u2014 every reading depends on them, and the time is the easiest thing to get wrong.',
          'Use an email address you check daily, since that is where the report arrives.',
          'The price shown is the full price. No delivery charge or payment surcharge is added.',
          'You can cancel at any time, and the first seven days are covered by a full-refund cooling-off period.',
        ] },
      ],
    },
  ];
}
