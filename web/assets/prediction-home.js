document.addEventListener('DOMContentLoaded',()=>{
  const { $, esc }=window.HoraSaarUI; const {PREFS,PERIODS,render}=window.HoraSaarPredictionView;
  let pref=localStorage.getItem('jv-pref')||'general', period=localStorage.getItem('jv-period')||'day', locations=[];
  const renderChoices=()=>{
    $('preferences').innerHTML=Object.entries(PREFS).map(([k,v])=>`<button type="button" class="choice-pill ${k===pref?'selected':''}" data-pref="${k}">${esc(v)}</button>`).join('');
    $('periods').innerHTML=Object.entries(PERIODS).map(([k,v])=>`<button type="button" class="choice-pill ${k===period?'selected':''}" data-period="${k}">${esc(v)}</button>`).join('');
    document.querySelectorAll('[data-pref]').forEach(b=>b.onclick=()=>{pref=b.dataset.pref;localStorage.setItem('jv-pref',pref);renderChoices();});
    document.querySelectorAll('[data-period]').forEach(b=>b.onclick=()=>{period=b.dataset.period;localStorage.setItem('jv-period',period);renderChoices();});
  };
  renderChoices();
  fetch('/locations').then(r=>r.json()).then(list=>{locations=list||[]; const o=$('location'); for(const x of locations){const op=document.createElement('option');op.value=x.id;op.textContent=x.name;op.dataset.lat=x.lat;op.dataset.lon=x.lon;op.dataset.tz=x.tz;op.dataset.timeZone=x.timeZone||'';o.appendChild(op);}}).catch(()=>{});
  $('location').onchange=()=>{const o=$('location').selectedOptions[0];$('lat').value=o?.dataset.lat||'';$('lon').value=o?.dataset.lon||'';$('tz').value=o?.dataset.tz||'';};
  $('predictionForm').onsubmit=async e=>{e.preventDefault();const o=$('location').selectedOptions[0];const time=$('time').value||'00:00';const date=$('date').value;const birth={name:$('name').value.trim(),year:Number(date.slice(0,4)),month:Number(date.slice(5,7)),day:Number(date.slice(8,10)),hour:Number(time.slice(0,2)),min:Number(time.slice(3,5)),sec:0,lat:Number($('lat').value),lon:Number($('lon').value),tz:Number($('tz').value),timeZone:o?.dataset.timeZone||undefined,ayanamsaMode:$('ayan').value,houseSystem:'whole',nodeMode:'true',place:o?.textContent||''};
    if(!Number.isFinite(birth.lat)||!Number.isFinite(birth.lon)||!date){$('status').textContent='Enter your birth date and select a birth place first.';return;}
    if(!Number.isFinite(birth.tz)){$('status').textContent='That birth place has no usable UTC offset. Please pick another place.';return;}
    sessionStorage.setItem('jv:lastBirth',JSON.stringify(birth)); $('status').textContent='Building your personal forecast…'; $('forecastSubmit').disabled=true;
    try{const r=await fetch('/prediction',{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({birth,preference:pref,period})});const d=await r.json();if(!r.ok)throw Error(d.message||'Prediction failed');$('forecastPreview').classList.remove('hidden');render($('forecastApp'),d.prediction,pref);$('status').textContent='';$('forecastPreview').scrollIntoView({behavior:'smooth',block:'start'});}
    catch(err){$('status').textContent=err.message;} finally{$('forecastSubmit').disabled=false;}
  };
});
