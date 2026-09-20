/** JSON-backed persistent queue for report jobs. No external DB is required. */
import { randomUUID } from 'node:crypto';
import { JsonDatabase } from '../infrastructure/persistence/JsonDatabase.js';
export class JobQueue {
  constructor({filePath='data/runtime/jobs.json'}={}){this.db=new JsonDatabase({filePath,defaults:{version:1,jobs:[]}})}
  async enqueue(job){const item={id:randomUUID(),status:'pending',attempts:0,createdAt:new Date().toISOString(),nextAttemptAt:new Date().toISOString(),...job};await this.db.transaction(x=>{x.jobs.push(item);return x});return item;}
  async claimDue(limit=10,now=new Date()){const t=now.toISOString(),out=[];await this.db.transaction(x=>{x.jobs=x.jobs.map(j=>{if(out.length<limit&&j.status==='pending'&&j.nextAttemptAt<=t){const c={...j,status:'processing',lockedAt:t};out.push(c);return c;}return j});return x});return out;}
  async complete(id,result={}){await this.db.transaction(x=>{const j=x.jobs.find(y=>y.id===id);if(j){j.status='completed';j.completedAt=new Date().toISOString();j.result=result}return x})}
  async fail(id,error,maxAttempts=5){await this.db.transaction(x=>{const j=x.jobs.find(y=>y.id===id);if(j){j.attempts++;j.error=String(error);j.status=j.attempts>=maxAttempts?'dead':'pending';j.nextAttemptAt=new Date(Date.now()+Math.min(3600000,60000*2**j.attempts)).toISOString()}return x})}
  async list(){return (await this.db.read()).jobs}
}
