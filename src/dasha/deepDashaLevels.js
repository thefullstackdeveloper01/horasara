import { calcAntardashas, calcPratyantardashas, calcSookshmadashas, calcPranadashas } from './vimshottari.js';
import { calcYoginiAntardashas } from './yogini.js';

/** Build real nested Vimshottari periods up to Prana level. No placeholder children. */
export function buildVimshottariHierarchy(mahadashas, depth=5) {
  const out=[];
  for (const maha of mahadashas||[]) {
    const node={...maha, antardashas:[]};
    if(depth>=2){
      for(const antar of calcAntardashas(maha)){
        const an={...antar, pratyantars:[]};
        if(depth>=3){
          for(const praty of calcPratyantardashas(antar)){
            const pn={...praty, sookshmas:[]};
            if(depth>=4){
              for(const s of calcSookshmadashas(praty)){
                const sn={...s, pranas:[]};
                if(depth>=5) sn.pranas=calcPranadashas(s);
                pn.sookshmas.push(sn);
              }
            }
            an.pratyantars.push(pn);
          }
        }
        node.antardashas.push(an);
      }
    }
    out.push(node);
  }
  return out;
}

/** Build real Yogini sub-periods for every main period. */
export function buildYoginiHierarchy(dashas, depth=2) {
  return (dashas||[]).map(main=>({
    ...main,
    antardashas: depth>=2 ? calcYoginiAntardashas(main) : []
  }));
}
