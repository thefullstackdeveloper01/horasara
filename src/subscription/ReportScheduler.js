import { mkdir, appendFile } from 'node:fs/promises';
import { SubscriptionService } from './SubscriptionService.js';
import { buildSubscriberReport, createDeliveryTransports } from './DeliveryService.js';
import { calculateChart } from '../engine/InternalCalculationEngine.js';
import { ReportHistory } from './ReportHistory.js';

export class ReportScheduler {
  constructor({subscriptionService, transports, clock=()=>new Date(), calculate=calculateChart, history=new ReportHistory()}={}) {
    this.subscriptions=subscriptionService||new SubscriptionService();
    this.transports=transports;
    this.clock=clock;this.calculate=calculate;this.history=history;
  }
  async runOnce() {
    await this.subscriptions.expireDuePaidSubscriptions?.(this.clock());
    const all=await this.subscriptions.list({includeUnconfirmed:true});
    const due=all.filter(s=>this.subscriptions.isDue(s,this.clock()));
    const results=[];
    for(const s of due){
      try{
        const chart=await this.calculate({...s.birth,name:s.name,calculationDateTime:this.clock().toISOString()});
        const report=await buildSubscriberReport(chart,s,this.clock());
        const channelResults=[];
        for(const channel of s.channels){
          const to=channel==='email'?s.email:s.mobile;
          if(!to) continue;
          try{
            const transport=this.transports[channel];
            const payload=channel==='email'
              ? {to,subject:report.subject,text:report.text,html:report.html,subscriptionId:s.id}
              : {to,text:report.text,subscriptionId:s.id};
            channelResults.push({channel,to,...await transport.send(payload)});
          }catch(error){channelResults.push({channel,to,status:'failed',error:error.message});}
        }
        const failed=channelResults.filter(x=>x.status==='failed');
        await this.subscriptions.markDelivery(s.id,failed.length?'partial':'sent',{channels:channelResults,reportDate:report.date});
        const status=failed.length?'partial':'sent'; await this.history.record({subscriptionId:s.id,status,frequency:s.frequency,report:report.reportDate||report.date,channels:channelResults.map(x=>({channel:x.channel,status:x.status,provider:x.provider||null}))}); results.push({subscriptionId:s.id,status,channels:channelResults});
      }catch(error){
        await this.subscriptions.markDelivery(s.id,'failed',{error:error.message});
        await this.history.record({subscriptionId:s.id,status:'failed',error:error.message,frequency:s.frequency}); results.push({subscriptionId:s.id,status:'failed',error:error.message});
      }
    }
    return {runAt:this.clock().toISOString(),scanned:all.length,due:due.length,results};
  }
  async daemon({pollMs=60000}={}) {
    const run=async()=>{try{console.log(JSON.stringify(await this.runOnce(),null,2));}catch(e){console.error(e);}};
    await run(); setInterval(run,pollMs);
  }
}
export async function createDefaultScheduler({filePath,env=process.env}={}) {
  const subscriptions=new SubscriptionService({filePath});
  const transports=await createDeliveryTransports(env);
  return new ReportScheduler({subscriptionService:subscriptions,transports});
}
