import { section, C } from '../console-ui.js';
function printOne(title,data,key){
  section(title); const rows=data?.recommendations||[];
  if(!rows.length){console.log('  STATUS = NOT_AVAILABLE'); console.log('  No chart-derived recommendation is available under the current rule/data set.'); return;}
  for(const r of rows) console.log(`  • ${r.planet}: ${r[key]} — trigger: ${r.trigger}`);
  console.log('  ' + C.dim + data.methodology + C.reset);
  console.log('  ' + C.dim + 'Source: ' + data.source + C.reset);
}
export function printDetailedRemedies(R){
 printOne('GEMSTONE — DYNAMIC RECOMMENDATIONS',R.gemstoneRecommendations,'gemstone');
 printOne('RUDRAKSHA — DYNAMIC RECOMMENDATIONS',R.rudrakshaRecommendations,'rudraksha');
 printOne('YANTRA — DYNAMIC RECOMMENDATIONS',R.yantraRecommendations,'yantra');
}
