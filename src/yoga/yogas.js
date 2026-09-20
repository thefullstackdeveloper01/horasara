/**
 * YOGA DETECTION — 60+ Classical Vedic Yogas
 * BPHS, Phaladeepika, Saravali sources
 * All using p.siderealLon (fixed Y-01 bug)
 */
import { SIGNS, SIGN_LORDS, EXALTATION, OWN_SIGNS } from '../astronomy/constants.js';
import { mod360, signOf } from '../astronomy/utils.js';

const SN = n => SIGNS[signOf(mod360(n))];
const isOwn = (pl, lon) => (OWN_SIGNS[pl]||[]).includes(SN(lon));
const isExalt = (pl, lon) => { const e=EXALTATION[pl]; return e && SIGNS[signOf(lon)]===e.sign; };
const isKendra = h => [1,4,7,10].includes(h);
const isTrikona = h => [1,5,9].includes(h);
const isKDT = h => isKendra(h)||isTrikona(h);
const isBad = h => [6,8,12].includes(h);
const isGood = h => !isBad(h);
const pMap = {};

function getP(planets, name) { return planets.find(p=>p.name===name); }

export function detectYogas(planets, ascLon, houses) {
  // Classical Parashari yogas apply only to the 9 traditional grahas
  // (Sun..Saturn, Rahu, Ketu). Modern outer planets (Uranus/Neptune/Pluto,
  // flagged `outer: true` by the engine) are not part of this system and
  // must never feed into yoga detection — filter them out defensively here
  // so every internal check in this file is guaranteed clean, regardless
  // of what the caller passes in.
  planets = planets.filter(p => !p.outer);

  // Rebuild pMap
  Object.keys(pMap).forEach(k=>delete pMap[k]);
  planets.forEach(p => pMap[p.name]=p);

  const yogas = [];
  const add = (name,type,strength,desc,planets_involved) => {
    yogas.push({name,type,strength,desc,planets:planets_involved});
  };

  const sun=getP(planets,'Sun'),moon=getP(planets,'Moon'),mars=getP(planets,'Mars'),
        merc=getP(planets,'Mercury'),jup=getP(planets,'Jupiter'),
        ven=getP(planets,'Venus'),sat=getP(planets,'Saturn'),
        rahu=getP(planets,'Rahu'),ketu=getP(planets,'Ketu');

  if(!sun||!moon||!mars||!merc||!jup||!ven||!sat) return yogas;

  const hArr = Array.isArray(houses) ? houses : Object.values(houses);

  // ── 1. PANCHA MAHAPURUSHA ────────────────────────────────
  const MAHAPU = [
    {planet:'Mars',    name:'Ruchaka Yoga',  desc:'Mars in own/exalt in kendra — courage, military, property, athletic prowess'},
    {planet:'Mercury', name:'Bhadra Yoga',   desc:'Mercury in own/exalt in kendra — intellect, communication, business acumen'},
    {planet:'Jupiter', name:'Hamsa Yoga',    desc:'Jupiter in own/exalt in kendra — wisdom, spirituality, great fortune'},
    {planet:'Venus',   name:'Malavya Yoga',  desc:'Venus in own/exalt in kendra — beauty, luxury, artistic excellence, long life'},
    {planet:'Saturn',  name:'Shasha Yoga',   desc:'Saturn in own/exalt in kendra — authority, service, real estate, long career'},
  ];
  for (const m of MAHAPU) {
    const p = getP(planets, m.planet);
    if (!p) continue;
    if (isKendra(p.house) && (isOwn(m.planet,p.siderealLon) || isExalt(m.planet,p.siderealLon))) {
      add(m.name, 'Pancha Mahapurusha', 'Strong', m.desc, m.planet);
    }
  }

  // ── 2. RAJA YOGAS (Kendra-Trikona connections) ──────────
  const kendraLords  = [1,4,7,10].map(h=>{ const hs=hArr.find(x=>x.number===h); return hs?.lord; }).filter(Boolean);
  const trikonaLords = [1,5,9].map(h=>{   const hs=hArr.find(x=>x.number===h); return hs?.lord; }).filter(Boolean);

  for (const kl of [...new Set(kendraLords)]) {
    for (const tl of [...new Set(trikonaLords)]) {
      if (kl===tl) continue;
      const kp=getP(planets,kl), tp=getP(planets,tl);
      if (!kp||!tp) continue;

      // FIX Y-02: Check conjunction, mutual aspect, AND sign exchange (parivartana)
      const houseDiff = Math.abs(kp.house - tp.house);

      if (kp.house===tp.house) {
        add(`Raja Yoga (${kl}+${tl})`, 'Raja Yoga', 'Strong',
          `Kendra lord ${kl} (H${kp.house}) conjoins Trikona lord ${tl} — leadership, authority, government favor`, kl+','+tl);
      } else if (houseDiff===6) {
        // 7th mutual aspect (all planets aspect 7th)
        add(`Raja Yoga (${kl}+${tl} Aspect)`, 'Raja Yoga', 'Moderate',
          `Kendra lord ${kl} (H${kp.house}) mutually aspects Trikona lord ${tl} (H${tp.house}) — authority and fortune`, kl+','+tl);
      } else {
        // Check special aspects: Mars 4th/8th, Jupiter 5th/9th, Saturn 3rd/10th
        const specialAspects = {
          Mars:[4,8], Jupiter:[5,9], Saturn:[3,10], Rahu:[5,9], Ketu:[5,9]
        };
        const kpAspects = specialAspects[kl] || [];
        const tpAspects = specialAspects[tl] || [];
        const kpToTp = ((tp.house - kp.house + 12) % 12) + 1;
        const tpToKp = ((kp.house - tp.house + 12) % 12) + 1;
        if (kpAspects.includes(kpToTp) || tpAspects.includes(tpToKp)) {
          add(`Raja Yoga (${kl}+${tl} Special Aspect)`, 'Raja Yoga', 'Moderate',
            `Kendra lord ${kl} and Trikona lord ${tl} share special planetary aspect — good fortune`, kl+','+tl);
        }
        // Parivartana (sign exchange)
        const klSign = SIGNS[signOf(kp.siderealLon)];
        const tlSign = SIGNS[signOf(tp.siderealLon)];
        if ((OWN_SIGNS[tl]||[]).includes(klSign) && (OWN_SIGNS[kl]||[]).includes(tlSign)) {
          add(`Raja Yoga (${kl}+${tl} Exchange)`, 'Raja Yoga', 'Strong',
            `Kendra lord ${kl} in ${tl}'s sign, ${tl} in ${kl}'s sign — powerful parivartana Raja Yoga`, kl+','+tl);
        }
      }
    }
  }

  // ── 3. DHANA YOGAS (Wealth) ──────────────────────────────
  // FIX Y-04: Gaja Kesari — add cancellation conditions
  // Cancelled if Jupiter is debilitated OR Moon in dusthana (6,8,12)
  if (jup && moon) {
    const diff = Math.abs(jup.house - moon.house);
    const inKendra = [0,3,6,9].includes(diff) || [0,3,6,9].includes(12-diff);
    const jupDebilitated = SIGNS[signOf(jup.siderealLon)] === 'Capricorn';
    const moonInDusthana = isBad(moon.house);
    if (inKendra && !jupDebilitated && !moonInDusthana) {
      add('Gaja Kesari Yoga', 'Dhana/Fame', 'Strong',
        `Jupiter in kendra from Moon (H${moon.house}→H${jup.house}) — fame, wisdom, wealth, prosperity`,
        'Jupiter,Moon');
    } else if (inKendra && (jupDebilitated || moonInDusthana)) {
      add('Gaja Kesari Yoga (Cancelled)', 'Dhana/Fame', 'Weak',
        `Jupiter in kendra from Moon but cancelled: ${jupDebilitated ? 'Jupiter debilitated' : 'Moon in dusthana'}`,
        'Jupiter,Moon');
    }
  }

  // Chandra-Mangal: Moon + Mars conjunction
  if (moon && mars && moon.house===mars.house) {
    add('Chandra-Mangal Yoga','Dhana','Moderate',
      `Moon and Mars in H${moon.house} — intense ambition, self-earned wealth, strong drive`,'Moon,Mars');
  }

  // Budhaditya: Sun + Mercury
  if (sun && merc && sun.house===merc.house) {
    add('Budhaditya Yoga','Intelligence','Moderate',
      `Sun and Mercury in H${sun.house} — sharp intellect, communication mastery, advisory roles`,'Sun,Mercury');
  }

  // Laxmi Yoga: Venus strong + 9th lord strong
  if (ven && (isOwn('Venus',ven.siderealLon)||isExalt('Venus',ven.siderealLon))) {
    const h9 = hArr.find(h=>h.number===9);
    if (h9) {
      const h9L = getP(planets, h9.lord);
      if (h9L && isKDT(h9L.house)) {
        add('Laxmi Yoga','Dhana','Strong',
          `Venus exalted/own + 9th lord ${h9.lord} in kendra/trikona — great wealth, beauty, prosperity`,'Venus,'+h9.lord);
      }
    }
  }

  // ── 4. SOLAR YOGAS (Vesi, Voshi, Ubhayachari) ───────────
  const planetsNotMoon = planets.filter(p=>!['Moon','Rahu','Ketu'].includes(p.name)&&!p.outer);
  const classicalLunarYogaPlanets = planetsNotMoon.filter(p => p.name !== 'Sun');
  // Vesi: planet in 2nd from Sun
  planetsNotMoon.filter(p=>p.name!=='Sun').forEach(p => {
    if (p.house === (sun.house%12)+1) {
      add(`Vesi Yoga (${p.name})`,'Solar','Moderate',
        `${p.name} in 2nd from Sun (H${p.house}) — eloquent speech, fame, good character`,'Sun,'+p.name);
    }
  });
  // Voshi: planet in 12th from Sun
  planetsNotMoon.filter(p=>p.name!=='Sun').forEach(p => {
    const twelfthFromSun = sun.house===1 ? 12 : sun.house-1;
    if (p.house===twelfthFromSun) {
      add(`Voshi Yoga (${p.name})`,'Solar','Moderate',
        `${p.name} in 12th from Sun (H${p.house}) — wealth, virtuous, well-spoken`,'Sun,'+p.name);
    }
  });

  // ── 5. LUNAR YOGAS ──────────────────────────────────────
  // Sunapha: planet in 2nd from Moon
  planetsNotMoon.filter(p=>p.name!=='Moon').forEach(p => {
    if (p.house === (moon.house%12)+1) {
      add(`Sunapha Yoga (${p.name})`,'Lunar','Moderate',
        `${p.name} in 2nd from Moon — self-made wealth, leadership, fame`,'Moon,'+p.name);
    }
  });
  // Anapha: planet in 12th from Moon
  classicalLunarYogaPlanets.forEach(p => {
    const twelfthFromMoon = moon.house===1 ? 12 : moon.house-1;
    if (p.house===twelfthFromMoon) {
      add(`Anapha Yoga (${p.name})`,'Lunar','Moderate',
        `${p.name} in 12th from Moon — healthy, well-spoken, good appearance`,'Moon,'+p.name);
    }
  });

  // ── 6. NEECHA BHANGA RAJA YOGA ───────────────────────────
  const DEBILITATION = {Sun:'Libra',Moon:'Scorpio',Mars:'Cancer',Mercury:'Pisces',Jupiter:'Capricorn',Venus:'Virgo',Saturn:'Aries'};
  const EXALT_SIGN   = {Sun:'Aries',Moon:'Taurus',Mars:'Capricorn',Mercury:'Virgo',Jupiter:'Cancer',Venus:'Pisces',Saturn:'Libra'};
  for (const [pl, debSign] of Object.entries(DEBILITATION)) {
    const p = getP(planets, pl);
    if (!p || SIGNS[signOf(p.siderealLon)]!==debSign) continue;
    // FIX Y-05 (audit): SIGN_LORDS is an object keyed by sign NAME
    // ('Aries' -> 'Mars'), not by numeric zodiac index. The previous code
    // computed a numeric index via SIGNS.indexOf(...) and used THAT as the
    // key — SIGN_LORDS[0] has no such key, so both debSignLord and
    // exaltLord were always undefined, `cancellation` was always false,
    // and Neecha Bhanga Raja Yoga could never be added by this function
    // for ANY chart, silently. (A separate, correctly-implemented Neecha
    // Bhanga calculator elsewhere in the app is what the dedicated report
    // section actually displays — this bug only affected this function's
    // contribution to the general 60+ yoga list.) Index directly by the
    // sign name string instead.
    const debSignLord = SIGN_LORDS[debSign];
    const exaltLord   = SIGN_LORDS[EXALT_SIGN[pl]];
    const dsl = getP(planets, debSignLord);
    const el  = getP(planets, exaltLord);
    const cancellation = (dsl && isKDT(dsl.house)) || (el && isKDT(el.house));
    if (cancellation) {
      add('Neecha Bhanga Raja Yoga','Cancellation/Raja','Powerful',
        `${pl} debilitated in ${debSign} but cancellation applies — transforms weakness to remarkable strength after initial struggle`,pl);
    }
  }

  // ── 7. VIPARITA RAJA YOGA ────────────────────────────────
  const h6  = hArr.find(h=>h.number===6);
  const h8  = hArr.find(h=>h.number===8);
  const h12 = hArr.find(h=>h.number===12);
  // FIX Y-03: Viparita Raja Yoga — dusthana lord must be IN another dusthana
  // Harsha: 6th lord in 6th/8th/12th; Sarala: 8th lord in 6th/8th/12th; Vimala: 12th lord in 6th/8th/12th
  const dusthanaHouses = [6, 8, 12];
  const vrYogas = [
    { lord: h6?.lord,  name: 'Harsha Yoga',  house: 6  },
    { lord: h8?.lord,  name: 'Sarala Yoga',  house: 8  },
    { lord: h12?.lord, name: 'Vimala Yoga',  house: 12 },
  ];
  for (const vy of vrYogas) {
    if (!vy.lord) continue;
    const lp = getP(planets, vy.lord);
    if (!lp) continue;
    // FIX: lord must actually be in a dusthana house (6, 8, or 12)
    if (dusthanaHouses.includes(lp.house)) {
      add(`Viparita Raja Yoga — ${vy.name}`, 'Viparita', 'Strong',
        `${vy.house}th lord ${vy.lord} in H${lp.house} (dusthana) — ${vy.name}: rises through adversity, defeats enemies`,
        vy.lord);
    }
  }
  // Also check mutual exchange between any two dusthana lords
  if (h6 && h8) {
    const l6 = getP(planets, h6.lord), l8 = getP(planets, h8.lord);
    if (l6 && l8 && dusthanaHouses.includes(l6.house) && dusthanaHouses.includes(l8.house) && l6.house !== l8.house) {
      add('Viparita Raja Yoga (6th-8th Exchange)', 'Viparita', 'Very Strong',
        `6th and 8th lords both in dusthanas — exceptional rise through obstacles, powerful adversity yoga`, h6.lord+','+h8.lord);
    }
  }

  // ── 8. SARASWATI YOGA ───────────────────────────────────
  if (jup&&ven&&merc) {
    const allInGood = [jup,ven,merc].every(p=>isKDT(p.house)||isOwn(p.name,p.siderealLon)||isExalt(p.name,p.siderealLon));
    if (allInGood) {
      add('Saraswati Yoga','Intelligence','Strong',
        'Jupiter+Venus+Mercury all in good positions — exceptional creativity, artistic talent, intelligence, eloquence','Jupiter,Venus,Mercury');
    }
  }

  // ── 9. KUJA (MANGAL) DOSHA YOGA ─────────────────────────
  if (mars && [1,2,4,7,8,12].includes(mars.house)) {
    // Not really a yoga but often listed
    add('Kuja Yoga (Mangal Placement)','Mars','Moderate',
      `Mars in H${mars.house} — strong Mars placement, gives courage, property, but watch temperament`,'Mars');
  }

  // ── 10. KALSARPA YOGA ───────────────────────────────────
  if (rahu && ketu) {
    const rashiPlanets = planets.filter(p=>!['Rahu','Ketu'].includes(p.name)&&!p.outer);
    const rh = rahu.house, kh = ketu.house;
    const between = p => {
      if (rh < kh) return p.house > rh && p.house < kh;
      else return p.house > rh || p.house < kh;
    };
    const allBetween = rashiPlanets.every(p=>between(p));
    if (allBetween) {
      add('Kalsarpa Yoga','Dosha/Yoga','Intense',
        `All planets between Rahu(H${rh}) and Ketu(H${kh}) — karmic intensity, obstacles then extraordinary success`,'Rahu,Ketu');
    }
  }

  // ── 11. GAJAKESARI VARIATIONS ───────────────────────────
  // Moon-Jupiter mutual aspect
  if (moon && jup) {
    const diff = Math.abs(moon.house - jup.house);
    const oppDiff = 12 - diff;
    if ((diff===6||oppDiff===6) && (diff!==0)) { // opposition
      add('Gaja Kesari Yoga (Aspect)','Dhana/Fame','Moderate',
        `Moon and Jupiter in opposition (H${moon.house}-H${jup.house}) — public recognition, wisdom, benevolence`,'Moon,Jupiter');
    }
  }

  // ── 12. AMALA YOGA ──────────────────────────────────────
  const h10Pl = planets.filter(p=>p.house===10&&!p.outer&&!['Rahu','Ketu'].includes(p.name));
  const benefics = ['Jupiter','Venus','Mercury','Moon'];
  if (h10Pl.some(p=>benefics.includes(p.name))) {
    add('Amala Yoga','Reputation','Moderate',
      'Benefic in 10th house — spotless reputation, good career, remembered for virtuous deeds',
      h10Pl.filter(p=>benefics.includes(p.name)).map(p=>p.name).join(','));
  }

  // ── 13. CHANDRA YOGA (Moon strength) ─────────────────────
  if (moon && (isOwn('Moon',moon.siderealLon)||isExalt('Moon',moon.siderealLon)) && isKDT(moon.house)) {
    add('Chandra Yoga','Strength','Strong',
      `Moon exalted/own in kendra/trikona (H${moon.house}) — emotional stability, public favor, good fortune`,'Moon');
  }

  // ── 14. GURU-MANGAL YOGA ─────────────────────────────────
  if (jup && mars && jup.house===mars.house) {
    add('Guru-Mangal Yoga','Action/Wisdom','Strong',
      `Jupiter and Mars conjoined in H${jup.house} — dynamic combination of wisdom and courage, excellent for leadership`,'Jupiter,Mars');
  }

  // ── 15. SHAKAT YOGA (challenging) ───────────────────────
  if (moon && jup) {
    const diff2 = ((jup.house - moon.house + 12) % 12);
    if (diff2===6) {
      add('Shakat Yoga','Challenge','Moderate',
        `Jupiter in 6th from Moon — life has fluctuations; success comes through persistent effort`,'Moon,Jupiter');
    }
  }

  // ── 16. PARIJATA YOGA ───────────────────────────────────
  const ascSign = SIGNS[signOf(ascLon)];
  const ascLord = getP(planets, SIGN_LORDS[ascSign]); // FIX Y-05: was SIGN_LORDS[SIGNS.indexOf(ascSign)] — same numeric-vs-name-key bug as above, always undefined
  if (ascLord) {
    // FIX Y-05 (cont.): same SIGN_LORDS name-vs-index bug as above — this
    // one was masked until the ascLord fix above, because the outer
    // `if (ascLord)` block never used to execute at all (ascLord was
    // always undefined), so this line never ran in production. Once
    // ascLord started resolving correctly, this would have silently
    // broken the yoga again for a second, different reason.
    const navLord = SIGN_LORDS[SIGNS[signOf(ascLord.siderealLon)]]; // navamsha lord simplified
    const navP = getP(planets, navLord);
    if (navP && (isOwn(navLord,navP.siderealLon)||isExalt(navLord,navP.siderealLon)||isKDT(navP.house))) {
      add('Parijata Yoga','Raja/Dhana','Strong',
        `Lagna lord's dispositor strong — initially struggle then lasting prosperity after mid-life`,navLord);
    }
  }

  // ── 17. NABHAS YOGAS (Planetary pattern yogas) ─────────────
  // Based on distribution of planets in signs/houses
  const mainPlanets = planets.filter(p => !['Rahu','Ketu'].includes(p.name));
  const occupiedSigns = [...new Set(mainPlanets.map(p => signOf(p.siderealLon)))];
  const occupiedHouses = [...new Set(mainPlanets.map(p => p.house))];
  const numOccupiedSigns = occupiedSigns.length;

  // Rajju Yoga: All planets in movable signs (0,3,6,9 = Ar,Ca,Li,Cp)
  const movableSigns = [0,3,6,9];
  if (mainPlanets.every(p => movableSigns.includes(signOf(p.siderealLon)))) {
    add('Rajju Yoga (Nabhas)', 'Nabhas', 'Moderate',
      'All planets in movable signs — active, travelling life; fond of change and movement', 'All planets');
  }
  // Musala Yoga: All planets in fixed signs (1,4,7,10 = Ta,Le,Sc,Aq)
  const fixedSigns = [1,4,7,10];
  if (mainPlanets.every(p => fixedSigns.includes(signOf(p.siderealLon)))) {
    add('Musala Yoga (Nabhas)', 'Nabhas', 'Moderate',
      'All planets in fixed signs — stable, determined, respected; accumulates wealth and honor', 'All planets');
  }
  // Nala Yoga: All planets in dual/mutable signs (2,5,8,11 = Ge,Vi,Sg,Pi)
  const dualSigns = [2,5,8,11];
  if (mainPlanets.every(p => dualSigns.includes(signOf(p.siderealLon)))) {
    add('Nala Yoga (Nabhas)', 'Nabhas', 'Moderate',
      'All planets in dual signs — versatile, skilled in multiple fields, good at crafts', 'All planets');
  }
  // Yava Yoga: Planets in first 6 and last 6 signs, none in middle
  const firstHalf  = mainPlanets.filter(p => signOf(p.siderealLon) < 6).length;
  const secondHalf = mainPlanets.filter(p => signOf(p.siderealLon) >= 6).length;
  if (firstHalf > 0 && secondHalf > 0 && numOccupiedSigns <= 6) {
    add('Yava Yoga (Nabhas)', 'Nabhas', 'Moderate',
      'Planets clustered in two halves of zodiac — fortunate middle life, charitable disposition', 'Multiple planets');
  }
  // Kamala Yoga: Planets in all 4 kendras (1,4,7,10)
  const inKendras = mainPlanets.filter(p => [1,4,7,10].includes(p.house));
  if ([1,4,7,10].every(h => inKendras.some(p => p.house === h))) {
    add('Kamala Yoga (Nabhas)', 'Nabhas/Raja', 'Strong',
      'Planets in all four kendra houses — like a lotus, rises from mud to become famous and noble', 'Multiple planets');
  }

  // ── 18. SANYASA YOGA ─────────────────────────────────────────
  // BPHS: 4 or more planets (excluding Sun) in a single kendra → Sanyasa Yoga
  for (const h of [1,4,7,10]) {
    const inH = mainPlanets.filter(p => p.house === h && p.name !== 'Sun');
    if (inH.length >= 4) {
      add('Sanyasa Yoga', 'Renunciation', 'Strong',
        `4+ planets in ${h}th kendra — tendency toward renunciation, spiritual path, or leadership in an institution`,
        inH.map(p=>p.name).join(','));
      break;
    }
  }
  // Pravrajya Yoga: Strong Saturn aspects Moon in a kendra or trikona
  if (sat && moon && isKDT(moon.house)) {
    const satToMoon = ((moon.house - sat.house + 12) % 12);
    const moonToSat = ((sat.house - moon.house + 12) % 12);
    if (satToMoon === 6 || moonToSat === 6 || // opposition
       (sat.name === 'Saturn' && [2,9].includes(satToMoon))) { // Saturn special aspects 3rd(2+1), 10th(9+1) — house diff
      add('Pravrajya Yoga', 'Renunciation', 'Moderate',
        `Saturn aspects Moon in kendra/trikona — inclination toward asceticism, deep spiritual practices, or monastic life`,
        'Saturn,Moon');
    }
  }

  // ── 19. DARIDRA YOGA (poverty/adversity) ─────────────────────
  // Lord of 1st in 8th or 12th, and lord of 11th in 6th, 8th, or 12th
  const lagna1Sign = SIGNS[signOf(ascLon)];
  const lord1 = getP(planets, SIGN_LORDS[lagna1Sign]);
  if (lord1 && [8,12].includes(lord1.house)) {
    const h11Sign = SIGNS[(signOf(ascLon) + 10) % 12];
    const lord11 = getP(planets, SIGN_LORDS[h11Sign]);
    if (lord11 && [6,8,12].includes(lord11.house)) {
      add('Daridra Yoga', 'Adversity', 'Moderate',
        `Lagna lord in ${lord1.house}H and 11H lord in dusthana — financial struggles, obstacles in gains; overcome by effort and remedies`,
        `${lord1.name},${lord11.name}`);
    }
  }

  // ── 20. KEMDRUM YOGA ─────────────────────────────────────────
  // Moon with no planets in 2nd or 12th from it (and no planets conjunct Moon)
  if (moon) {
    const h2fromMoon  = ((moon.house    ) % 12) + 1;
    const h12fromMoon = ((moon.house - 2 + 12) % 12) + 1;
    const hasNeighbors = mainPlanets.some(p =>
      p.name !== 'Moon' && (p.house === h2fromMoon || p.house === h12fromMoon || p.house === moon.house)
    );
    if (!hasNeighbors) {
      add('Kemdrum Yoga', 'Challenge', 'Moderate',
        'Moon isolated — no planets in 2nd or 12th from Moon; emotional struggles, sense of isolation, overcomes through spiritual practice',
        'Moon');
    }
  }

  // ── 21. VOSHI / VESHI / UBHAYACHARI YOGA ─────────────────────
  if (sun && moon) {
    const h2fromSun  = ((sun.house    ) % 12) + 1;
    const h12fromSun = ((sun.house - 2 + 12) % 12) + 1;
    const inH2sun  = mainPlanets.filter(p => p.name !== 'Sun' && p.house === h2fromSun);
    const inH12sun = mainPlanets.filter(p => p.name !== 'Sun' && p.house === h12fromSun);
    if (inH2sun.length > 0 && inH12sun.length > 0) {
      add('Ubhayachari Yoga', 'Fame', 'Strong',
        'Planets in both 2nd and 12th from Sun — eloquent, balanced, gains from multiple directions, respected in society',
        [...inH2sun, ...inH12sun].map(p=>p.name).join(','));
    } else if (inH2sun.length > 0) {
      add('Voshi Yoga', 'Sun-strength', 'Moderate',
        `Planets in 2nd from Sun (H${h2fromSun}) — influential speech, gains through government/authority`,
        inH2sun.map(p=>p.name).join(','));
    } else if (inH12sun.length > 0) {
      add('Veshi Yoga', 'Sun-strength', 'Moderate',
        `Planets in 12th from Sun (H${h12fromSun}) — diplomatic, skilled in foreign affairs, gains through indirect means`,
        inH12sun.map(p=>p.name).join(','));
    }
  }

  // ── 22. LAKSHMI YOGA (extended) ──────────────────────────────
  // Venus in own/exalted in kendra/trikona AND lord of 9th also strong
  if (ven && isKDT(ven.house) && (isOwn('Venus',ven.siderealLon)||isExalt('Venus',ven.siderealLon))) {
    const h9Sign = SIGNS[(signOf(ascLon)+8)%12];
    const lord9  = getP(planets, SIGN_LORDS[h9Sign]);
    if (lord9 && (isOwn(lord9.name,lord9.siderealLon)||isExalt(lord9.name,lord9.siderealLon)||isKDT(lord9.house))) {
      add('Lakshmi Yoga', 'Wealth/Fortune', 'Very Strong',
        `Venus dignified in kendra/trikona + 9H lord strong — exceptional wealth, refined life, spiritual prosperity`,
        `Venus,${lord9.name}`);
    }
  }

  // Remove near-duplicates
  const seen = new Set();
  return yogas.filter(y => {
    const key = y.name+y.planets;
    if (seen.has(key)) return false;
    seen.add(key); return true;
  });
}
