import { calculateCompleteDasha } from './CompleteDashaEngine.js';
import { calculateCompletePrashna } from './CompletePrashnaEngine.js';
import { calculateCompleteLalKitab } from './CompleteLalKitabEngine.js';
import { calculateCompleteRelationship } from './CompleteRelationshipEngine.js';
import { buildSarvatobhadraChakra } from '../systems/sarvatobhadra/SarvatobhadraEngine.js';
import { calcKPChart } from '../kp/kp_system.js';
import { calcRulingPlanets, judgeKPEvent } from '../kp/kp_event_judgement.js';
import { auditCalculationParity } from './CalculationParityAudit.js';
import { calcCharaKarakas } from '../dasha/chara.js';
import { calcArudhaLagna } from '../jaimini/arudha.js';
import { calcKarakamsa } from '../jaimini/karakamsa.js';

export function calculateCompleteEngine(input={}){
 const out={engineVersion:'11.0.0-calculation-completion',systems:{},calculationParity:auditCalculationParity()};
 if(input.dasha) out.systems.dasha=calculateCompleteDasha(input.dasha);
 if(input.prashna) out.systems.prashna=calculateCompletePrashna(input.prashna);
 if(input.lalKitab) out.systems.lalKitab=calculateCompleteLalKitab(input.lalKitab);
 if(input.relationship) out.systems.relationship=calculateCompleteRelationship(input.relationship);
 if(input.sarvatobhadra) out.systems.sarvatobhadra=buildSarvatobhadraChakra(input.sarvatobhadra);
 if(input.kp) { out.systems.kp=calcKPChart(input.kp.planets,input.kp.ascLon,input.kp.ayanamsa,input.kp.placidusParams); out.systems.kp.rulingPlanets=calcRulingPlanets({lagnaLon:input.kp.ascLon,moonLon:input.kp.moonLon,dayLord:input.kp.dayLord}); if(input.kp.event) out.systems.kp.eventJudgement=judgeKPEvent({significators:out.systems.kp.significators,cuspalHouse:input.kp.event.cuspalHouse,positiveHouses:input.kp.event.positiveHouses||[],negativeHouses:input.kp.event.negativeHouses||[],dashaLords:input.kp.event.dashaLords||[]}); }
 if(input.jaimini){out.systems.jaimini={karakas:calcCharaKarakas(input.jaimini.planets||[]),arudhas:calcArudhaLagna(input.jaimini.houses||[],input.jaimini.planets||[],input.jaimini.ascLon),karakamsa:calcKarakamsa(input.jaimini.planets||[],input.jaimini.vargas||{})};}
 return out;
}
