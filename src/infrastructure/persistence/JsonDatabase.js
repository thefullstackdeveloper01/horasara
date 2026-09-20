/**
 * JSON DATABASE BOUNDARY
 * ----------------------
 * User requested JSON as the database. All enterprise persistence should go
 * through this class instead of writing JSON files from business modules.
 *
 * Benefits: offline, portable, dependency-free, atomic writes, and a clean
 * repository boundary for a future database adapter if scale ever requires it.
 */
import { mkdir, readFile, rename, writeFile } from 'node:fs/promises';
import { dirname, join } from 'node:path';
import { randomUUID } from 'node:crypto';

export class JsonDatabase {
  constructor({filePath, defaults={}}={}) { if(!filePath) throw new TypeError('filePath required'); this.filePath=filePath; this.defaults=structuredClone(defaults); }
  async init(){ await mkdir(dirname(this.filePath),{recursive:true}); try{await readFile(this.filePath,'utf8')}catch(e){if(e.code==='ENOENT')await this.write(this.defaults);else throw e;} }
  async read(){ await this.init(); const raw=await readFile(this.filePath,'utf8'); return raw.trim()?JSON.parse(raw):structuredClone(this.defaults); }
  async write(data){ await mkdir(dirname(this.filePath),{recursive:true}); const tmp=join(dirname(this.filePath),`.${randomUUID()}.tmp`); await writeFile(tmp,JSON.stringify(data,null,2),'utf8'); await rename(tmp,this.filePath); return data; }
  async transaction(mutator){ const current=await this.read(); const next=await mutator(structuredClone(current)); if(next===undefined)throw new Error('transaction must return data'); await this.write(next); return next; }
}
