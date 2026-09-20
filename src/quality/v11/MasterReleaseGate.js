import fs from 'node:fs';
import path from 'node:path';
import moduleData from '../../../dataset/used/validation/v11-master-release-gate.json' with { type: 'json' };

const required = moduleData.required;
export function buildMasterReleaseGate({root=process.cwd(), checks={}}={}) {
  const files=required.map(f=>({file:f,present:fs.existsSync(path.join(root,f))}));
  const failed=files.filter(x=>!x.present);
  const external = {verifiedOutcomes: checks.verifiedOutcomes===true, independentEngines: checks.independentEngines===true, thirdPartyReview: checks.thirdPartyReview===true};
  const engineering = files.every(x=>x.present) && checks.tests===true && checks.security===true && checks.load===true;
  const evidenceComplete = Object.values(external).every(Boolean);
  return {version:'11.0', target:'100/100', engineeringComplete:engineering, evidenceComplete, releaseReady:engineering&&evidenceComplete, files, externalEvidence:external, policy:'Never fabricate outcomes, reference values, competitor results, or third-party review.'};
}
