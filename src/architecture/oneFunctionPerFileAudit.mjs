import fs from 'node:fs'; import path from 'node:path';
const root=process.argv[2]||'src';
function walk(d){return fs.readdirSync(d,{withFileTypes:true}).flatMap(e=>e.isDirectory()?walk(path.join(d,e.name)):[path.join(d,e.name)]);}
function countFunctions(text){return (text.match(/\b(?:export\s+)?(?:async\s+)?function\s+\w+\s*\(/g)||[]).length+(text.match(/\b(?:const|let)\s+\w+\s*=\s*(?:async\s*)?\([^)]*\)\s*=>/g)||[]).length;}
const rows=walk(root).filter(f=>f.endsWith('.js')||f.endsWith('.mjs')).map(f=>({file:f,functions:countFunctions(fs.readFileSync(f,'utf8'))}));
const violations=rows.filter(r=>r.functions>1); console.log(JSON.stringify({root,totalFiles:rows.length,violations,strictPass:violations.length===0},null,2)); process.exit(violations.length?2:0);
