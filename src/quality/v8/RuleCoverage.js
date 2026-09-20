export function createRuleCoverage(){
  const declared=new Map(), executed=new Map();
  return {
    declare(id,meta={}){declared.set(String(id),{id:String(id),...meta});},
    hit(id){executed.set(String(id),(executed.get(String(id))||0)+1);},
    report(){const rows=[...declared.values()].map(r=>({...r,executions:executed.get(r.id)||0,executed:(executed.get(r.id)||0)>0}));return {declared:rows.length,executed:rows.filter(r=>r.executed).length,unexecuted:rows.filter(r=>!r.executed).length,coverage:rows.length?rows.filter(r=>r.executed).length/rows.length:0,rules:rows};}
  };
}
