(() => {
  const $ = (id) => document.getElementById(id);
  const esc = (x) => String(x ?? '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const state = { i18n: { languages: [], ui: {} }, locale: localStorage.getItem('jv-locale') || 'en' };

  function applyTheme(){
    document.documentElement.dataset.theme = localStorage.getItem('jv-theme') || 'light';
    const b = $('theme');
    if (b) b.setAttribute('aria-label', document.documentElement.dataset.theme === 'dark' ? 'Use light theme' : 'Use dark theme');
  }
  // Returns the key itself only as a last resort. Callers that have a sensible
  // English string pass it as `fallback`; without that, a nav label rendered
  // before /i18n finished loading showed the raw key ("navForecasts ▾").
  function t(key, fallback){
    return state.i18n.ui?.[state.locale]?.[key]
        || state.i18n.ui?.en?.[key]
        || fallback
        || key;
  }
  function setI18n(root=document){
    const dict = state.i18n.ui?.[state.locale] || state.i18n.ui?.en || {};
    root.querySelectorAll?.('[data-i18n]').forEach(el => { if (dict[el.dataset.i18n]) el.textContent = dict[el.dataset.i18n]; });
    root.querySelectorAll?.('[data-i18n-placeholder]').forEach(el => { if (dict[el.dataset.i18nPlaceholder]) el.placeholder = dict[el.dataset.i18nPlaceholder]; });
  }
  function renderLanguages(){
    const box = $('languageItems'); if (!box) return;
    box.innerHTML = (state.i18n.languages || []).map(x => `<button class="language-item ${x.code===state.locale?'selected':''}" type="button" data-code="${esc(x.code)}"><span>${esc(x.native)}</span><small>${esc(x.name)}</small></button>`).join('');
    box.querySelectorAll('.language-item').forEach(btn => btn.addEventListener('click', () => {
      state.locale = btn.dataset.code;
      localStorage.setItem('jv-locale', state.locale);
      document.documentElement.lang = state.locale;
      document.documentElement.dir = state.locale === 'ur' ? 'rtl' : 'ltr';
      $('languageShort') && ($('languageShort').textContent = state.locale.toUpperCase());
      $('languageMenu')?.classList.remove('open');
      $('languageToggle')?.setAttribute('aria-expanded', 'false');
      setI18n(document);
      renderMainNav(); window.dispatchEvent(new CustomEvent('jv:locale-change', { detail: { locale: state.locale } }));
    }));
    $('languageShort') && ($('languageShort').textContent = state.locale.toUpperCase());
  }
  async function initI18n(){
    try { state.i18n = await fetch('/i18n', { cache: 'no-store' }).then(r => r.json()); }
    catch { /* keep English defaults */ }
    document.documentElement.lang = state.locale;
    document.documentElement.dir = state.locale === 'ur' ? 'rtl' : 'ltr';
    renderLanguages();
    setI18n(document);
    // wireShell() runs before this resolves, so the nav was built with an empty
    // catalog. Rebuild it now that the real strings are available, and tell the
    // page so portal.js can re-render its own content in the new language.
    renderMainNav();
    window.dispatchEvent(new CustomEvent('jv:i18n-ready', { detail: { locale: state.locale } }));
  }
  /**
   * Primary navigation. Each item is [labelKey, englishLabel, englishHint, href].
   * Every href below resolves to a real route — previously eleven Knowledge
   * entries all pointed at /knowledge and the Panchang entries all pointed at
   * /panchang, so most of the menu was decorative.
   */
  const NAV = [
    {key:'navForecasts', label:'Forecasts', items:[
      ['navRashiBhavishya','Rāśi Based Bhavishya','Daily · Weekly · Monthly · Yearly','/rashi-bhavishya'],
      ['navPlanetBhavishya','Planet Based Bhavishya','Planet-wise timing and movement','/planet-bhavishya'],
      ['navNakshatraBhavishya','Nakshatra Based Bhavishya','Moon-cycle guidance','/nakshatra-bhavishya'],
      ['navHoroscope','Rāśi Horoscope','Ratings, lucky factors and remedies','/horoscope'],
      ['navAstronomy','Astronomy & World Sky','Conjunctions and interpretation','/astronomy'],
      ['navPersonalForecast','Personal Forecast','Birth-chart based guidance','/'],
      ['navDailyReports','Daily Email Report','Your topics at 07:00','/subscribe']
    ]},
    {key:'navPanchang', label:'Panchang', items:[
      ['navTodayPanchang','Today Panchang','Five limbs and time windows','/panchang?view=daily'],
      ['navWeeklyPanchang','Weekly Panchang','Seven-day timeline','/panchang?view=weekly'],
      ['navMonthlyPanchang','Monthly Panchang','Month-level calendar view','/panchang?view=monthly'],
      ['navHinduCalendar','Indian / Hindu Calendar','Year-wise festival framework','/calendar'],
      ['navMuhurat','Abhijit & Shubh Muhurat','Auspicious time windows','/panchang?view=daily#muhurat'],
      ['navHora','Hora','Twenty-four planetary hours','/panchang?view=hora'],
      ['navRahuKaal','Rahu Kaal','Inauspicious period today','/panchang?view=daily#muhurat'],
      ['navChoghadiya','Choghadiya','Day and night choghadiya','/panchang?view=choghadiya'],
      ['navSunriseSunset','Sunrise & Sunset','Local astronomical times','/panchang?view=daily'],
      ['navFestivals','Festivals','Tithi rule, deity and rituals','/knowledge/festivals']
    ]},
    {key:'navKundali', label:'Kundali', items:[
      ['navMilan','Kundali Milan','Full Ashtakoot compatibility','/kundali-milan'],
      ['navNatalChart','Birth / Natal Chart','Full chart calculation','/tools/natal-chart'],
      ['navDasha','Dasha','Vimshottari timing','/tools/dasha'],
      ['navNakshatraCalc','Nakshatra','Moon nakshatra and pada','/tools/nakshatra'],
      ['navRashiCalc','Rāśi / Moon Sign','Sidereal Moon sign','/tools/rashi'],
      ['navLagna','Ascendant / Lagna','Sidereal rising sign','/tools/rising-sign'],
      ['navTransit','Transit Chart','Current transits over the natal chart','/tools/transit-chart'],
      ['navMangalDosha','Mangal Dosha','Kuja dosha assessment','/tools/mangal-dosha'],
      ['navSadeSati','Shani Sade Sati','Saturn phase over the natal Moon','/tools/sade-sati'],
      ['navKaalSarp','Kaal Sarp Dosh','Nodal axis assessment','/tools/kaal-sarp-dosh']
    ]},
    {key:'navCalculators', label:'Calculators', items:[
      ['navAllCalculators','All Calculators','Twenty-six deterministic tools','/calculators'],
      ['navNumerology','Numerology','Name and birth-date numerology','/tools/numerology'],
      ['navSunSign','Sun Sign','Sidereal Sun sign','/tools/sun-sign'],
      ['navMoonSign','Moon Sign','Rāśi calculator','/tools/rashi'],
      ['navAyanamsa','Ayanamsa','Precession offset for a date','/tools/ayanamsa'],
      ['navMoonPhase','Moon Phase','Tithi and lunar phase','/tools/moon-phase'],
      ['navLove','Love Calculator','Name-based compatibility','/tools/love'],
      ['navFriendship','Friendship Calculator','Birth-chart friendship','/tools/friendship'],
      ['navLoShu','Lo Shu Grid','Numerology grid from birth date','/tools/lo-shu-grid'],
      ['navIshtaDevata','Ishta Devata','Jaimini deity indication','/tools/ishta-devata']
    ]},
    {key:'navKnowledge', label:'Knowledge', items:[
      ['navKnowledgeHome','Knowledge Library','Every reference topic in one place','/knowledge'],
      ['navGods','God Details','Deities, mantra, vahana and graha','/knowledge/gods'],
      ['navLords','Lord Details','Graha lordship, dignity and karakatva','/knowledge/lords'],
      ['navMantras','Mantra Details','Text, count, graha and source','/knowledge/mantras'],
      ['navTantra','Tantra Details','Traditions, rites and methods','/knowledge/tantra'],
      ['navYantra','Yantra Details','Geometry, metal and placement','/knowledge/yantra'],
      ['navGemstones','Gemstone Details','Metal, finger, weight and cautions','/knowledge/gemstones'],
      ['navRudraksha','Rudraksha Details','Mukhi, graha, chakra and mantra','/knowledge/rudraksha'],
      ['navChalisa','Chalisa Details','Deity, purpose and recommended day','/knowledge/chalisa'],
      ['navAarti','Aarti Details','Timing, opening line and items','/knowledge/aarti'],
      ['navNames','Names Details','Nakshatra-pada naming syllables','/knowledge/names'],
      ['navLists','Lists','Nakshatra, rāśi, months, yogas, concepts','/lists'],
      ['navScriptures','Scriptures','The bundled classical text corpus','/lists/scriptures'],
      ['navRishis','Rishis / Astrologers','Classical authors and teachers','/lists/rishis']
    ]}
  ];

  /** Marks the menu and item matching the current URL so the user can see where they are. */
  function markActive(root){
    const here = location.pathname.replace(/\/+$/,'') || '/';
    root.querySelectorAll('a[href]').forEach(a => {
      const href = a.getAttribute('href').split('?')[0].split('#')[0].replace(/\/+$/,'') || '/';
      const active = href === here || (href !== '/' && here.startsWith(href + '/'));
      a.classList.toggle('active', active);
      if (active) {
        a.setAttribute('aria-current','page');
        a.closest('.nav-menu')?.classList.add('has-active');
        const d = a.closest('details'); if (d) d.open = true;
      }
    });
  }

  function renderMainNav(){
    const nav=document.querySelector('.desktop-main-nav');
    const menuHtml=(m)=>m.items.map(x=>`<a href="${esc(x[3])}" role="menuitem"><strong>${esc(t(x[0],x[1]))}</strong><small>${esc(x[2])}</small></a>`).join('');
    if(nav){
      nav.innerHTML=NAV.map(m=>`<div class="nav-menu"><button type="button" aria-expanded="false" aria-haspopup="true">${esc(t(m.key,m.label))}<span class="nav-caret" aria-hidden="true">▾</span></button><div class="nav-dropdown" role="menu">${menuHtml(m)}</div></div>`).join('');
      nav.querySelectorAll('.nav-menu>button').forEach(btn=>btn.addEventListener('click',e=>{
        e.stopPropagation();
        const menu=btn.parentElement;
        nav.querySelectorAll('.nav-menu').forEach(x=>{if(x!==menu){x.classList.remove('open');x.querySelector('button')?.setAttribute('aria-expanded','false');}});
        const open=menu.classList.toggle('open');
        btn.setAttribute('aria-expanded',String(open));
      }));
      // Keyboard users need a way out of an open dropdown.
      nav.addEventListener('keydown',e=>{ if(e.key==='Escape'){ nav.querySelectorAll('.nav-menu').forEach(x=>x.classList.remove('open')); nav.querySelectorAll('.nav-menu>button').forEach(b=>b.setAttribute('aria-expanded','false')); }});
      markActive(nav);
    }
    if(!renderMainNav._outsideBound){
      document.addEventListener('click',()=>document.querySelectorAll('.desktop-main-nav .nav-menu').forEach(x=>{x.classList.remove('open');x.querySelector('button')?.setAttribute('aria-expanded','false');}));
      renderMainNav._outsideBound=true;
    }

    let toggle=document.getElementById('mobileNavToggle');
    let panel=document.getElementById('mobileNavPanel');
    let scrim=document.getElementById('mobileNavScrim');
    const closeMobile=()=>{panel?.classList.remove('open');scrim?.classList.remove('open');toggle?.setAttribute('aria-expanded','false');document.body.classList.remove('nav-locked');};
    if(!scrim){ scrim=document.createElement('div'); scrim.id='mobileNavScrim'; scrim.className='mobile-nav-scrim'; document.body.appendChild(scrim); scrim.addEventListener('click',closeMobile); }
    if(!toggle){
      toggle=document.createElement('button'); toggle.id='mobileNavToggle'; toggle.className='mobile-nav-toggle'; toggle.type='button';
      toggle.setAttribute('aria-expanded','false'); toggle.setAttribute('aria-label','Open navigation'); toggle.setAttribute('aria-controls','mobileNavPanel');
      toggle.innerHTML='<span class="burger" aria-hidden="true"></span>';
      document.querySelector('.topbar')?.appendChild(toggle);
      toggle.addEventListener('click',()=>{
        const open=!panel?.classList.contains('open');
        panel?.classList.toggle('open',open); scrim?.classList.toggle('open',open);
        toggle.setAttribute('aria-expanded',String(open));
        document.body.classList.toggle('nav-locked',open);
      });
    }
    if(!panel){
      panel=document.createElement('div'); panel.id='mobileNavPanel'; panel.className='mobile-nav-panel';
      panel.setAttribute('aria-label','Navigation'); document.body.appendChild(panel);
      panel.addEventListener('click',e=>{ if(e.target.closest('a')) closeMobile(); });
    }
    document.addEventListener('keydown',e=>{ if(e.key==='Escape') closeMobile(); });
    panel.innerHTML=`<div class="mobile-nav-head"><span class="brand-mark">ॐ</span><strong>HoraSaar</strong></div>`
      + NAV.map(m=>`<details><summary>${esc(t(m.key,m.label))}</summary>${menuHtml(m)}</details>`).join('')
      + `<a class="mobile-nav-cta" href="/subscribe"><strong>${esc(t('navDailyReports','Daily Email Report'))}</strong><small>${esc(t('dailyAt7','Your topics at 07:00'))}</small></a>`;
    markActive(panel);
  }

  /**
   * Global loader. The previous version showed a bare "Working…" card with a
   * 20-second blind auto-hide. This one keeps the devotional register of the
   * rest of the app, rotates a short line so a slow calculation does not look
   * frozen, and traps focus so a screen reader announces the wait.
   */
  const LOADER_LINES = [
    ['loaderCalc','Calculating planetary positions…'],
    ['loaderPanchang','Reading the five limbs of the day…'],
    ['loaderDasha','Measuring the Dasha timeline…'],
    ['loaderRules','Applying classical rules…'],
    ['loaderCompose','Composing your reading…']
  ];
  function wireGlobalLoader(){
    let el=document.getElementById('jvGlobalLoader');
    if(!el){
      el=document.createElement('div'); el.id='jvGlobalLoader'; el.className='global-loader'; el.setAttribute('aria-hidden','true');
      el.innerHTML=`<div class="loader-card" role="status" aria-live="polite">
        <div class="loader-mandala" aria-hidden="true"><span class="loader-ring"></span><span class="loader-om">ॐ</span></div>
        <strong class="loader-title">${esc(t('loading','Please wait'))}</strong>
        <small class="loader-line">${esc(t(LOADER_LINES[0][0],LOADER_LINES[0][1]))}</small>
        <div class="loader-bar" aria-hidden="true"><span></span></div>
      </div>`;
      document.body.appendChild(el);
    }
    let timer, rotate, step=0;
    const lineEl=()=>el.querySelector('.loader-line');
    const show=(label)=>{
      if(label){ const s=el.querySelector('.loader-title'); if(s) s.textContent=label; }
      step=0; lineEl() && (lineEl().textContent=t(LOADER_LINES[0][0],LOADER_LINES[0][1]));
      clearInterval(rotate);
      rotate=setInterval(()=>{ step=(step+1)%LOADER_LINES.length; const l=lineEl(); if(l) l.textContent=t(LOADER_LINES[step][0],LOADER_LINES[step][1]); },1400);
      clearTimeout(timer);
      el.classList.add('show'); el.setAttribute('aria-hidden','false'); document.body.classList.add('loading');
      // Safety net only — every flow calls hide() as soon as its request settles.
      timer=setTimeout(hide,20000);
    };
    const hide=()=>{clearTimeout(timer);clearInterval(rotate);el.classList.remove('show');el.setAttribute('aria-hidden','true');document.body.classList.remove('loading');};
    document.addEventListener('submit',e=>{if(e.target instanceof HTMLFormElement)show()},true);
    document.addEventListener('click',e=>{
      const a=e.target.closest('a.btn,button.btn.primary,button[data-loading]');
      if(!a||a.disabled)return;
      if(a.closest('.language-wrap'))return;
      const href=a.getAttribute('href');
      if(href==='#'||href?.startsWith('#'))return;   // in-page anchors never navigate
      if(a.target==='_blank')return;
      show();
    },true);
    window.addEventListener('pageshow',hide);
    window.addEventListener('jv:i18n-ready',()=>{ const s=el.querySelector('.loader-title'); if(s) s.textContent=t('loading','Please wait'); });
    window.HoraSaarUI = window.HoraSaarUI || {};
    window.HoraSaarUI.showLoader = show;
    window.HoraSaarUI.hideLoader = hide;
  }
  function fallbackIcons(){ document.querySelectorAll('i[data-lucide]').forEach(i=>{if(!i.textContent)i.textContent='•';}); }
  function wireShell(){
    $('languageToggle')?.addEventListener('click', () => {
      const open = !$('languageMenu').classList.contains('open');
      $('languageMenu').classList.toggle('open', open);
      $('languageToggle').setAttribute('aria-expanded', String(open));
      if (open) setTimeout(() => $('languageSearch')?.focus(), 0);
    });
    $('languageSearch')?.addEventListener('input', e => {
      const q = e.target.value.trim().toLowerCase();
      document.querySelectorAll('.language-item').forEach(x => x.classList.toggle('hidden', q && !x.textContent.toLowerCase().includes(q)));
    });
    document.addEventListener('click', e => {
      if (!e.target.closest('.language-wrap')) {
        $('languageMenu')?.classList.remove('open');
        $('languageToggle')?.setAttribute('aria-expanded', 'false');
      }
    });
    $('theme')?.addEventListener('click', () => {
      const next = document.documentElement.dataset.theme === 'dark' ? 'light' : 'dark';
      localStorage.setItem('jv-theme', next); applyTheme();
    });
    renderMainNav();
    wireGlobalLoader();
    if (window.lucide?.createIcons) lucide.createIcons(); else fallbackIcons();
  }
  window.HoraSaarUI = Object.assign(window.HoraSaarUI || {}, { $, esc, t, state, applyTheme, initI18n, setI18n });
  applyTheme();
  wireShell();
  initI18n();
})();