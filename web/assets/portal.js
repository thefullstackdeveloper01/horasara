(() => {
  const esc = window.HoraSaarUI?.esc || (x => String(x??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c])));
  const tr=(key,fallback)=>window.HoraSaarUI?.t?.(key)||fallback||key;
  const key = window.HoraSaarPortal?.key || 'home';
  const $ = id => document.getElementById(id);
  let catalog = null;
  const state = {date:new Date().toISOString().slice(0,10), sign:'Aries', nakshatra:'Ashvinī', planet:'Sun', year:new Date().getUTCFullYear()};
  const setStatus=(m,type='ok')=>{const s=$('portalStatus');s.textContent=m;s.className='status show '+type;};
  const cards=(items, cls='feature-grid')=>`<div class="${cls}">${items.map(x=>`<article class="feature portal-card"><span class="feature-icon">${esc(x.icon||'✦')}</span><span><b>${esc(x.title)}</b><small>${esc(x.text||'')}</small>${x.href?`<a class="inline-link" href="${esc(x.href)}">Open</a>`:''}</span></article>`).join('')}</div>`;
  const section=(title,body,sub='')=>`<section class="card portal-section"><div class="card-header"><div><h2>${esc(title)}</h2>${sub?`<p>${esc(sub)}</p>`:''}</div></div>${body}</section>`;
  function controls(html){$('portalControls').innerHTML=html;}
  const PATH = window.HoraSaarPortal?.path || location.pathname;
  const SEG = PATH.split('/').filter(Boolean).map(decodeURIComponent);
  const QS = new URLSearchParams(location.search);
  const titleCase = s => String(s||'').replace(/-/g,' ').replace(/\b\w/g,c=>c.toUpperCase());

  /** Breadcrumb trail. Deep reference pages are several levels down now. */
  function crumbs(trail){
    const el=document.getElementById('portalCrumbs') || (()=>{
      const n=document.createElement('nav'); n.id='portalCrumbs'; n.className='crumbs'; n.setAttribute('aria-label','Breadcrumb');
      document.getElementById('portal')?.prepend(n); return n;
    })();
    el.innerHTML=trail.map((c,i)=> i===trail.length-1
      ? `<span aria-current="page">${esc(c[0])}</span>`
      : `<a href="${esc(c[1])}">${esc(c[0])}</a><span class="crumb-sep" aria-hidden="true">›</span>`).join('');
  }

  function setHero(title, desc, eyebrow){
    const h=document.getElementById('portalTitle'); if(h) h.textContent=title;
    const d=document.getElementById('portalDescription'); if(d) d.textContent=desc;
    const e=document.getElementById('portalEyebrow'); if(e && eyebrow) e.textContent=eyebrow;
    document.title = `${title} | HoraSaar`;
  }

  /** Render an object as a definition grid, using the topic's declared field order. */
  function detailGrid(entry, fields){
    const labels={alsoKnownAs:'Also known as',bodyPart:'Body part',padaNavamsa:'Pada navamsa',dashaYears:'Dasha years',
      purnimaNakshatra:'Purnima nakshatra',wearingMetal:'Metal',nakshatraLord:'Nakshatra lord',bestTime:'Best time'};
    const order = (fields && fields.length) ? fields : Object.keys(entry).filter(k=>!['id','name'].includes(k));
    const rows = order.filter(k=>entry[k]!=null && entry[k]!=='').map(k=>{
      const v=Array.isArray(entry[k]) ? entry[k].join(', ') : String(entry[k]);
      const label = labels[k] || k.replace(/([A-Z])/g,' $1').replace(/^./,c=>c.toUpperCase());
      const long = v.length>110;
      return `<div class="kv${long?' kv-wide':''}"><small>${esc(label)}</small><div class="value">${esc(v)}</div></div>`;
    }).join('');
    return `<div class="result-grid detail-grid">${rows||'<p class="section-note">No further detail recorded for this entry.</p>'}</div>`;
  }

  /* ------------------------------------------------------- dispatcher */
  function renderCatalog(){
    const signs=catalog?.signs||[];
    const naks=catalog?.nakshatras||[];
    const planets=catalog?.planets||[];
    if(key==='rashi'){controls(`<label class="field-inline">Period <select id="periodSel"><option>daily</option><option>weekly</option><option>monthly</option><option>yearly</option></select></label><label class="field-inline">Rāśi <select id="signSel">${signs.map(s=>`<option value="${esc(s.english||s.name)}" ${s.english===state.sign||s.name===state.sign?'selected':''}>${esc(s.name)} · ${esc(s.english||'')}</option>`).join('')}</select></label><label class="field-inline">Date <input id="dateSel" type="date" value="${state.date}"></label>`); $('signSel').onchange=()=>{state.sign=$('signSel').value;loadHoroscope()}; $('dateSel').onchange=()=>{state.date=$('dateSel').value;loadHoroscope()}; $('periodSel').onchange=loadHoroscope; loadHoroscope(); return;}
    if(key==='nakshatra'){controls(`<label class="field-inline">Period <select id="periodSel"><option>daily</option><option>weekly</option><option>monthly</option><option>yearly</option></select></label><label class="field-inline">Nakshatra <select id="nakSel">${naks.map(n=>`<option ${n.name===state.nakshatra?'selected':''}>${esc(n.name)}</option>`).join('')}</select></label><label class="field-inline">Date <input id="dateSel" type="date" value="${state.date}"></label>`); $('nakSel').onchange=()=>{state.nakshatra=$('nakSel').value;renderNakshatra()}; $('dateSel').onchange=()=>{state.date=$('dateSel').value;renderNakshatra()}; $('periodSel').onchange=renderNakshatra; renderNakshatra(); return;}
    if(key==='planet'){controls(`<label class="field-inline">Period <select id="periodSel"><option>daily</option><option>weekly</option><option>monthly</option><option>yearly</option></select></label><label class="field-inline">Planet <select id="planetSel">${planets.map(p=>`<option ${p===state.planet?'selected':''}>${esc(p)}</option>`).join('')}</select></label><label class="field-inline">Rāśi <select id="signSel">${signs.map(s=>`<option value="${esc(s.english||s.name)}" ${s.english===state.sign||s.name===state.sign?'selected':''}>${esc(s.name)} · ${esc(s.english||'')}</option>`).join('')}</select></label><label class="field-inline">Date <input id="dateSel" type="date" value="${state.date}"></label>`); $('planetSel').onchange=()=>{state.planet=$('planetSel').value;loadHoroscope()}; $('signSel').onchange=()=>{state.sign=$('signSel').value;loadHoroscope()}; $('dateSel').onchange=()=>{state.date=$('dateSel').value;loadHoroscope()}; $('periodSel').onchange=loadHoroscope; loadHoroscope(); return;}
    if(key==='panchang'){
      // The Panchang menu entries deep-link with ?view=, so the control has to
      // start on the requested view rather than always on "daily".
      const view=['daily','weekly','monthly','yearly','choghadiya','hora'].includes(QS.get('view'))?QS.get('view'):'daily';
      controls(`<label class="field-inline">View <select id="panchangPeriod">${['daily','weekly','monthly','yearly','choghadiya','hora'].map(v=>`<option value="${v}" ${v===view?'selected':''}>${titleCase(v)}</option>`).join('')}</select></label><label class="field-inline">Date <input id="dateSel" type="date" value="${state.date}"></label><label class="field-inline">Latitude <input id="latSel" type="number" step="0.0001" value="23.0225"></label><label class="field-inline">Longitude <input id="lonSel" type="number" step="0.0001" value="72.5714"></label><label class="field-inline">UTC offset <input id="tzSel" type="number" step="0.5" value="5.5"></label>`);
      ['dateSel','latSel','lonSel','tzSel','panchangPeriod'].forEach(id=>$(id).onchange=loadPanchang); loadPanchang(); return;}
    if(key==='astronomy'){controls(`<label class="field-inline">Date <input id="dateSel" type="date" value="${state.date}"></label>`);$('dateSel').onchange=()=>{state.date=$('dateSel').value;loadAstronomy()};loadAstronomy();return;}
    if(key==='horoscope'){renderHoroscopeIndex();return;}
    if(key==='horoscope-sign'){renderHoroscopeSign(SEG[1]);return;}
    if(key==='calculators'){renderCalculators();return;}
    if(key==='lists'){renderListsIndex();return;}
    if(key==='list-group'){renderListGroup(SEG[1]);return;}
    if(key==='list-entry'){renderListEntry(SEG[1],SEG[2]);return;}
    if(key==='knowledge'){renderKnowledgeIndex();return;}
    if(key==='knowledge-topic'){renderKnowledgeTopic(SEG[1]);return;}
    if(key==='knowledge-entry'){renderKnowledgeEntry(SEG[1],SEG[2]);return;}
    if(key==='milan'){renderMilan();return;}
    if(key==='calendar'){controls(`<label class="field-inline">Year <input id="yearSel" type="number" min="1900" max="2100" value="${state.year}"></label><a class="btn secondary" href="/panchang?view=daily">Open daily Panchang</a>`);$('yearSel').onchange=()=>renderCalendar();renderCalendar();return;}
    if(key==='home'){controls('<a class="btn primary" href="/">Build my personal forecast</a>');$('portalContent').innerHTML=section('Explore HoraSaar',cards(catalog?.home||[]));}
  }

  /* --------------------------------------------------- shared fetching */
  async function api(url){
    const r=await fetch(url,{headers:{accept:'application/json'}});
    const d=await r.json().catch(()=>({}));
    if(!r.ok) throw new Error(d.message||d.error||`Request failed (${r.status})`);
    return d;
  }
  const skeleton=(n=6)=>`<div class="feature-grid">${Array.from({length:n},()=>'<article class="feature skeleton"><span class="sk-line"></span><span class="sk-line short"></span></article>').join('')}</div>`;

  /* ------------------------------------------------------- calculators */
  async function renderCalculators(){
    crumbs([['Home','/'],['Calculators','/calculators']]);
    controls('<input id="calcSearch" class="portal-search" placeholder="Search a calculator" aria-label="Search calculators">');
    $('portalContent').innerHTML=skeleton(8);
    try{
      setStatus('Loading calculator directory…');
      // /calculators is the HTML page; the audit JSON lives at /api/calculators
      // so the page route can no longer shadow its own data source.
      const d=await api('/api/calculators');
      const all=d.calculators||[];
      const draw=()=>{
        const q=($('calcSearch')?.value||'').toLowerCase();
        const shown=all.filter(c=>`${c.name} ${c.category} ${c.method}`.toLowerCase().includes(q));
        $('portalContent').innerHTML=section(`Calculator directory — ${shown.length} of ${all.length}`,
          shown.length?cards(shown.map(c=>({title:c.name,text:`${titleCase(c.category)} · inputs: ${(c.inputs||[]).join(', ')||'none'}`,href:`/tools/${c.id}`,icon:'⌁'})))
          :'<p class="section-note">No calculator matches that search.</p>');
      };
      $('calcSearch').oninput=draw; draw(); setStatus('');
    }catch(e){ setStatus(e.message,'err'); $('portalContent').innerHTML=section('Calculators','<p class="section-note">The calculator directory could not be loaded.</p>'); }
  }

  /* --------------------------------------------------------- knowledge */
  async function renderKnowledgeIndex(){
    crumbs([['Home','/'],['Knowledge','/knowledge']]);
    controls('<input id="knowledgeSearch" class="portal-search" placeholder="Search deities, mantras, gemstones, nakshatras…" aria-label="Search the reference library">');
    $('portalContent').innerHTML=skeleton(9);
    try{
      const d=await api('/api/knowledge');
      const topics=d.topics||[];
      const drawTopics=()=>{$('portalContent').innerHTML=section('Reference topics',
        cards(topics.map(t=>({title:`${t.title} (${t.count})`,text:t.description,href:t.href,icon:t.icon}))),
        'Each topic below is its own page with full entries.');};
      drawTopics();
      let timer;
      $('knowledgeSearch').oninput=()=>{
        clearTimeout(timer);
        const q=$('knowledgeSearch').value.trim();
        if(q.length<2){drawTopics();return;}
        timer=setTimeout(async()=>{
          try{
            const r=await api('/api/reference/search?q='+encodeURIComponent(q));
            $('portalContent').innerHTML=section(`Search results for “${q}” — ${r.matches.length}`,
              r.matches.length?cards(r.matches.map(m=>({title:m.name,text:m.groupTitle,href:m.href,icon:m.icon})))
              :'<p class="section-note">Nothing matched. Try a deity, planet, gemstone or nakshatra name.</p>');
          }catch(e){setStatus(e.message,'err');}
        },250);
      };
      setStatus('');
    }catch(e){setStatus(e.message,'err');}
  }

  async function renderKnowledgeTopic(id){
    $('portalContent').innerHTML=skeleton(6);
    try{
      const t=await api('/api/knowledge/'+encodeURIComponent(id));
      crumbs([['Home','/'],['Knowledge','/knowledge'],[t.title,t.href]]);
      setHero(`${t.icon} ${t.title}`, t.description, t.category);
      controls(`<input id="topicSearch" class="portal-search" placeholder="Search within ${esc(t.title)}" aria-label="Search within this topic">`);
      const draw=()=>{
        const q=($('topicSearch')?.value||'').toLowerCase();
        const shown=t.items.filter(x=>JSON.stringify(x).toLowerCase().includes(q));
        $('portalContent').innerHTML=section(`${t.title} — ${shown.length} of ${t.count}`,
          shown.length?`<div class="entry-grid">${shown.map(x=>`<a class="entry-card" href="/knowledge/${esc(t.id)}/${esc(x.id)}">
            <span class="entry-icon" aria-hidden="true">${esc(t.icon)}</span>
            <strong>${esc(x.name)}</strong>
            <small>${esc(x.attributes||x.purpose||x.benefits||x.summary||x.significance||x.karaka||x.deity||x.description||'')}</small>
            ${x.graha||x.planet?`<span class="entry-tag">${esc(x.graha||x.planet)}</span>`:''}
          </a>`).join('')}</div>`
          :'<p class="section-note">Nothing in this topic matches that search.</p>');
      };
      $('topicSearch').oninput=draw; draw(); setStatus('');
    }catch(e){setStatus(e.message,'err');$('portalContent').innerHTML=section('Not available','<p class="section-note">This topic could not be loaded.</p>');}
  }

  async function renderKnowledgeEntry(topicId,entryId){
    $('portalContent').innerHTML=skeleton(3);
    try{
      const d=await api(`/api/knowledge/${encodeURIComponent(topicId)}/${encodeURIComponent(entryId)}`);
      const {topic,entry}=d;
      crumbs([['Home','/'],['Knowledge','/knowledge'],[topic.title,`/knowledge/${topic.id}`],[entry.name,d.href]]);
      setHero(`${topic.icon} ${entry.name}`, entry.attributes||entry.purpose||entry.summary||entry.significance||entry.benefits||topic.title, topic.title);
      controls(`<a class="btn secondary" href="/knowledge/${esc(topic.id)}">← All ${esc(topic.title)}</a>`);
      const mantra = entry.mantra || entry.primary_mantra || entry.text;
      const highlight = mantra ? `<section class="card portal-section mantra-card"><div class="mantra-om" aria-hidden="true">ॐ</div><blockquote class="mantra-text">${esc(mantra)}</blockquote>${entry.transliteration?`<p class="mantra-translit">${esc(entry.transliteration)}</p>`:''}${entry.count?`<p class="section-note">Traditional japa count: ${esc(entry.count)}</p>`:''}</section>` : '';
      $('portalContent').innerHTML = highlight
        + section(`${entry.name} — reference`, detailGrid(entry, topic.fields))
        + section('Scope', `<p class="section-note">${esc(entry.note||entry.caution||'Reference material drawn from classical sources. Interpretive statements are traditional rule-based guidance, not scientific claims.')}</p>`);
      setStatus('');
    }catch(e){setStatus(e.message,'err');$('portalContent').innerHTML=section('Not available','<p class="section-note">This entry could not be loaded.</p>');}
  }

  /* ------------------------------------------------------------- lists */
  async function renderListsIndex(){
    crumbs([['Home','/'],['Lists','/lists']]);
    controls('<input id="listIndexSearch" class="portal-search" placeholder="Search every list entry" aria-label="Search lists">');
    $('portalContent').innerHTML=skeleton(9);
    try{
      const d=await api('/api/lists');
      const groups=d.groups||[];
      const drawGroups=()=>{$('portalContent').innerHTML=section('Reference lists',
        cards(groups.map(g=>({title:`${g.title} (${g.count})`,text:g.description,href:g.href,icon:g.icon}))),
        'Every item inside these lists has its own page.');};
      drawGroups();
      let timer;
      $('listIndexSearch').oninput=()=>{
        clearTimeout(timer);
        const q=$('listIndexSearch').value.trim();
        if(q.length<2){drawGroups();return;}
        timer=setTimeout(async()=>{
          try{
            const r=await api('/api/reference/search?q='+encodeURIComponent(q));
            $('portalContent').innerHTML=section(`Search results for “${q}” — ${r.matches.length}`,
              r.matches.length?cards(r.matches.map(m=>({title:m.name,text:m.groupTitle,href:m.href,icon:m.icon})))
              :'<p class="section-note">Nothing matched that search.</p>');
          }catch(e){setStatus(e.message,'err');}
        },250);
      };
      setStatus('');
    }catch(e){setStatus(e.message,'err');}
  }

  async function renderListGroup(id){
    $('portalContent').innerHTML=skeleton(8);
    let offset=0; const PAGE=60; let query='';
    const load=async(reset)=>{
      if(reset) offset=0;
      const d=await api(`/api/lists/${encodeURIComponent(id)}?limit=${PAGE}&offset=${offset}&q=${encodeURIComponent(query)}`);
      if(reset){
        crumbs([['Home','/'],['Lists','/lists'],[d.title,d.href]]);
        setHero(`${d.icon} ${d.title}`, d.description, 'Reference list');
      }
      const grid=`<div class="entry-grid">${d.items.map(x=>`<a class="entry-card" href="/lists/${esc(d.id)}/${esc(x.id)}">
        <span class="entry-icon" aria-hidden="true">${esc(d.icon)}</span>
        <strong>${esc(x.name)}</strong>
        <small>${esc(x.summary||x.description||x.contribution||x.traits||x.note||x.author||x.deity||x.karaka||'')}</small>
        ${x.lord?`<span class="entry-tag">${esc(x.lord)}</span>`:''}
      </a>`).join('')}</div>`;
      const more = (offset+d.count) < d.total
        ? `<div class="actions"><button class="btn secondary" id="loadMore" type="button">Show more (${d.total-offset-d.count} remaining)</button></div>` : '';
      const html=section(`${d.title} — showing ${offset+d.count} of ${d.total}`, grid+more);
      if(reset) $('portalContent').innerHTML=html; else $('portalContent').innerHTML=html;
      const btn=document.getElementById('loadMore');
      if(btn) btn.onclick=async()=>{ offset+=PAGE; btn.disabled=true; await load(false); };
      setStatus('');
    };
    try{
      controls(`<input id="groupSearch" class="portal-search" placeholder="Search this list" aria-label="Search this list">`);
      let timer;
      $('groupSearch').oninput=()=>{clearTimeout(timer);timer=setTimeout(()=>{query=$('groupSearch').value.trim();load(true).catch(e=>setStatus(e.message,'err'));},250);};
      await load(true);
    }catch(e){setStatus(e.message,'err');$('portalContent').innerHTML=section('Not available','<p class="section-note">This list could not be loaded.</p>');}
  }

  async function renderListEntry(groupId,entryId){
    $('portalContent').innerHTML=skeleton(3);
    try{
      const d=await api(`/api/lists/${encodeURIComponent(groupId)}/${encodeURIComponent(entryId)}`);
      const {group,entry}=d;
      crumbs([['Home','/'],['Lists','/lists'],[group.title,`/lists/${group.id}`],[entry.name,d.href]]);
      setHero(`${group.icon} ${entry.name}`, entry.summary||entry.traits||entry.contribution||entry.note||group.title, group.title);
      controls(`<a class="btn secondary" href="/lists/${esc(group.id)}">← All ${esc(group.title)}</a>`);
      const lead = entry.detail || entry.description || entry.traits || entry.contribution || '';
      $('portalContent').innerHTML =
        (lead?`<section class="card portal-section lead-card"><p class="lead-text">${esc(lead)}</p></section>`:'')
        + section(`${entry.name} — reference`, detailGrid(entry, group.fields))
        + (entry.hindi?section('हिन्दी',`<p class="lead-text">${esc(entry.hindi)}</p>`):'')
        + (entry.gujarati?section('ગુજરાતી',`<p class="lead-text">${esc(entry.gujarati)}</p>`):'')
        + (entry.textId?section('Full text',`<p class="section-note">This title is part of the bundled corpus.</p><a class="btn secondary" href="/knowledge/text/${esc(entry.textId)}?body=1">Open the text record</a>`):'');
      setStatus('');
    }catch(e){setStatus(e.message,'err');$('portalContent').innerHTML=section('Not available','<p class="section-note">This entry could not be loaded.</p>');}
  }

  /* --------------------------------------------------------- horoscope */
  const stars=n=>`<span class="stars" aria-label="${n} out of 5">${'★'.repeat(n)}${'☆'.repeat(5-n)}</span>`;

  async function renderHoroscopeIndex(){
    crumbs([['Home','/'],['Horoscope','/horoscope']]);
    const period=['daily','weekly','monthly','yearly'].includes(QS.get('period'))?QS.get('period'):'daily';
    controls(`<div class="period-tabs" role="tablist">${['daily','weekly','monthly','yearly'].map(p=>`<button type="button" role="tab" class="period-tab ${p===period?'active':''}" data-period="${p}" aria-selected="${p===period}">${titleCase(p)}</button>`).join('')}</div><label class="field-inline">Date <input id="dateSel" type="date" value="${state.date}"></label>`);
    const load=async(p)=>{
      $('portalContent').innerHTML=skeleton(12);
      try{
        setStatus('Reading today’s transits…');
        const d=await api(`/api/horoscope?period=${encodeURIComponent(p)}&date=${encodeURIComponent($('dateSel').value||state.date)}`);
        setHero('Rāśi Horoscope', `${titleCase(p)} reading for all twelve rāśi, from calculated planetary transits.`, 'Horoscope');
        const moonNote=`<p class="section-note">Moon is in ${esc(d.moon.sign)}, ${esc(d.moon.nakshatra)} nakshatra (pada ${esc(d.moon.pada)}), ruled by ${esc(d.moon.nakshatraLord)}. This sets the emotional tone shared by every sign today.</p>`;
        $('portalContent').innerHTML=section(`${titleCase(p)} horoscope — ${esc(d.date)}`,
          moonNote+`<div class="sign-grid">${d.signs.map(s=>`<a class="sign-card tone-${esc(s.tone)}" href="/horoscope/${esc(s.sign.toLowerCase())}?period=${esc(p)}">
            <span class="sign-symbol" aria-hidden="true">${esc(s.symbol)}</span>
            <strong>${esc(s.sign)}</strong>
            <em>${esc(s.sanskrit)} · ${esc(s.hindi)}</em>
            ${stars(s.stars)}
            <span class="sign-score">${esc(s.score)}/100 · ${esc(s.toneLabel)}</span>
            <small>${esc(s.summary)}</small>
          </a>`).join('')}</div>`)
          + section('Method',`<p class="section-note">${esc(d.disclaimer)} Readings are generated from calculated transits read from each rāśi; the same sign and date always produce the same result.</p>`);
        setStatus('');
      }catch(e){setStatus(e.message,'err');}
    };
    document.querySelectorAll('.period-tab').forEach(b=>b.onclick=()=>{
      document.querySelectorAll('.period-tab').forEach(x=>{x.classList.remove('active');x.setAttribute('aria-selected','false')});
      b.classList.add('active'); b.setAttribute('aria-selected','true');
      history.replaceState({},'',`/horoscope?period=${b.dataset.period}`);
      load(b.dataset.period);
    });
    $('dateSel').onchange=()=>load(document.querySelector('.period-tab.active')?.dataset.period||period);
    await load(period);
  }

  async function renderHoroscopeSign(slug){
    const period=['daily','weekly','monthly','yearly'].includes(QS.get('period'))?QS.get('period'):'daily';
    controls(`<div class="period-tabs" role="tablist">${['daily','weekly','monthly','yearly'].map(p=>`<button type="button" role="tab" class="period-tab ${p===period?'active':''}" data-period="${p}" aria-selected="${p===period}">${titleCase(p)}</button>`).join('')}</div><label class="field-inline">Date <input id="dateSel" type="date" value="${state.date}"></label><label class="field-inline">Rāśi <select id="signPick"></select></label>`);
    const load=async(p)=>{
      $('portalContent').innerHTML=skeleton(4);
      try{
        setStatus('Reading transits for this rāśi…');
        const d=await api(`/api/horoscope?sign=${encodeURIComponent(slug)}&period=${encodeURIComponent(p)}&date=${encodeURIComponent($('dateSel').value||state.date)}`);
        const h=d.horoscope;
        crumbs([['Home','/'],['Horoscope','/horoscope'],[h.sign,`/horoscope/${slug}`]]);
        setHero(`${h.symbol} ${h.sign} — ${titleCase(p)} Horoscope`, `${h.sanskrit} · ${h.hindi} · ruled by ${h.lord} · ${h.element} · ${h.quality}`, 'Rāśi Horoscope');
        const pick=$('signPick');
        if(pick && !pick.options.length){
          pick.innerHTML=d.signList.map(s=>`<option value="${esc(s.slug)}" ${s.slug===slug?'selected':''}>${esc(s.symbol)} ${esc(s.name)} · ${esc(s.sanskrit)}</option>`).join('');
          pick.onchange=()=>location.href=`/horoscope/${pick.value}?period=${document.querySelector('.period-tab.active')?.dataset.period||p}`;
        }
        const overall=`<section class="card portal-section overall-card tone-${esc(h.overall.tone)}">
          <div class="overall-top">
            <div class="overall-score"><b>${esc(h.overall.score)}</b><span>/100</span></div>
            <div><h2>${esc(h.overall.headline)}</h2>${stars(h.overall.stars)}<span class="forecast-chip ${h.overall.tone==='supportive'?'positive':h.overall.tone==='testing'?'negative':'neutral'}">${esc(h.overall.toneLabel)}</span></div>
          </div>
          ${h.overall.reading.map(x=>`<p class="reading-para">${esc(x)}</p>`).join('')}
          <p class="section-note">Window: ${esc(h.range.start)} to ${esc(h.range.end)} (${esc(h.range.days)} day${h.range.days>1?'s':''}).</p>
        </section>`;
        const areasHtml=section('Life areas',
          `<div class="area-grid">${h.areas.filter(a=>a.id!=='overall').map(a=>`<article class="area-card tone-${esc(a.tone)}">
            <header><span class="area-icon" aria-hidden="true">${esc(a.icon)}</span><strong>${esc(a.label)}</strong></header>
            <div class="area-meter"><span style="width:${Math.max(4,Math.min(100,a.score))}%"></span></div>
            <div class="area-score">${stars(a.stars)}<b>${esc(a.score)}/100</b><span>${esc(a.toneLabel)}</span></div>
            <p>${esc(a.text)}</p>
          </article>`).join('')}</div>`);
        const luckyHtml=section('Lucky factors',
          `<div class="result-grid">${[
            ['Lucky number',`${h.lucky.number} (also ${h.lucky.alternateNumber})`],
            ['Lucky colour',h.lucky.color],['Direction',h.lucky.direction],['Best time',h.lucky.time],
            ['Metal',h.lucky.metal],['Gemstone',h.lucky.gemstone],['Deity',h.lucky.deity],
            ['Weekday lord',`${h.lucky.weekday} · ${h.lucky.weekdayLord}`],['Strongest area',h.lucky.bestFor]
          ].map(([k,v])=>`<div class="kv"><small>${esc(k)}</small><div class="value">${esc(v)}</div></div>`).join('')}</div>`);
        const guidance=section('What to do and what to avoid',
          `<div class="guidance-grid">
            <div class="guidance do"><h3>Favourable</h3><ul>${h.guidance.do.map(x=>`<li>${esc(x)}</li>`).join('')}</ul></div>
            <div class="guidance avoid"><h3>Handle with care</h3><ul>${h.guidance.avoid.map(x=>`<li>${esc(x)}</li>`).join('')}</ul></div>
          </div>`);
        const remedy=section('Suggested remedy',
          `<div class="remedy-card"><div class="remedy-om" aria-hidden="true">ॐ</div>
            <p class="remedy-reason">${esc(h.remedy.reason)}</p>
            <blockquote class="mantra-text">${esc(h.remedy.mantra)}</blockquote>
            <div class="result-grid">${[['Deity',h.remedy.deity],['Japa count',h.remedy.count],['Day',h.remedy.day],['Action',h.remedy.action],['Charity',h.remedy.charity]].map(([k,v])=>`<div class="kv"><small>${esc(k)}</small><div class="value">${esc(v)}</div></div>`).join('')}</div>
            <p class="section-note">${esc(h.remedy.note)}</p></div>`);
        const moonHtml=section('Moon right now',
          `<div class="result-grid">${[['Sign',h.moon.sign],['Degree',h.moon.degree+'°'],['Nakshatra',h.moon.nakshatra],['Pada',h.moon.pada],['Nakshatra lord',h.moon.nakshatraLord],['House from your rāśi',h.moon.house]].map(([k,v])=>`<div class="kv"><small>${esc(k)}</small><div class="value">${esc(v)}</div></div>`).join('')}</div>`);
        const transits=section('Transits used in this reading',
          `<div class="period-list">${h.transits.map(s=>`<div class="period-row"><div><strong>${esc(s.planet)} in ${esc(s.sign)} ${s.retrograde?'<span class="retro-tag">℞</span>':''}</strong><small>House ${esc(s.house)} from ${esc(h.sign)} · ${esc(s.meaning)} · ${esc(s.dignity)}</small></div><span class="forecast-chip ${s.score>0?'positive':s.score<0?'negative':'neutral'}">${s.favorable?'Supportive':'Needs care'}</span></div>`).join('')}</div>
          <details class="compact-details"><summary>Method</summary><p class="section-note">${esc(h.method)}</p><p class="section-note">${esc(h.disclaimer)}</p></details>`);
        $('portalContent').innerHTML=overall+areasHtml+luckyHtml+guidance+remedy+moonHtml+transits;
        setStatus('');
      }catch(e){setStatus(e.message,'err');$('portalContent').innerHTML=section('Not available','<p class="section-note">This horoscope could not be loaded.</p>');}
    };
    document.querySelectorAll('.period-tab').forEach(b=>b.onclick=()=>{
      document.querySelectorAll('.period-tab').forEach(x=>{x.classList.remove('active');x.setAttribute('aria-selected','false')});
      b.classList.add('active'); b.setAttribute('aria-selected','true');
      history.replaceState({},'',`/horoscope/${slug}?period=${b.dataset.period}`);
      load(b.dataset.period);
    });
    $('dateSel').onchange=()=>load(document.querySelector('.period-tab.active')?.dataset.period||period);
    await load(period);
  }

  async function renderMilan(){
    let locations=[]; try{locations=await fetch('/locations').then(r=>r.json())}catch{}
    const person=(id,label)=>`<fieldset class="milan-person"><legend>${label}</legend><div class="formgrid"><div class="field"><label>Name</label><input id="${id}Name" autocomplete="name"></div><div class="field"><label>Birth place</label><select id="${id}Location"><option value="">Select city / place</option>${locations.map(x=>`<option value="${esc(x.id)}">${esc(x.name)}</option>`).join('')}</select></div><div class="field sm"><label>Birth date</label><input id="${id}Date" type="date" required></div><div class="field sm"><label>Birth time</label><input id="${id}Time" type="time" step="1" required></div><div class="field full"><div class="geo"><div><label>Latitude</label><input id="${id}Lat" readonly></div><div><label>Longitude</label><input id="${id}Lon" readonly></div><div><label>UTC offset</label><input id="${id}Tz" readonly></div></div></div></div></fieldset>`;
    controls('<button class="btn primary" id="milanRun" type="button">Calculate complete Milan</button>');
    $('portalContent').innerHTML=section('Kundali Milan — in depth',`<p class="section-note">Enter both birth charts. The engine calculates the existing Ashtakoot / 36-point framework and supported supplementary checks. The result is a traditional compatibility calculation, not a scientific prediction of relationship success.</p><div class="milan-grid">${person('groom','Person A')}${person('bride','Person B')}</div><div id="milanResult"></div>`);
    ['groom','bride'].forEach(id=>$(id+'Location').onchange=()=>{const x=locations.find(v=>v.id===$(id+'Location').value);if(!x)return;$(id+'Lat').value=x.lat;$(id+'Lon').value=x.lon;$(id+'Tz').value=x.tz});
    const birth=id=>{const d=$(id+'Date').value.split('-').map(Number),t=($(id+'Time').value||'00:00').split(':').map(Number),x=locations.find(v=>v.id===$(id+'Location').value)||{};return {name:$(id+'Name').value.trim(),year:d[0],month:d[1],day:d[2],hour:t[0]||0,min:t[1]||0,sec:t[2]||0,lat:Number($(id+'Lat').value),lon:Number($(id+'Lon').value),tz:Number($(id+'Tz').value),timeZone:x.timeZone,place:x.name,ayanamsaMode:'lahiri',houseSystem:'whole',nodeMode:'true'}};
    $('milanRun').onclick=async()=>{try{setStatus('Calculating both charts and full Milan…');const body={groom:birth('groom'),bride:birth('bride')};if(!body.groom.year||!body.bride.year)throw Error('Enter both birth dates.');const r=await fetch('/kundali-milan',{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify(body)}),d=await r.json();if(!r.ok)throw Error(d.message||'Milan calculation failed');const a=d.ashtakoot||d;const k=a.kootas||[];const rows=k.map(x=>`<div class="period-row"><div><strong>${esc(x.name||x.koota||'Koota')}</strong><small>${esc(x.description||x.source||x.note||'Classical matching rule')}</small></div><b>${esc(x.points??x.obtained??'—')} / ${esc(x.maxPoints??x.maximum??'—')}</b></div>`).join('');const score=a.totalPoints??'—';$('milanResult').innerHTML=section('Milan result',`<div class="summary-card"><h3>${esc(score)} / ${esc(a.maxPoints??36)}</h3><p>${esc(a.overallRecommendation?.label||a.overallRecommendation?.note||a.verdict?.label||'See the component results below. This is a traditional rule-based interpretation.')}</p><p class="section-note">Ashtakoot percentage: ${esc(a.percentage??'—')}%. Additional Papa Samyam, Mangal Dosha, Rajju and Vedha data are retained separately.</p></div><div class="period-list" style="margin-top:10px">${rows}</div><details class="raw-details"><summary>Technical result</summary><pre class="raw-box">${esc(JSON.stringify(d,null,2))}</pre></details>`);setStatus('');window.lucide?.createIcons?.()}catch(e){setStatus(e.message,'err')}};
  }

  async function loadHoroscope(){try{
    setStatus('Calculating general forecast…');
    const period=$('periodSel')?.value||'daily';
    const sign=$('signSel')?.value||state.sign;
    const date=$('dateSel')?.value||state.date;
    const planet=$('planetSel')?.value||null;
    const q=new URLSearchParams({period,sign,date}); if(key==='planet'&&planet)q.set('planet',planet);
    const r=await fetch('/forecast/general?'+q); const d=await r.json(); if(!r.ok)throw Error(d.message||'Forecast failed');
    const o=d.overall||{};
    const signals=(d.signals||[]).map(x=>`<div class="period-row"><div><strong>${esc(x.planet)}</strong><small>${esc(x.type)} · target house ${esc(x.house)}</small></div><span class="forecast-chip ${x.score>0?'positive':x.score<0?'negative':'neutral'}">${x.score>0?'Supportive':x.score<0?'Needs care':'Mixed'}</span></div>`).join('');
    const summary=`<div class="summary-card"><div class="summary-top"><span class="forecast-chip ${o.tone==='supportive'?'positive':o.tone==='challenging'?'negative':'neutral'}">${esc(o.tone||'mixed')}</span><b>${esc(o.score??0)}</b></div><h3>${esc(sign)} — ${esc(period)} general forecast</h3><p>${esc(o.summary||'')}</p><div class="mini-key"><span>Focus: ${esc((d.focus||[]).join(', '))}</span><span>Support: ${esc((o.supportive||[]).join(', ')||'none')}</span><span>Care: ${esc((o.caution||[]).join(', ')||'none')}</span></div></div>`;
    let extra=''; if(d.planetForecast) extra=section(`${esc(planet)} movement`, `<div class="result-grid"><div class="kv"><small>Sign</small><div class="value">${esc(d.planetForecast.sign)}</div></div><div class="kv"><small>Longitude</small><div class="value">${esc(d.planetForecast.longitude)}°</div></div></div><p class="section-note">${esc(d.planetForecast.method)}</p>`);
    $('portalContent').innerHTML=section(`${period[0].toUpperCase()+period.slice(1)} Rāśi Bhavishya — ${sign}`,summary)+section('Aspect & placement signals',signals?`<div class="period-list">${signals}</div>`:'<p class="section-note">No major configured signals for this sign/date.</p>')+extra+section('Method',`<p class="section-note">This is a general, sign-based traditional Jyotish forecast. It uses calculated planetary positions and configured house/aspect rules; it does not use anyone’s birth chart.</p>`);setStatus('');window.lucide?.createIcons?.();
  }catch(e){setStatus(e.message,'err');}}
  async function loadPanchang(){
    try{
      setStatus('Calculating Panchang…');
      const q=new URLSearchParams({date:$('dateSel').value,lat:$('latSel').value,lon:$('lonSel').value,tz:$('tzSel').value});
      const period=$('panchangPeriod')?.value||'daily';
      const [rDaily,rRange,rCh,rHora]=await Promise.all([
        fetch('/panchang/today?'+q),
        fetch('/panchang/range?'+new URLSearchParams({...Object.fromEntries(q),period})),
        fetch('/panchang/choghadiya?'+q),
        fetch('/panchang/hora?'+q)
      ]);
      const d=await rDaily.json(),range=await rRange.json(),ch=await rCh.json(),hr=await rHora.json();
      if(!rDaily.ok)throw Error(d.message||'Panchang failed');
      const val=(x)=>{if(x==null)return '—';if(typeof x==='string'||typeof x==='number')return String(x);return x.name||x.label||x.value||x.tithiName||x.nakshatraName||'Available'};
      const core=['tithi','vara','nakshatra','yoga','karana'].map(k=>`<article class="panchang-quick"><small>${esc(k==='vara'?'Vāra':k[0].toUpperCase()+k.slice(1))}</small><strong>${esc(val(d[k]))}</strong></article>`).join('');
      const sunTimes=`<article class="panchang-quick"><small>Sunrise</small><strong>${esc(d.sunrise||'—')}</strong></article><article class="panchang-quick"><small>Sunset</small><strong>${esc(d.sunset||'—')}</strong></article>`;
      const times=[['Brahma Muhurta',d.brahmaMuhurta,'positive'],['Abhijit Muhurta',d.abhijitMuhurta,'positive'],['Vijaya Muhurta',d.vijayaMuhurta,'positive'],['Godhuli Muhurta',d.godhuliMuhurta,'positive'],['Nishita Kaal',d.nishitaKaal,'neutral'],['Rahu Kaal',d.rahuKaal,'negative']].map(([n,x,t])=>x?`<div class="period-row"><div><strong>${n}</strong><small>${esc(x.startFormatted||x.start||'')} — ${esc(x.endFormatted||x.end||'')}</small></div><span class="forecast-chip ${t}">${t==='negative'?'Avoid':'Time window'}</span></div>`:'').join('');
      const rows=(range.days||[]).map(x=>`<div class="period-row"><div><strong>${esc(x.date)}</strong><small>${esc(x.vara?.name||'')} · ${esc(x.tithi?.name||'')} · ${esc(x.nakshatra?.name||'')}</small></div><span>${esc(x.sunrise||'')} — ${esc(x.sunset||'')}</span></div>`).join('');
      const chRows=(ch.choghadiya||[]).map(x=>`<div class="period-row"><div><strong>${esc(x.name)}</strong><small>${esc(x.period)} · segment ${esc(x.index)}</small></div><span>${esc(String(x.start))} — ${esc(String(x.end))}</span></div>`).join('');
      const hRows=(hr.hora||[]).map(x=>`<div class="period-row"><div><strong>Hora ${esc(x.hora)} · ${esc(x.planet)}</strong></div><span>${esc(String(x.start))} — ${esc(String(x.end))}</span></div>`).join('');
      const daily=(period==='daily'?section('Today — quick Panchang',`<div class="panchang-quick-grid">${core}${sunTimes}</div><p class="panchang-note">The five Panchanga limbs are shown first; detailed timings stay collapsed so the page remains easy to scan.</p>`)+section('Important time windows',`<div class="period-list">${times}</div>`)+section('More timings',`<details class="compact-details"><summary>Choghadiya — day & night</summary><div class="period-list">${chRows}</div></details><details class="compact-details"><summary>Hora — 24 planetary hours</summary><div class="period-list">${hRows}</div></details>`):'');
      const rangeTitle=period==='daily'?'Panchang timeline':`${period[0].toUpperCase()+period.slice(1)} Panchang`;
      $('portalContent').innerHTML=daily+section(rangeTitle,`<div class="period-list">${rows}</div>`);
      setStatus('');
    }catch(e){setStatus(e.message,'err');}
  }
  async function loadAstronomy(){try{setStatus('Calculating planetary conjunctions…');const date=$('dateSel').value;const [r,rf]=await Promise.all([fetch('/astronomy/today?date='+encodeURIComponent(date)),fetch('/astronomy/space-feed?date='+encodeURIComponent(date))]);const d=await r.json(),feed=await rf.json();if(!r.ok)throw Error(d.message||'Astronomy failed');const con=(d.conjunctions||[]).map(x=>`<div class="period-row"><div><strong>${esc(x.planets.join(' × '))}</strong><small>${esc(x.separationDegrees)}° separation · ${esc(x.sign)}</small><p>${esc(x.traditionalInterpretation)}</p></div><span class="forecast-chip ${x.nature==='supportive'?'positive':x.nature==='challenging'?'negative':'neutral'}">${esc(x.nature)}</span></div>`).join('');$('portalContent').innerHTML=section('Astronomy Today — conjunction watch',`<p class="section-note">Planetary positions are astronomical calculations. The “good / challenging” language below is a traditional Jyotish interpretation, not a scientific causal claim about world events.</p>${con?`<div class="period-list">${con}</div>`:'<p class="section-note">No close conjunctions within the configured orb for this date.</p>'}`)+section('Planet positions',`<div class="result-grid">${Object.entries(d.positions||{}).map(([p,x])=>`<div class="kv"><small>${esc(p)}</small><div class="value">${esc(x.sign)} · ${esc(x.longitude)}°</div></div>`).join('')}</div>`);const sw=feed.spaceWeather||{}; const apod=feed.apod||{}; const neo=feed.neo||{};
    const feedBody=section('NASA / space-weather feed',`<div class="result-grid"><div class="kv"><small>APOD</small><div class="value">${esc(apod.available?apod.title:'Not configured')}</div></div><div class="kv"><small>NEO feed</small><div class="value">${esc(neo.available?Object.keys(neo.near_earth_objects||{}).length+' day(s)':'Not configured')}</div></div><div class="kv"><small>Solar flares</small><div class="value">${esc(sw.flares?.available?sw.flares.data?.length||0:'Unavailable')}</div></div><div class="kv"><small>CMEs</small><div class="value">${esc(sw.cmes?.available?sw.cmes.data?.length||0:'Unavailable')}</div></div><div class="kv"><small>Geomagnetic storms</small><div class="value">${esc(sw.storms?.available?sw.storms.data?.length||0:'Unavailable')}</div></div><div class="kv"><small>NOAA Kp feed</small><div class="value">${esc(feed.noaaKp?.available?'Live':'Unavailable')}</div></div></div><p class="section-note">${esc(feed.disclaimer||'')}</p>`);
    $('portalContent').innerHTML=section('Astronomy Today — conjunction watch',`<p class="section-note">Planetary positions are astronomical calculations. “Supportive / challenging” below is traditional Jyotish interpretation, not a scientific causal claim.</p>${con?`<div class="period-list">${con}</div>`:'<p class="section-note">No close conjunctions within the configured orb for this date.</p>'}`)+section('Planet positions',`<div class="result-grid">${Object.entries(d.positions||{}).map(([p,x])=>`<div class="kv"><small>${esc(p)}</small><div class="value">${esc(x.sign)} · ${esc(x.longitude)}°</div></div>`).join('')}</div>`)+feedBody;setStatus('');}catch(e){setStatus(e.message,'err');}}
  async function renderNakshatra(){try{setStatus('Calculating Nakshatra forecast…');const period=$('periodSel')?.value||'daily';const date=$('dateSel')?.value||state.date;const r=await fetch('/forecast/general?'+new URLSearchParams({period,date,sign:state.sign,nakshatra:state.nakshatra}));const d=await r.json();if(!r.ok)throw Error(d.message||'Nakshatra forecast failed');const n=(catalog.nakshatras||[]).find(x=>x.name===state.nakshatra)||{};const nf=d.nakshatraForecast||{};$('portalContent').innerHTML=section(`${state.nakshatra} — ${period} Nakshatra Bhavishya`,`<div class="summary-card"><h3>General Moon-cycle view</h3><p>${esc(nf.summary||'')}</p><div class="mini-key"><span>Current Moon longitude: ${esc(nf.currentMoonLongitude??'—')}°</span><span>Method: ${esc(nf.method||'')}</span></div></div>`)+section('Nakshatra reference',`<div class="result-grid">${Object.entries(n).filter(([k])=>!['daily','weekly','monthly','yearly'].includes(k)).map(([k,v])=>`<div class="kv"><small>${esc(k)}</small><div class="value">${esc(typeof v==='object'?JSON.stringify(v):v)}</div></div>`).join('')}</div>`);setStatus('');}catch(e){setStatus(e.message,'err');}}
  function renderLists(){const q=($('listSearch')?.value||'').toLowerCase();const groups=catalog.lists||{};const out=Object.entries(groups).map(([title,items])=>{const shown=items.filter(x=>x.toLowerCase().includes(q));return section(title,`<div class="chip-list">${shown.map(x=>`<a class="chip" href="/knowledge/${encodeURIComponent(x.toLowerCase().replace(/[^a-z0-9]+/g,'-'))}">${esc(x)}</a>`).join('')}</div>`,'').replace('class="card portal-section"','class="card portal-section list-section"')}).join('');$('portalContent').innerHTML=out;}
  function renderKnowledge(){const q=($('knowledgeSearch')?.value||'').toLowerCase();const items=(catalog.knowledge||[]).filter(x=>`${x.title} ${x.category}`.toLowerCase().includes(q));$('portalContent').innerHTML=section('Knowledge library',cards(items.map(x=>({title:x.title,text:`${x.category} · ${x.description}`,href:x.href,icon:'▦'}))));}
  function renderCalendar(){const y=Number($('yearSel').value)||state.year;const f=catalog.festivals||[];$('portalContent').innerHTML=section(`Hindu Calendar — ${y}`,`<p class="section-note">Festival dates are represented by the bundled festival rule dataset. Local observance can depend on place, sunrise and tithi; the daily Panchang remains the authoritative calculation layer.</p><div class="month-grid">${f.map(x=>`<article class="month-card"><strong>${esc(x.name)}</strong><small>${esc(x.monthRule)}</small><b>${esc(x.observance||'Tithi-based')}</b></article>`).join('')}</div>`);}
  const rerender=()=>{ try{ renderCatalog(); }catch(e){ setStatus(e.message,'err'); } window.lucide?.createIcons?.(); };
  window.addEventListener('jv:locale-change',rerender);
  window.addEventListener('jv:i18n-ready',()=>{ /* nav rebuilt by the shell; page content is language-tagged server-side */ });

  /**
   * Boot. /catalog/public only feeds the older sign/nakshatra/planet pages; the
   * knowledge, lists and horoscope pages fetch their own data. A failure there
   * used to leave the whole page blank with only a red status line, so those
   * pages now render regardless and only the catalog-backed ones report the
   * error.
   */
  const NEEDS_CATALOG = new Set(['rashi','planet','nakshatra','home','calendar','milan']);
  fetch('/catalog/public',{headers:{accept:'application/json'}})
    .then(r=>r.ok?r.json():Promise.reject(new Error('Catalog unavailable')))
    .then(d=>{catalog=d;})
    .catch(e=>{ catalog=null; if(NEEDS_CATALOG.has(key)) setStatus(e.message,'err'); })
    .finally(()=>{
      try { renderCatalog(); } catch(e){ setStatus(e.message,'err'); }
      window.lucide?.createIcons?.();
    });
})();
