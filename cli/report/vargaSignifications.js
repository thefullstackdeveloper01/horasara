/**
 * vargaSignifications.js — Section 54: DIVISIONAL CHART (VARGA)
 * CLASSICAL SIGNIFICATIONS — Chara Karakas, D9 Navamsa spouse nature,
 * D10 Dashamsa career, and Karakamsha Lagna, all keyed to this chart's
 * own already-computed placements.
 */
import { section, sub, kv, C } from '../console-ui.js';
import moduleData from '../../dataset/used/core/varga_interpretations.json' with { type: 'json' };

export function printVargaSignifications(R) {
  section('54. DIVISIONAL CHART (VARGA) SIGNIFICATIONS — वर्ग फल');
  const v = R.vargaSignifications;
  if (!v || v.error) {
    console.log('  ' + C.dim + '(unavailable: ' + (v?.error || 'no data') + ')' + C.reset);
    return;
  }


  const covered = ['D2','D3','D4','D7','D12','D16','D20','D24','D27','D30','D40','D45','D60'];
  if (R.vargas) {
    sub('Extended Varga Interpretations');
    for (const id of covered) {
      const row = moduleData[id];
      const chart = R.vargas?.[id];
      if (!row || !chart) continue;
      kv(`${id} ${row.name}`, `${row.domain} — ${row.interpretation}`);
    }
    console.log('  ' + C.dim + 'Interpretations are classical signification guidance; they are not deterministic predictions and should be read with D1 and the relevant house/lord context.' + C.reset);
  }

  if (v.charaKarakas) {
    sub('Chara Karakas — Jaimini 7-Planet Ranking');
    for (const k of v.charaKarakas) {
      console.log(`     ${k.karakaShort.padEnd(4)} ${k.karaka.padEnd(35)} → ${k.planet} (${k.degInSign}° in sign)`);
    }
    console.log('  ' + C.dim + `Source: ${v.charaKarakas[0]?.source}` + C.reset);
    console.log('');
  }

  if (v.navamsaSpouse) {
    sub('D9 Navamsa — Spouse Nature');
    kv('D9 Lagna Sign', v.navamsaSpouse.d9LagnaSign);
    if (v.navamsaSpouse.spouseNatureText) kv('Classical Spouse-Nature Indication', v.navamsaSpouse.spouseNatureText);
    console.log('  ' + C.bold + 'Classical D9 Analysis Rules (Parashara Hora Shastra):' + C.reset);
    for (const r of v.navamsaSpouse.classicalRules) {
      if (r.interpretation) console.log(`     • ${r.name}: ${r.interpretation}`);
    }
    console.log('  ' + C.dim + `Source: ${v.navamsaSpouse.source}` + C.reset);
    console.log('');
  }

  if (v.dashamsaCareer) {
    sub('D10 Dashamsa — Career');
    kv('D10 Lagna Sign', `${v.dashamsaCareer.d10LagnaSign} — Lord: ${v.dashamsaCareer.d10LagnaLord}`);
    kv('Classically Suggested Fields (by D10 Lagna lord)', v.dashamsaCareer.careerFieldsForLord.join(', ') || '(no mapping)');
    if (v.dashamsaCareer.careerTypesForSign) kv('Career Types (by D10 Lagna sign)', v.dashamsaCareer.careerTypesForSign);
    console.log('  ' + C.dim + `Source: ${v.dashamsaCareer.source}` + C.reset);
    console.log('');
  }

  if (v.karakamshaLagna) {
    sub('Karakamsha Lagna (Jaimini)');
    kv('Atmakaraka (Soul Significator)', v.karakamshaLagna.atmakaraka);
    kv('Karakamsha Lagna Sign', v.karakamshaLagna.karakamshaLagnaSign);
    kv('Definition', v.karakamshaLagna.definition);
    kv('Purpose', v.karakamshaLagna.purpose);
    kv('Classical Uses', v.karakamshaLagna.usage.join(', '));
    console.log('  ' + C.dim + `Source: ${v.karakamshaLagna.source}` + C.reset);
  }
}
