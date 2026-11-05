import assert from 'node:assert/strict';
import fs from 'node:fs';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const json=(file)=>JSON.parse(fs.readFileSync(path.join(root,file),'utf8'));
const rootPkg=json('package.json');
const webPkg=json('apps/web/package.json');
const release=json('release.json');
const pattern=/^(0|[1-9]\d*)\.(0|[1-9]\d*)\.(0|[1-9]\d*)(?:-[0-9A-Za-z.-]+)?$/;
assert.match(release.version,pattern,'invalid SemVer');
assert.equal(rootPkg.version,release.version,'root package release mismatch');
assert.equal(webPkg.version,release.version,'web app release mismatch');
assert.equal(release.gitTag,'v'+release.version,'tag/version mismatch');
assert.ok(['alpha','beta','rc','stable'].includes(release.channel),'invalid channel');
assert.ok(['pending-deployment','deployed'].includes(release.status),'invalid release status');
assert.ok(fs.existsSync(path.join(root,'docs/releases/'+release.gitTag+'.md')),'release note missing');
const note=fs.readFileSync(path.join(root,'docs/releases/'+release.gitTag+'.md'),'utf8');
assert.ok(note.includes('v'+release.version),'release note does not reference version');
assert.ok(note.includes('## Contenu') && note.includes('## Risques'), 'release note missing sections');
assert.ok(fs.existsSync(path.join(root,'CHANGELOG.md')),'global changelog missing');
assert.ok(fs.readFileSync(path.join(root,'CHANGELOG.md'),'utf8').includes('['+release.version+']'),'global changelog version missing');
// Release documentation gate begins with the 0.22 alpha series.
const [major,minor]=release.version.split('.').map(Number);
if(major>0||minor>=22){
 const declared=['User','Technical','API','Operations','QA','Roadmap'];
 assert.ok(note.includes('## Documentation prepublication'),
   'release notes must include a pre-publication documentation manifest');
 for(const kind of declared){
   const match=note.match(new RegExp('^Documentation-'+kind+':\\s+`(docs/[^\\n`]+)`\\s*assert.ok(Number(release.version.split('.')[0])>=1,'stable only from 1.0.0');
console.log('Release contract OK:',release.gitTag,release.channel,release.status);
,'m'));
   assert.ok(match,'missing release documentation reference for '+kind);
   const rel=match[1],full=path.resolve(root,rel);
   assert.ok(full.startsWith(path.join(root,'docs')+path.sep),
     'unsafe documentation reference '+rel);
   assert.ok(fs.existsSync(full)&&fs.statSync(full).size>100,
     'missing/empty required documentation '+rel);
 }
 const mandatory=['README.md','docs/ops/PRODUCTION-GATE.md',
   'docs/ops/VERCEL_PRODUCTION.md','docs/ops/RELEASE-DOCUMENTATION-GATE.md'];
 for(const rel of mandatory)assert.ok(fs.existsSync(path.join(root,rel))&&
   fs.statSync(path.join(root,rel)).size>100,'missing mandatory release doc '+rel);
}
if(release.channel==='stable')assert.ok(Number(release.version.split('.')[0])>=1,'stable only from 1.0.0');
console.log('Release contract OK:',release.gitTag,release.channel,release.status);
