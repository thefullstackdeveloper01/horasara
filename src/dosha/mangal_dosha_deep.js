export function buildMangalDoshaDeep(R){
  const d=R?.doshas?.mangal; const ps=R?.planets||[];
  if(!d) return {status:'NOT_CALCULATED',reason:'Mangal Dosha result is unavailable'};
  const mars=ps.find(p=>p.name==='Mars');
  return {status:'AVAILABLE',formation:!!d.hasDosha,cancelled:!!d.isCancelled,severity:d.severity ?? null,
    marsHouse:mars?.house ?? null, fromLagna:d.fromLagna ?? null, fromMoon:d.fromMoon ?? null, fromVenus:d.fromVenus ?? null,
    cancellationReasons:d.cancellationReasons||d.cancellations||[], remedy:d.remedy||null,
    methodology:'Mars placement evaluated from Lagna, Moon and Venus with the engine’s existing cancellation rules'};
}
export default {buildMangalDoshaDeep};
