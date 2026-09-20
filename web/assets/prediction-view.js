(() => {
  const PREFS={general:'Overall',career:'Career',business:'Business',finance:'Money',love:'Love',marriage:'Marriage',health:'Health',family:'Family',education:'Education',travel:'Travel',property:'Property',spirituality:'Spiritual Growth'};
  const PERIODS={day:'Today',week:'This week',month:'This month',year:'This year'};
  const toneText={positive:'Favorable',neutral:'Neutral',negative:'Challenging'};
  const $=id=>document.getElementById(id);
  const esc=x=>String(x??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const areaFor=(p)=>PREFS[p]||PREFS.general;
  function toneClass(t){return t==='positive'||t==='negative'||t==='neutral'?t:'neutral'}
  function chip(label,tone){return `<span class="forecast-chip ${toneClass(tone)}">${esc(label)}</span>`}
  function renderDrivers(drivers){return `<div class="prediction-driver-grid">${(drivers||[]).slice(0,4).map(x=>`<article class="driver ${toneClass(x.tone)}"><span class="driver-dot"></span><div><strong>${esc(x.planet||'Timing')}</strong><span>${esc(x.text)}</span></div></article>`).join('')}</div>`}
  function renderDay(p){
    const hours=(p.hourly||[]).map(h=>`<article class="hour-card ${toneClass(h.tone)}"><div class="hour-top"><strong>${esc(h.hour)}</strong>${chip(h.label,h.tone)}</div><b>${esc(h.score)}</b><small>${esc(h.summary)}</small></article>`).join('');
    return `<section class="prediction-section"><div class="section-title"><div><h3>Hour-by-hour</h3><span>Use the strongest periods for important actions; use care during demanding periods.</span></div><div class="mini-key">${chip('Favorable','positive')}${chip('Neutral','neutral')}${chip('Challenging','negative')}</div></div><div class="hour-grid">${hours}</div><div class="window-strip"><div><small>Best timing</small><strong>${esc((p.bestTimes||[]).join(' · ')||'No standout window')}</strong></div><div><small>Use extra care</small><strong>${esc((p.watchTimes||[]).join(' · ')||'No pronounced weak window')}</strong></div></div></section>`;
  }
  function renderWeek(p){
    return `<section class="prediction-section"><div class="section-title"><div><h3>Day-by-day</h3><span>${esc(p.positiveDays||0)} favorable · ${esc(p.negativeDays||0)} challenging.</span></div></div><div class="period-list">${(p.days||[]).map(x=>`<article class="period-row"><div><strong>${esc(x.date)}</strong><small>${esc(x.summary||'')}</small></div><span>${chip(x.label,x.tone)}</span><b>${esc(x.score)}</b></article>`).join('')}</div></section>`;
  }
  function renderMonth(p){
    const units=p.units||[];
    return `<section class="prediction-section"><div class="section-title"><div><h3>Month in five simple phases</h3><span>Each phase summarizes the strongest directional pattern for that part of the month.</span></div></div><div class="phase-list">${units.map(x=>`<article class="phase-row"><div><strong>Week ${esc(x.week)}</strong><small>${esc(x.startDate)} → ${esc(x.endDate)}</small></div><div>${chip(x.label,x.tone)}<b>${esc(x.score)}</b></div><p>${esc(x.summary)}</p><small class="guidance">${esc(x.guidance||'')}</small></article>`).join('')}</div></section>`;
  }
  function renderYear(p){
    return `<section class="prediction-section"><div class="section-title"><div><h3>Month-by-month</h3><span>Your 12-month directional map.</span></div></div><div class="month-grid">${(p.months||[]).map(m=>`<article class="month-card ${toneClass(m.tone)}"><strong>${esc(m.month)}</strong>${chip(m.label,m.tone)}<b>${esc(m.score)}</b><small>${esc(m.summary)}</small></article>`).join('')}</div></section>`;
  }

  function renderLifeAreas(rows){
    if(!rows?.length)return '';
    const icons={career:'💼',business:'🏢',finance:'💰',love:'❤️',marriage:'💍',health:'🌿',family:'👨‍👩‍👧',education:'📚',travel:'✈️',property:'🏠',spirituality:'🪷'};
    return `<section class="prediction-section life-area-panel"><div class="section-title"><div><h3>Overall life areas</h3><span>One-year view across the major areas of life, using the same chart, Dasha and transit calculation layer.</span></div><div class="mini-key">${chip('Favorable','positive')}${chip('Neutral','neutral')}${chip('Challenging','negative')}</div></div><div class="life-area-grid">${rows.map(x=>`<article class="life-area-card ${toneClass(x.tone)}"><div class="life-area-head"><span class="life-area-icon">${icons[x.area]||'✦'}</span><div><strong>${esc(x.label)}</strong><small>${esc(x.outlook)}</small></div><b>${esc(x.score)}</b></div><div class="life-area-bar"><span style="width:${Math.max(4,Math.min(100,x.score))}%"></span></div><p>${esc((x.drivers?.[0]?.text)||`The ${x.label.toLowerCase()} pattern is ${x.outlook.toLowerCase()} in this period.`)}</p></article>`).join('')}</div></section>`;
  }
  function trustCard(c){
    const kindLabel = c.kind==='dosha' ? 'Pattern found' : c.kind==='yoga' ? 'Favorable combination' : 'Good news';
    const kindClass = c.kind==='dosha' ? 'negative' : 'positive';
    const evidence = c.evidence ? `<div class="trust-evidence"><span class="trust-evidence-label">📖 Found in classical text</span><strong>${esc(c.evidence.title)}</strong>${c.evidence.date&&c.evidence.date!=='Undated'?` <small>(${esc(c.evidence.date)})</small>`:''}<blockquote>"${esc(c.evidence.snippet)}"</blockquote></div>` : '';
    return `<article class="trust-card ${kindClass}">
      <div class="trust-card-head"><span class="trust-kind-chip ${kindClass}">${esc(kindLabel)}</span><h4>${esc(c.name)}${c.nameHindi?` <span class="trust-hindi">(${esc(c.nameHindi)})</span>`:''}</h4>${c.severity?`<span class="trust-severity">${esc(c.severity)}</span>`:''}</div>
      <dl class="trust-steps">
        <div class="trust-step"><dt>🔎 The situation</dt><dd>${esc(c.issue)}</dd></div>
        <div class="trust-step"><dt>❓ Why this is happening</dt><dd>${esc(c.cause)}</dd></div>
        <div class="trust-step"><dt>💡 What it means for you</dt><dd>${esc(c.solution)}</dd></div>
        ${c.remedy?`<div class="trust-step trust-remedy"><dt>🙏 Traditional remedy</dt><dd>${esc(c.remedy)}</dd></div>`:''}
      </dl>
      ${evidence}
    </article>`;
  }
  function renderTrustPanel(t){
    if(!t||!t.cards||!t.cards.length) return '';
    return `<section class="prediction-section trust-panel"><div class="section-title"><div><h3>Your Kundali, explained</h3><span>${t.hasIssues?'What we found in your chart, why it happens, and the classical remedy for it — each one traced to its source text where available.':'A look at the strongest patterns in your chart and how to use them.'}</span></div></div><div class="trust-grid">${t.cards.map(trustCard).join('')}</div><small class="trust-disclaimer">${esc(t.disclaimer||'')}</small></section>`;
  }
  function render(container,p,pref){
    if(!container||!p)return;
    const tone=toneClass(p.tone);
    let html=`<section class="prediction-card"><div class="prediction-hero"><div><span class="eyebrow">${esc(PERIODS[p.period]||'Personal forecast')} · ${esc(areaFor(pref))}</span><h2>${esc(p.headline)}</h2><p>${esc(p.summary)}</p><div class="guidance-banner ${tone}"><strong>${esc(toneText[tone]||p.label)}</strong><span>${esc(p.guidance||'Use the timing windows as guidance for the period.')}</span></div></div><div class="prediction-orb ${tone}"><strong>${esc(p.score)}</strong><span>/100</span><small>${esc(p.label)}</small></div></div>${renderDrivers(p.drivers)}${p.period==='year'?renderLifeAreas(p.lifeAreas):''}${p.period==='day'?renderDay(p):p.period==='week'?renderWeek(p):p.period==='month'?renderMonth(p):p.period==='year'?renderYear(p):''}<div class="prediction-basis"><strong>Why you are seeing this</strong><div>${(p.basis||[]).map(x=>`<span>${esc(x)}</span>`).join('')}</div><small>This is a deterministic, rule-based Jyotish interpretation. It is not an empirical probability or a guaranteed outcome.</small></div></section>${renderTrustPanel(p.kundaliTrust)}`;
    container.innerHTML=html;
    window.lucide?.createIcons?.();
  }
  window.HoraSaarPredictionView={render,PREFS,PERIODS};
})();
