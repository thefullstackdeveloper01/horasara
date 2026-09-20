#!/usr/bin/env node
import { runMasterAudit } from '../src/completion/MasterCodebaseAudit.js';
const r=runMasterAudit(); console.log(JSON.stringify(r,null,2)); if(!r.pass) process.exitCode=1;
