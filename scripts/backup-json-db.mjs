/** Offline JSON database backup. Copies only application data, never secrets. */
import { mkdir, copyFile } from 'node:fs/promises';
import { join } from 'node:path';
const target=process.env.BACKUP_DIR||'data/backups'; const stamp=new Date().toISOString().replace(/[:.]/g,'-'); await mkdir(target,{recursive:true});
for(const f of ['data/runtime/subscriptions.json','data/runtime/jobs.json','data/runtime/report-history.json']){try{await copyFile(f,join(target,`${stamp}-${f.split('/').pop()}`));console.log('Backed up',f)}catch(e){if(e.code!=='ENOENT')throw e}}
