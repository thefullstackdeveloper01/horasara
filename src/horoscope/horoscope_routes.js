import { buildHoroscope } from '../calculators/CalculatorEngine.js';
export const HOROSCOPE_ROUTES = Object.freeze({
  '/horoscope/daily-horoscope':'daily',
  '/horoscope/tomorrow-horoscope':'tomorrow',
  '/horoscope/yesterday-horoscope':'yesterday',
  '/horoscope/weekly-horoscope':'weekly',
  '/horoscope/monthly-horoscope':'monthly',
  '/horoscope/yearly-horoscope':'yearly'
});
export function horoscopeRequest(path,date,sign){ const d=new Date(`${date||new Date().toISOString().slice(0,10)}T00:00:00Z`); if(path.includes('tomorrow')) d.setUTCDate(d.getUTCDate()+1); if(path.includes('yesterday')) d.setUTCDate(d.getUTCDate()-1); const period=HOROSCOPE_ROUTES[path]; return buildHoroscope(period,d.toISOString().slice(0,10),sign); }
