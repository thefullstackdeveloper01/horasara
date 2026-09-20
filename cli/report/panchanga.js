/**
 * panchanga.js — Section 3: Tithi/Vara/Nakshatra/Yoga/Karana/Rahu Kaal/Muhurta
 * at the moment of birth.
 */
import { section, kv } from '../console-ui.js';

export function printPanchanga(R) {
  section('3. PANCHANGA AT BIRTH — जन्म पंचांग');
  const pg = R.panchanga;
  kv('Tithi', `${pg.tithi.name} (${pg.tithi.paksha}) — ${pg.tithi.progress}`);
  kv('Vara (Weekday)', `${pg.vara.name} / ${pg.vara.hindi} (Lord: ${pg.vara.lord})`);
  kv('Nakshatra', `${pg.nakshatra.name}  Pada ${pg.nakshatra.pada}  (Lord: ${pg.nakshatra.lord}, Deity: ${pg.nakshatra.deity})`);
  kv('Yoga', `${pg.yoga.name} (${pg.yoga.nature})`);
  kv('Karana', pg.karana.name);
  kv('Sunrise / Sunset', `${pg.sunrise?.split(' ').slice(-1)[0]} / ${pg.sunset?.split(' ').slice(-1)[0]}`);
  kv('Day Duration', pg.dayDuration);
  kv('Rahu Kaal', pg.rahuKaal ? `${pg.rahuKaal.start.split(' ').slice(-1)[0]} - ${pg.rahuKaal.end.split(' ').slice(-1)[0]}` : 'N/A (no sunrise/sunset at this location/date)');
  kv('Abhijit Muhurta', pg.abhijitMuhurta ? `${pg.abhijitMuhurta.startFormatted.split(' ').slice(-1)[0]} - ${pg.abhijitMuhurta.endFormatted.split(' ').slice(-1)[0]}` : 'N/A (no sunrise/sunset at this location/date)');
}
