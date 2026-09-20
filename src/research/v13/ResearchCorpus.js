export function validateResearchRecord(r){
  const issues=[];
  if(!r?.id) issues.push('missing_id');
  if(!r?.subject?.name) issues.push('missing_subject');
  if(!r?.birth?.date) issues.push('missing_birth_date');
  if(!r?.event?.type||!r?.event?.date) issues.push('missing_event');
  if(!r?.sources?.length) issues.push('missing_sources');
  if(r?.verificationStatus!=='independently_verified') issues.push('not_independently_verified');
  return {valid:issues.length===0,issues};
}
export function researchIndex(records=[]){
  const valid=records.filter(r=>validateResearchRecord(r).valid);
  return {total:records.length,verified:valid.length,eventTypes:[...new Set(valid.map(r=>r.event.type))].sort()};
}
