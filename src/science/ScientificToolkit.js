/** Pure-JS mathematical utilities used by astronomical/timing/validation layers. */
export const TAU = Math.PI * 2;
export const DEG2RAD = Math.PI / 180;
export const RAD2DEG = 180 / Math.PI;
export const normalizeDegrees = d => ((Number(d) % 360) + 360) % 360;
export const signedAngularDifference = (a,b) => {
  const d = normalizeDegrees(Number(a)-Number(b));
  return d > 180 ? d-360 : d;
};
export const angularDistance = (a,b) => Math.abs(signedAngularDifference(a,b));
export const mean = xs => { const a=xs.filter(Number.isFinite); return a.length ? a.reduce((s,x)=>s+x,0)/a.length : NaN; };
export const variance = xs => { const a=xs.filter(Number.isFinite); if(a.length<2)return NaN; const m=mean(a); return a.reduce((s,x)=>s+(x-m)**2,0)/(a.length-1); };
export const standardDeviation = xs => Math.sqrt(variance(xs));
export const clamp01 = x => Math.max(0, Math.min(1, Number(x) || 0));
export const brier = (p,y) => (clamp01(p)-Number(y))**2;
export const scientificLogLoss = (p,y) => { const q=Math.min(1-1e-15,Math.max(1e-15,clamp01(p))); return -(Number(y)*Math.log(q)+(1-Number(y))*Math.log(1-q)); };
export function linearInterpolate(x,x0,y0,x1,y1){ if(x1===x0)return y0; return y0+(x-x0)*(y1-y0)/(x1-x0); }
export function julianDay(year, month, day, hour=0, minute=0, second=0){
  let y=Number(year), m=Number(month); if(m<=2){y--;m+=12;}
  const A=Math.floor(y/100), B=2-A+Math.floor(A/4);
  const frac=(Number(hour)+Number(minute)/60+Number(second)/3600)/24;
  return Math.floor(365.25*(y+4716))+Math.floor(30.6001*(m+1))+Number(day)+frac+B-1524.5;
}
export function circularMeanDegrees(values){
  const a=values.filter(Number.isFinite); if(!a.length)return NaN;
  const x=a.reduce((s,d)=>s+Math.cos(d*DEG2RAD),0)/a.length;
  const y=a.reduce((s,d)=>s+Math.sin(d*DEG2RAD),0)/a.length;
  return normalizeDegrees(Math.atan2(y,x)*RAD2DEG);
}
