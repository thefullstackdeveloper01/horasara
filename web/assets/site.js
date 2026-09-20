/**
 * Hydrates the `data-widget` containers rendered by SitePageRenderer.
 *
 * Every widget replaces its own no-script fallback, reports its own errors in
 * place, and never leaves a container stuck on "Loading…": a failed fetch
 * renders a message with a usable alternative rather than an empty box.
 */
(() => {
  const esc = (value) => String(value ?? '').replace(/[&<>"']/g, c =>
    ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

  const money = (amount, currency = 'INR') => {
    try { return new Intl.NumberFormat('en-IN', { style: 'currency', currency, maximumFractionDigits: 0 }).format(amount); }
    catch { return `${currency} ${amount}`; }
  };

  const ready = (host) => host.setAttribute('aria-busy', 'false');

  function fail(host, message, fallbackHtml = '') {
    host.innerHTML = `<p class="doc-widget-error" role="alert">${esc(message)}</p>${fallbackHtml}`;
    ready(host);
  }

  async function getJson(url) {
    const response = await fetch(url, { headers: { accept: 'application/json' } });
    const data = await response.json().catch(() => ({}));
    if (!response.ok) throw new Error(data.message || data.error || `Request failed (${response.status})`);
    return data;
  }

  async function postJson(url, body) {
    const response = await fetch(url, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify(body),
    });
    const data = await response.json().catch(() => ({}));
    if (!response.ok) throw new Error(data.message || data.error || `Request failed (${response.status})`);
    return data;
  }

  /** Cart lives in localStorage only; see the cookie policy page. */
  const cart = {
    read() {
      try { return JSON.parse(localStorage.getItem('hs-cart') || 'null'); }
      catch { return null; }
    },
    write(value) {
      try { localStorage.setItem('hs-cart', JSON.stringify(value)); } catch { /* private mode */ }
    },
    clear() {
      try { localStorage.removeItem('hs-cart'); } catch { /* private mode */ }
    },
  };

  // --- forms ---------------------------------------------------------------

  const CONTACT_TOPICS = [
    ['support', 'Support or a general question'],
    ['billing', 'Billing, refund or cancellation'],
    ['calculation', 'A calculation looks wrong'],
    ['bug', 'A bug on the site'],
    ['privacy', 'Privacy request (access, correction, deletion)'],
    ['grievance', 'Grievance'],
    ['security', 'Security vulnerability'],
    ['press', 'Press or media'],
    ['partnership', 'Partnership or affiliate'],
    ['careers', 'Careers'],
    ['other', 'Something else'],
  ];

  function formStatus(form, tone, message) {
    const box = form.querySelector('.form-status');
    box.className = `form-status status show ${tone}`;
    box.textContent = message;
    if (tone === 'err') box.setAttribute('role', 'alert'); else box.setAttribute('role', 'status');
  }

  function contactForm(host) {
    host.innerHTML = `
      <form class="doc-form" novalidate>
        <div class="formgrid">
          <div class="field"><label for="cfName">Your name</label><input id="cfName" name="name" autocomplete="name" required maxlength="120"></div>
          <div class="field"><label for="cfEmail">Email we should reply to</label><input id="cfEmail" name="email" type="email" autocomplete="email" required maxlength="200"></div>
          <div class="field"><label for="cfTopic">What is this about?</label><select id="cfTopic" name="topic" required>${CONTACT_TOPICS.map(([v, l]) => `<option value="${v}">${esc(l)}</option>`).join('')}</select></div>
          <div class="field"><label for="cfRef">Subscription or payment ID <span class="opt">(optional)</span></label><input id="cfRef" name="reference" maxlength="120" autocomplete="off"></div>
          <div class="field full"><label for="cfSubject">Subject <span class="opt">(optional)</span></label><input id="cfSubject" name="subject" maxlength="200"></div>
          <div class="field full"><label for="cfMessage">Your message</label><textarea id="cfMessage" name="message" rows="6" required maxlength="5000" aria-describedby="cfMessageHint"></textarea><p class="input-note" id="cfMessageHint">Please do not include passwords, card numbers, OTPs or UPI PINs. We will never ask for them.</p></div>
        </div>
        <label class="doc-check"><input type="checkbox" id="cfConsent" required> <span>I am happy for HoraSaar to store this message and reply to the address above. It will be deleted 12 months after the conversation ends.</span></label>
        <div class="hp" aria-hidden="true"><label for="cfWebsite">Leave this field empty</label><input id="cfWebsite" name="website" tabindex="-1" autocomplete="off"></div>
        <div class="actions"><button class="btn primary" type="submit">Send message</button></div>
        <div class="form-status status" role="status"></div>
      </form>`;
    ready(host);

    const form = host.querySelector('form');
    form.addEventListener('submit', async (event) => {
      event.preventDefault();
      const button = form.querySelector('button[type=submit]');
      button.disabled = true;
      formStatus(form, '', 'Sending…');
      try {
        const result = await postJson('/api/contact', {
          name: form.name.value,
          email: form.email.value,
          topic: form.topic.value,
          subject: form.subject.value,
          reference: form.reference.value,
          message: form.message.value,
          website: form.website.value,
          consent: form.querySelector('#cfConsent').checked,
        });
        form.reset();
        formStatus(form, 'ok', result.message || 'Thank you — your message is with us and a person will reply.');
      } catch (error) {
        formStatus(form, 'err', error.message);
      } finally {
        button.disabled = false;
      }
    });
  }

  function feedbackForm(host) {
    host.innerHTML = `
      <form class="doc-form" novalidate>
        <div class="formgrid">
          <div class="field"><label for="fbName">Name to publish this under</label><input id="fbName" name="name" required maxlength="80"></div>
          <div class="field"><label for="fbLocation">City <span class="opt">(optional)</span></label><input id="fbLocation" name="location" maxlength="80"></div>
          <div class="field"><label for="fbEmail">Email <span class="opt">(optional, never published)</span></label><input id="fbEmail" name="email" type="email" maxlength="200"></div>
          <div class="field"><label for="fbRating">Rating</label><select id="fbRating" name="rating" required>${[5, 4, 3, 2, 1].map(n => `<option value="${n}">${n} out of 5</option>`).join('')}</select></div>
          <div class="field full"><label for="fbMessage">Your experience</label><textarea id="fbMessage" name="message" rows="5" required maxlength="1500" aria-describedby="fbHint"></textarea><p class="input-note" id="fbHint">Please leave out birth details, phone numbers and other people's names — this page is public.</p></div>
        </div>
        <label class="doc-check"><input type="checkbox" id="fbConsent" required> <span>I am happy for this review to be published with the name and city above, once a person has read it.</span></label>
        <div class="hp" aria-hidden="true"><label for="fbWebsite">Leave this field empty</label><input id="fbWebsite" name="website" tabindex="-1" autocomplete="off"></div>
        <div class="actions"><button class="btn primary" type="submit">Submit feedback</button></div>
        <div class="form-status status" role="status"></div>
      </form>`;
    ready(host);

    const form = host.querySelector('form');
    form.addEventListener('submit', async (event) => {
      event.preventDefault();
      const button = form.querySelector('button[type=submit]');
      button.disabled = true;
      formStatus(form, '', 'Sending…');
      try {
        const result = await postJson('/api/feedback', {
          name: form.name.value,
          email: form.email.value,
          location: form.location.value,
          rating: Number(form.rating.value),
          message: form.message.value,
          website: form.website.value,
          consent: form.querySelector('#fbConsent').checked,
        });
        form.reset();
        formStatus(form, 'ok', result.message || 'Thank you. A person will read this before it appears on the page.');
      } catch (error) {
        formStatus(form, 'err', error.message);
      } finally {
        button.disabled = false;
      }
    });
  }

  // --- read-only lists -----------------------------------------------------

  async function testimonialList(host) {
    host.innerHTML = '<p class="doc-muted">Loading published feedback…</p>';
    try {
      const data = await getJson('/api/feedback');
      const items = data.testimonials || [];
      host.innerHTML = items.length
        ? `<div class="doc-reviews">${items.map(item => `
            <figure class="doc-review">
              <div class="doc-review-top">
                <strong>${esc(item.name)}</strong>
                ${item.location ? `<span class="doc-muted">${esc(item.location)}</span>` : ''}
                <span class="doc-stars" role="img" aria-label="${esc(item.rating)} out of 5">${'\u2605'.repeat(item.rating)}${'\u2606'.repeat(5 - item.rating)}</span>
              </div>
              <blockquote>${esc(item.message)}</blockquote>
              ${item.reply ? `<figcaption class="doc-review-reply"><strong>HoraSaar:</strong> ${esc(item.reply)}</figcaption>` : ''}
              <figcaption class="doc-muted">${esc(String(item.createdAt).slice(0, 10))}</figcaption>
            </figure>`).join('')}</div>`
        : '<p class="doc-muted">No reviews have been published yet. If you use HoraSaar, yours would be the first — including a critical one.</p>';
    } catch (error) {
      fail(host, `Feedback could not be loaded: ${error.message}`);
      return;
    }
    ready(host);
  }

  async function planList(host) {
    host.innerHTML = '<p class="doc-muted">Loading plans…</p>';
    try {
      const data = await getJson('/subscription/plans');
      const currency = data.currency || 'INR';
      const plans = data.plans || [];
      host.innerHTML = `<div class="doc-plans">${plans.map(plan => {
        const perDay = plan.billingPeriod === 'yearly' ? Number(plan.amountInr) / 365 : Number(plan.amountInr) / 30;
        return `<div class="doc-plan">
            <strong>${esc(plan.label)}</strong>
            <span class="doc-plan-price">${esc(money(plan.amountInr, currency))}</span>
            <small class="doc-muted">per ${esc(plan.billingPeriod === 'yearly' ? 'year' : 'month')} \u00B7 about ${esc(money(Math.max(1, Math.round(perDay)), currency))} a day</small>
            <p>${esc(plan.description || '')}</p>
            <div class="actions">
              <a class="btn primary" href="/subscribe?plan=${encodeURIComponent(plan.id)}">Subscribe</a>
              <button class="btn secondary" type="button" data-add-plan="${esc(plan.id)}" data-plan-label="${esc(plan.label)}" data-plan-amount="${esc(plan.amountInr)}" data-plan-period="${esc(plan.billingPeriod)}">Add to cart</button>
            </div>
          </div>`;
      }).join('')}</div>
      <p class="doc-muted">Prices in ${esc(currency)}, inclusive of applicable taxes unless stated at checkout. Delivery is daily at approximately 07:00 local time.</p>`;

      host.querySelectorAll('[data-add-plan]').forEach(button => button.addEventListener('click', () => {
        cart.write({
          planId: button.dataset.addPlan,
          label: button.dataset.planLabel,
          amountInr: Number(button.dataset.planAmount),
          billingPeriod: button.dataset.planPeriod,
          currency,
          addedAt: new Date().toISOString(),
        });
        button.textContent = 'Added \u2713';
        setTimeout(() => { window.location.href = '/cart'; }, 400);
      }));
    } catch (error) {
      fail(host, `Plans could not be loaded: ${error.message}`, '<p><a class="btn secondary" href="/subscribe">Open the subscribe page</a></p>');
      return;
    }
    ready(host);
  }

  async function blogIndex(host) {
    host.innerHTML = '<p class="doc-muted">Loading articles…</p>';
    try {
      const data = await getJson('/api/articles');
      const items = data.articles || [];
      host.innerHTML = items.length
        ? `<div class="doc-posts">${items.map(article => `
            <a class="doc-post" href="/blog/${esc(article.slug)}">
              <span class="doc-post-tag">${esc(article.tag || 'Article')}</span>
              <strong>${esc(article.title)}</strong>
              <span class="doc-muted">${esc(article.description)}</span>
              <small class="doc-muted">${esc(String(article.published).slice(0, 10))}${article.readingMinutes ? ` \u00B7 ${esc(article.readingMinutes)} min read` : ''}</small>
            </a>`).join('')}</div>`
        : '<p class="doc-muted">No articles have been published yet.</p>';
    } catch (error) {
      fail(host, `Articles could not be loaded: ${error.message}`);
      return;
    }
    ready(host);
  }

  async function jobList(host) {
    host.innerHTML = '<p class="doc-muted">Loading roles…</p>';
    try {
      const data = await getJson('/api/openings');
      const roles = data.openings || [];
      host.innerHTML = roles.length
        ? `<div class="doc-jobs">${roles.map(role => `
            <details class="doc-job">
              <summary>
                <strong>${esc(role.title)}</strong>
                <span class="badge ${role.status === 'open' ? 'ok' : ''}">${esc(role.statusLabel)}</span>
                <small class="doc-muted">${esc(role.location)} \u00B7 ${esc(role.type)}</small>
              </summary>
              <p>${esc(role.summary)}</p>
              <h3 class="doc-h3">What you would own</h3>
              <ul class="doc-list">${(role.responsibilities || []).map(r => `<li>${esc(r)}</li>`).join('')}</ul>
              <h3 class="doc-h3">What we are looking for</h3>
              <ul class="doc-list">${(role.looking || []).map(r => `<li>${esc(r)}</li>`).join('')}</ul>
              <p><a class="btn secondary" href="/contact">Apply or ask a question</a></p>
            </details>`).join('')}</div>`
        : '<p class="doc-muted">No roles are listed right now. Speculative applications are still welcome.</p>';
    } catch (error) {
      fail(host, `Roles could not be loaded: ${error.message}`);
      return;
    }
    ready(host);
  }

  async function htmlSitemap(host) {
    host.innerHTML = '<p class="doc-muted">Building index…</p>';
    try {
      const data = await getJson('/api/site/map');
      host.innerHTML = (data.groups || []).map(group => `
        <section class="doc-sitemap-group">
          <h3 class="doc-h3">${esc(group.title)}</h3>
          ${group.description ? `<p class="doc-muted">${esc(group.description)}</p>` : ''}
          <ul class="doc-list">${group.pages.map(page =>
            `<li><a href="${esc(page.path)}">${esc(page.nav || page.title)}</a>${page.description ? ` — <span class="doc-muted">${esc(page.description)}</span>` : ''}</li>`).join('')}</ul>
        </section>`).join('');
    } catch (error) {
      fail(host, `The index could not be built: ${error.message}`);
      return;
    }
    ready(host);
  }

  // --- interactive ---------------------------------------------------------

  function siteSearch(host) {
    const initial = new URLSearchParams(location.search).get('q') || '';
    host.innerHTML = `
      <form class="doc-form doc-search" role="search">
        <label class="sr-only" for="siteQuery">Search HoraSaar</label>
        <input id="siteQuery" class="search" name="q" type="search" placeholder="Search pages, articles, calculators and the reference library" value="${esc(initial)}" autocomplete="off">
        <button class="btn primary" type="submit">Search</button>
      </form>
      <div class="doc-search-results" aria-live="polite"></div>`;
    ready(host);

    const form = host.querySelector('form');
    const results = host.querySelector('.doc-search-results');

    async function run(query) {
      if (!query.trim()) { results.innerHTML = ''; return; }
      results.innerHTML = '<p class="doc-muted">Searching…</p>';
      try {
        const data = await getJson(`/api/search?q=${encodeURIComponent(query)}`);
        if (!data.total) {
          results.innerHTML = `<p class="doc-muted">Nothing matched “${esc(data.query)}”. Try a single word, or the Sanskrit term as well as the English one.</p>`;
          return;
        }
        results.innerHTML = `<p class="doc-muted">${data.total} result${data.total === 1 ? '' : 's'} for “${esc(data.query)}”.</p>`
          + (data.groups || []).map(group => `
            <section class="doc-result-group">
              <h3 class="doc-h3">${esc(group.title)}</h3>
              <ul class="doc-list">${group.results.map(item =>
                `<li><a href="${esc(item.href)}">${esc(item.title)}</a>${item.description ? ` — <span class="doc-muted">${esc(item.description)}</span>` : ''}</li>`).join('')}</ul>
            </section>`).join('');
      } catch (error) {
        results.innerHTML = `<p class="doc-widget-error" role="alert">${esc(error.message)}</p>`;
      }
    }

    form.addEventListener('submit', (event) => {
      event.preventDefault();
      const query = form.q.value;
      // Keep the query in the address bar so a result page can be shared.
      history.replaceState(null, '', query ? `/search?q=${encodeURIComponent(query)}` : '/search');
      run(query);
    });
    if (initial) run(initial);
  }

  function trackOrder(host) {
    const params = new URLSearchParams(location.search);
    host.innerHTML = `
      <form class="doc-form" novalidate>
        <div class="field full"><label for="toLink">Paste your management link</label><input id="toLink" name="link" placeholder="https://…/unsubscribe?id=…&token=…" autocomplete="off"></div>
        <p class="doc-muted doc-or">or enter the two values separately</p>
        <div class="formgrid">
          <div class="field"><label for="toId">Subscription ID</label><input id="toId" name="id" value="${esc(params.get('id') || '')}" autocomplete="off"></div>
          <div class="field"><label for="toToken">Management token</label><input id="toToken" name="token" value="${esc(params.get('token') || '')}" autocomplete="off"></div>
        </div>
        <div class="actions"><button class="btn primary" type="submit">Check status</button></div>
        <div class="form-status status" role="status"></div>
      </form>
      <div class="doc-order" aria-live="polite"></div>`;
    ready(host);

    const form = host.querySelector('form');
    const panel = host.querySelector('.doc-order');

    /** Accepts a pasted URL or the raw pair, so people need not parse it themselves. */
    function credentials() {
      const link = form.link.value.trim();
      if (link) {
        try {
          const url = new URL(link, location.origin);
          return { id: url.searchParams.get('id') || '', token: url.searchParams.get('token') || '' };
        } catch { /* fall through to the explicit fields */ }
      }
      return { id: form.id.value.trim(), token: form.token.value.trim() };
    }

    function renderSubscription(subscription) {
      const statusLabels = {
        active: ['ok', 'Active'],
        pending_payment: ['', 'Pending payment'],
        cancelled: ['err', 'Cancelled'],
      };
      const [tone, label] = statusLabels[subscription.status] || ['', subscription.status];
      panel.innerHTML = `
        <div class="doc-order-card">
          <div class="doc-order-top"><strong>Subscription ${esc(String(subscription.id).slice(0, 8))}…</strong><span class="badge ${tone}">${esc(label)}</span></div>
          <dl class="doc-dl">
            <div class="doc-dl-row"><dt>Plan</dt><dd>${esc(subscription.billingPeriod || '—')}${subscription.amountInr ? ` \u00B7 ${esc(money(subscription.amountInr, subscription.currency || 'INR'))}` : ''}</dd></div>
            <div class="doc-dl-row"><dt>Delivery</dt><dd>${esc(subscription.email || subscription.mobile || '—')}</dd></div>
            <div class="doc-dl-row"><dt>Report</dt><dd>${esc(subscription.report || 'daily')} at ${esc(String(subscription.deliveryHour ?? 7).padStart(2, '0'))}:00 local time</dd></div>
            <div class="doc-dl-row"><dt>Topics</dt><dd>${esc((subscription.preferences || []).join(', ') || 'All selected topics')}</dd></div>
            <div class="doc-dl-row"><dt>Started</dt><dd>${esc(String(subscription.createdAt || '').slice(0, 10) || '—')}</dd></div>
            <div class="doc-dl-row"><dt>Current term ends</dt><dd>${esc(String(subscription.currentPeriodEnd || '').slice(0, 10) || '—')}</dd></div>
            <div class="doc-dl-row"><dt>Payment</dt><dd>${esc(subscription.payment?.status || 'unknown')}${subscription.payment?.method ? ` \u00B7 ${esc(subscription.payment.method)}` : ''}</dd></div>
          </dl>
          ${subscription.status === 'cancelled'
            ? '<p class="doc-muted">This subscription is cancelled. No further reports will be sent and no further charges will be made.</p>'
            : '<div class="actions"><button class="btn secondary" type="button" data-cancel>Cancel subscription</button></div>'}
        </div>`;

      panel.querySelector('[data-cancel]')?.addEventListener('click', async (event) => {
        if (!confirm('Cancel this subscription? Delivery stops immediately. Refund eligibility is explained on the refund policy page.')) return;
        const button = event.currentTarget;
        button.disabled = true;
        const { id, token } = credentials();
        try {
          await postJson(`/subscriptions/unsubscribe?id=${encodeURIComponent(id)}&token=${encodeURIComponent(token)}`, {});
          formStatus(form, 'ok', 'Cancelled. You will not be charged again and delivery has stopped.');
          form.dispatchEvent(new Event('submit'));
        } catch (error) {
          formStatus(form, 'err', error.message);
          button.disabled = false;
        }
      });
    }

    form.addEventListener('submit', async (event) => {
      event.preventDefault();
      const { id, token } = credentials();
      if (!id || !token) { formStatus(form, 'err', 'Please paste the management link, or enter both the ID and the token.'); return; }
      formStatus(form, '', 'Checking…');
      try {
        const subscription = await getJson(`/subscriptions/manage?id=${encodeURIComponent(id)}&token=${encodeURIComponent(token)}`);
        formStatus(form, 'ok', 'Subscription found.');
        renderSubscription(subscription);
      } catch (error) {
        panel.innerHTML = '';
        formStatus(form, 'err', `${error.message}. Check that the link was copied in full — the token is long and is easy to truncate.`);
      }
    });

    if (params.get('id') && params.get('token')) form.dispatchEvent(new Event('submit'));
  }

  function cartView(host) {
    const item = cart.read();
    if (!item) {
      host.innerHTML = `<div class="doc-empty"><strong>Your cart is empty.</strong><p class="doc-muted">Pick a plan on the pricing page, or go straight to the subscribe page.</p><div class="actions"><a class="btn primary" href="/pricing">See plans</a><a class="btn secondary" href="/">Try a free forecast</a></div></div>`;
      ready(host);
      return;
    }
    host.innerHTML = `
      <div class="doc-order-card">
        <div class="doc-order-top"><strong>${esc(item.label)}</strong><span class="badge">${esc(item.billingPeriod)}</span></div>
        <dl class="doc-dl">
          <div class="doc-dl-row"><dt>Price</dt><dd>${esc(money(item.amountInr, item.currency || 'INR'))} for one ${esc(item.billingPeriod === 'yearly' ? 'year' : 'month')}</dd></div>
          <div class="doc-dl-row"><dt>Delivery charge</dt><dd>None — this is a digital subscription</dd></div>
          <div class="doc-dl-row"><dt>Total due today</dt><dd><strong>${esc(money(item.amountInr, item.currency || 'INR'))}</strong></dd></div>
        </dl>
        <div class="actions">
          <a class="btn primary" href="/subscribe?plan=${encodeURIComponent(item.planId)}">Continue to checkout</a>
          <button class="btn secondary" type="button" data-clear-cart>Remove</button>
        </div>
      </div>`;
    host.querySelector('[data-clear-cart]').addEventListener('click', () => { cart.clear(); cartView(host); });
    ready(host);
  }

  function checkoutRedirect(host) {
    const item = cart.read();
    const plan = new URLSearchParams(location.search).get('plan') || item?.planId || '';
    const target = plan ? `/subscribe?plan=${encodeURIComponent(plan)}` : '/subscribe';
    host.innerHTML = `
      <div class="doc-order-card">
        <strong>Secure checkout</strong>
        <p>Payment is completed on the subscribe page, where your birth details and delivery address are collected and the payment gateway opens.</p>
        <div class="actions"><a class="btn primary" href="${esc(target)}">Continue to secure checkout</a><a class="btn secondary" href="/cart">Back to cart</a></div>
      </div>`;
    ready(host);
  }

  const WIDGETS = {
    'contact-form': contactForm,
    'feedback-form': feedbackForm,
    'testimonial-list': testimonialList,
    'plan-list': planList,
    'blog-index': blogIndex,
    'job-list': jobList,
    'html-sitemap': htmlSitemap,
    'site-search': siteSearch,
    'track-order': trackOrder,
    'cart-view': cartView,
    'checkout-redirect': checkoutRedirect,
  };

  document.querySelectorAll('[data-widget]').forEach(host => {
    const widget = WIDGETS[host.dataset.widget];
    if (!widget) return;
    try { widget(host); }
    catch (error) { fail(host, `This section could not be displayed: ${error.message}`); }
  });
})();
