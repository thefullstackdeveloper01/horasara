export function buildV9Readiness({calculationCases=0,researchCases=0,outcomeCases=0,benchmarkReports=0,ruleCoverage=0}={}){
 const gates={calculationCorpus:calculationCases>0,researchCorpus:researchCases>0,predictionOutcomes:outcomeCases>0,benchmarks:benchmarkReports>0,ruleCoverage:ruleCoverage>=0.95};
 return {version:'9.0.0',target:'55-65/100 maturity band',gates,empiricalAccuracyClaimAllowed:gates.calculationCorpus&&gates.predictionOutcomes&&gates.benchmarks,overallReady:Object.values(gates).every(Boolean)};
}
