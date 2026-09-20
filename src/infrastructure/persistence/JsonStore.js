/** Compatibility wrapper around JsonDatabase. Legacy modules keep JsonStore's
 * read(default) API while enterprise persistence remains JSON and atomic. */
import { readFile } from 'node:fs/promises';
import { JsonDatabase } from './JsonDatabase.js';
export class JsonStore extends JsonDatabase {
  constructor(filePath){ super({filePath,defaults:{}}); }
  async read(defaultValue={}){
    try{return JSON.parse(await readFile(this.filePath,'utf8'));}
    catch(e){if(e.code==='ENOENT')return defaultValue;throw e;}
  }
}
