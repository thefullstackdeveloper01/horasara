/** JSON delivery audit database. Stores status/metadata, never provider secrets. */
import { randomUUID } from 'node:crypto';
import { JsonDatabase } from '../infrastructure/persistence/JsonDatabase.js';
export class ReportHistory{
 constructor({filePath='data/runtime/report-history.json'}={}){this.db=new JsonDatabase({filePath,defaults:{version:1,reports:[]}})}
 async record(entry){const row={id:randomUUID(),createdAt:new Date().toISOString(),...entry};await this.db.transaction(x=>{x.reports.unshift(row);x.reports=x.reports.slice(0,10000);return x});return row}
 async forSubscription(id){return (await this.db.read()).reports.filter(x=>x.subscriptionId===id)}
}
