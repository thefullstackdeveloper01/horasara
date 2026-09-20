import { spawn } from 'node:child_process';
const PORT=8804, BASE=`http://127.0.0.1:${PORT}`;
const srv=spawn('node',['server.js'],{cwd:'/home/claude/work/HoraSaar',env:{...process.env,PORT:String(PORT)},stdio:'ignore'});
const sleep=ms=>new Promise(r=>setTimeout(r,ms));
for(let i=0;i<60;i++){try{if((await fetch(`${BASE}/health`)).ok)break}catch{}await sleep(250)}

// Every href in the nav, plus a sample of every generated deep route.
const navHrefs=['/rashi-bhavishya','/planet-bhavishya','/nakshatra-bhavishya','/horoscope','/astronomy','/','/subscribe',
'/panchang?view=daily','/panchang?view=weekly','/panchang?view=monthly','/calendar','/panchang?view=hora','/panchang?view=choghadiya','/knowledge/festivals',
'/kundali-milan','/tools/natal-chart','/tools/dasha','/tools/nakshatra','/tools/rashi','/tools/rising-sign','/tools/transit-chart','/tools/mangal-dosha','/tools/sade-sati','/tools/kaal-sarp-dosh',
'/calculators','/tools/numerology','/tools/sun-sign','/tools/ayanamsa','/tools/moon-phase','/tools/love','/tools/friendship','/tools/lo-shu-grid','/tools/ishta-devata',
'/knowledge','/knowledge/gods','/knowledge/lords','/knowledge/mantras','/knowledge/tantra','/knowledge/yantra','/knowledge/gemstones','/knowledge/rudraksha','/knowledge/chalisa','/knowledge/aarti','/knowledge/names','/lists','/lists/scriptures','/lists/rishis'];

const deep=[];
for(const t of (await (await fetch(`${BASE}/api/knowledge`)).json()).topics){
  const full=await (await fetch(`${BASE}/api/knowledge/${t.id}`)).json();
  for(const it of full.items) deep.push(`/knowledge/${t.id}/${it.id}`);
}
for(const g of (await (await fetch(`${BASE}/api/lists`)).json()).groups){
  const full=await (await fetch(`${BASE}/api/lists/${g.id}`)).json();
  for(const it of full.items) deep.push(`/lists/${g.id}/${it.id}`);
}
for(const s of (await (await fetch(`${BASE}/api/horoscope`)).json()).signList) deep.push(`/horoscope/${s.slug}`);

const bad=[];
const probe=async(list,label)=>{
  let ok=0;
  for(const p of list){
    const r=await fetch(`${BASE}${p}`,{headers:{accept:'text/html'}});
    if(r.ok) ok++; else bad.push(`${r.status} ${p}`);
  }
  console.log(`${label}: ${ok}/${list.length} OK`);
};
await probe(navHrefs,'Menu links     ');
await probe(deep,'Generated pages');
console.log(bad.length?'\nBROKEN:\n'+bad.join('\n'):'\nNo broken links.');
srv.kill();
