/** Personalized remedy planner using current dasha/weakness evidence. */
export function buildRemedyPlanner(result) {
  const lord = result.dasha?.current?.mahadasha || null;
  const weak = Object.entries(result.shadbala || {}).filter(([,v]) => Number(v?.rupas ?? v?.shadBalaRupas ?? 999) < 5).map(([p]) => p);
  const weekday = {Sun:0,Moon:1,Mars:2,Mercury:3,Jupiter:4,Venus:5,Saturn:6};
  const planets = [...new Set([lord, ...weak].filter(Boolean))];
  return { planets, mantra: planets.map(planet => ({ planet, weekday: weekday[planet] ?? null, japaCount: 108, rationale: lord === planet ? 'Current Mahadasha lord' : 'Low calculated strength signal' })), daan: planets.map(planet => ({planet, schedule:'planetary weekday during a suitable local daytime muhurta', requiresMuhurtaEvaluation:true})), rudraksha: result.rudrakshaRecommendations || [], yantra: result.yantraRecommendations || [], gemstones: result.gemstoneRecommendations || [], disclaimer:'Traditional spiritual guidance; not medical, financial, or guaranteed outcome advice.' };
}
