import assert from 'node:assert/strict';
import fs from 'node:fs';
import {fileURLToPath} from 'node:url';
import path from 'node:path';

const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const json=(file)=>JSON.parse(fs.readFileSync(path.join(root,file),'utf8'));
const rootPkg=json('package.json');
const webPkg=json('apps/web/package.json');
const release=json('release.json');
const pattern=/^(0|[1-9][0-9]*)[.](0|[1-9][0-9]*)[.](0|[1-9][0-9]*)(?:-[0-9A-Za-z.-]+)?$/;
assert.match(release.version,pattern,'invalid SemVer');
assert.equal(rootPkg.version,release.version,'root package release mismatch');
assert.equal(webPkg.version,release.version,'web app release mismatch');
assert.equal(release.gitTag,'v'+release.version,'tag/version mismatch');
assert.ok(['alpha','beta','rc','stable'].includes(release.channel),'invalid channel');
assert.ok(['pending-deployment','deployed'].includes(release.status),'invalid release status');

const releaseDoc='docs/releases/'+release.gitTag+'.md';
assert.ok(fs.existsSync(path.join(root,releaseDoc)),'release note missing');
const note=fs.readFileSync(path.join(root,releaseDoc),'utf8');
assert.ok(note.includes('v'+release.version),'release note does not reference version');
assert.ok(note.includes('## Contenu')&&note.includes('## Risques'),'release note missing sections');
const changeLog=fs.readFileSync(path.join(root,'CHANGELOG.md'),'utf8');
assert.ok(changeLog.includes('['+release.version+']'),'global changelog version missing');

const [major,minor]=release.version.split('.').map(Number);
if(major>0||minor>=22){
  assert.ok(note.includes('## Documentation prepublication'),
    'release notes must include a pre-publication documentation manifest');
  const kinds=['User','Technical','API','Operations','QA','Roadmap'];
  const lines=note.split(String.fromCharCode(10));
  for(const kind of kinds){
    const line=lines.find(line=>line.startsWith('Documentation-'+kind+': '));
    assert.ok(line,'release documentation manifest missing '+kind);
    const value=line.split(String.fromCharCode(96));
    assert.equal(value.length,3,'documentation entry must use one backtick path for '+kind);
    const rel=value[1];
    assert.ok(rel.startsWith('docs/')&&!rel.includes('..')&&!rel.includes(String.fromCharCode(92)),
      'invalid documentation path '+rel);
    const file=path.resolve(root,rel);
    assert.ok(file.startsWith(path.join(root,'docs')+path.sep),
      'unsafe documentation path '+rel);
    assert.ok(fs.existsSync(file)&&fs.statSync(file).size>100,
      'missing or empty required documentation '+rel);
  }
  const mandatory=['README.md','docs/ops/PRODUCTION-GATE.md',
    'docs/ops/VERCEL_PRODUCTION.md','docs/ops/RELEASE-DOCUMENTATION-GATE.md'];
  for(const rel of mandatory){
    const file=path.join(root,rel);
    assert.ok(fs.existsSync(file)&&fs.statSync(file).size>100,
      'missing or empty mandatory release documentation '+rel);
  }
}
if(release.channel==='stable')
  assert.ok(Number(release.version.split('.')[0])>=1,'stable only from 1.0.0');
console.log('Release documentation and version contract OK:',release.gitTag,release.channel,release.status);
