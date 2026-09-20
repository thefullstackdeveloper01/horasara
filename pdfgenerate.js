#!/usr/bin/env node
/** Generate the complete dynamic JyotiVeda PDF from the same CLI birth input. */
import fs from 'node:fs/promises';
import path from 'node:path';
import { BirthInputProvider } from './app/BirthInputProvider.js';
import { ChartCalculatorService } from './app/ChartCalculatorService.js';
import { buildJyotiVedaReport } from './src/reporting/JyotiVedaReportEngine.js';
import { SimplePdfWriter } from './src/reporting/SimplePdfWriter.js';
import { chooseReportScope } from './cli/report-scope.js';
import { buildBasicReport } from './src/reporting/BasicReport.js';

function outputPath(){
  const i=process.argv.indexOf('--out');
  return i>=0 && process.argv[i+1] ? path.resolve(process.argv[i+1]) : path.resolve('reports/JyotiVeda-Authentic-Report.pdf');
}

async function main(){
  console.log('\nJYOTIVEDA PDF REPORT GENERATOR');
  console.log('Calculation -> Evidence -> Prediction -> Timing -> Remedies -> Audit -> PDF\n');
  const selectedScope = await chooseReportScope();
  const birth=await new BirthInputProvider({reportScope:selectedScope}).collect();
  const scope = birth.reportScope || selectedScope || 'complete';
  const started=Date.now();
  const chart=await new ChartCalculatorService().calculate(birth);
  const elapsed=Date.now()-started;
  const report = scope === 'basic'
    ? buildBasicReport(chart,{elapsedMs:elapsed,version:'4.0-basic'})
    : buildJyotiVedaReport(chart,{elapsedMs:elapsed,version:'4.0'});
  const pdf=new SimplePdfWriter({title:report.title,author:'JyotiVeda'}).render(report);
  const out=outputPath(); await fs.mkdir(path.dirname(out),{recursive:true}); await fs.writeFile(out,pdf);
  const json=out.replace(/\.pdf$/i,'.json'); await fs.writeFile(json,JSON.stringify(report,null,2));
  console.log(`\nPDF generated: ${out}`);
  console.log(`Structured report: ${json}`);
  console.log(`Pages: dynamic; bytes: ${pdf.length}; calculation: ${elapsed} ms`);
}
main().catch(err=>{console.error('\nFatal error while generating PDF report:\n',err?.stack||err);process.exit(1);});
