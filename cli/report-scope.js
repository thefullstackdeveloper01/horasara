import readline from 'node:readline';
function parseArgs(){const args=process.argv.slice(2),out={};for(let i=0;i<args.length;i++){if(args[i].startsWith('--')){const key=args[i].slice(2);out[key]=args[i+1]&&!args[i+1].startsWith('--')?args[++i]:true;}}return out;}
const VALID=Object.freeze({basic:'basic',full:'complete',complete:'complete',today:'today',monthly:'monthly',yearly:'yearly'});
function ask(rl,q){return new Promise(resolve=>rl.question(q,a=>resolve(a.trim().toLowerCase())));}
export async function chooseReportScope(){
  const flags=parseArgs(); const requested=String(flags.report||'').toLowerCase();
  if(requested){ if(!VALID[requested]) throw new Error(`Invalid --report "${requested}". Use basic | full | complete | today | monthly | yearly.`); return VALID[requested]; }
  // Automated/CI invocations have no interactive TTY. Default to the complete
  // report there so PDF generation never silently exits without creating output.
  if(!process.stdin.isTTY || !process.stdout.isTTY){
    console.log('  Non-interactive input detected: defaulting to Full Report.');
    return 'complete';
  }
  // Normal interactive birth-report flow: exactly the two requested choices.
  // Legacy dated scopes remain supported explicitly through --report.
  const rl=readline.createInterface({input:process.stdin,output:process.stdout});
  console.log('\n  Report type:');
  console.log('  1) Basic Report');
  console.log('      Basic details, Avkahada, favourable/ghatak points, charts, planetary positions,\n      Vimshottari Dasha, Ashtakvarga, Chalit, Ascendant, Nakshatra Phal, life predictions,\n      Manglik/Mangal Dosha and Sadesati.');
  console.log('  2) Full Report');
  console.log('      Complete detailed report, including the complete 80-section master organization\n      and all existing advanced calculations, predictions, remedies and audit sections.');
  let choice=''; while(!{'1':'basic','2':'complete'}[choice]){ choice=await ask(rl,'  Select report [1/2]: '); if(!{'1':'basic','2':'complete'}[choice]) console.log('  ❌ Please enter 1 or 2.'); }
  rl.close(); return {'1':'basic','2':'complete'}[choice];
}
