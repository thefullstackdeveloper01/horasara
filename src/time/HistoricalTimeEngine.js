/** Deterministic civil-time engine backed by the host's IANA/ICU timezone database. */
export class HistoricalTimeEngine {
  constructor({ timeZone = 'UTC' } = {}) { this.timeZone = timeZone; this._validateZone(timeZone); }
  _validateZone(timeZone) { try { new Intl.DateTimeFormat('en-US', { timeZone }).format(0); } catch { throw new RangeError(`Invalid IANA timezone: ${timeZone}`); } }
  offsetMinutes(utcDate) {
    const date = utcDate instanceof Date ? utcDate : new Date(utcDate);
    if (Number.isNaN(date.getTime())) throw new TypeError('utcDate must be a valid Date');
    const parts = new Intl.DateTimeFormat('en-US', { timeZone: this.timeZone, year:'numeric',month:'2-digit',day:'2-digit',hour:'2-digit',minute:'2-digit',second:'2-digit',hourCycle:'h23' }).formatToParts(date);
    const get = name => Number(parts.find(p => p.type === name)?.value);
    const localAsUtc = Date.UTC(get('year'), get('month') - 1, get('day'), get('hour'), get('minute'), get('second'));
    return Math.round((localAsUtc - date.getTime()) / 60000);
  }
  resolveLocal({ year, month, day, hour=0, minute=0, second=0 }) {
    const wall = Date.UTC(year, month - 1, day, hour, minute, second); let utcMs = wall;
    for (let i=0;i<6;i++) { const next = wall - this.offsetMinutes(new Date(utcMs))*60000; if (next===utcMs) break; utcMs=next; }
    const date=new Date(utcMs); const offsetMinutes=this.offsetMinutes(date);
    return Object.freeze({ utc:date.toISOString(), offsetMinutes, timeZone:this.timeZone, local:this.format(date), status:'RESOLVED' });
  }
  format(date) { return new Intl.DateTimeFormat('en-GB',{timeZone:this.timeZone,year:'numeric',month:'2-digit',day:'2-digit',hour:'2-digit',minute:'2-digit',second:'2-digit',hourCycle:'h23'}).format(date instanceof Date?date:new Date(date)); }
  transitionSnapshot({startYear,endYear}) {
    if (!Number.isInteger(startYear)||!Number.isInteger(endYear)||endYear<startYear) throw new RangeError('Invalid year range');
    const rows=[]; let previous=null;
    for(let year=startYear;year<=endYear;year++) for(const month of [1,4,7,10]) { const date=new Date(Date.UTC(year,month-1,1,12)); const offsetMinutes=this.offsetMinutes(date); if(offsetMinutes!==previous) rows.push({date:date.toISOString(),offsetMinutes}); previous=offsetMinutes; }
    return Object.freeze(rows);
  }
}
