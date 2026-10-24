import { execFileSync } from 'node:child_process';
import { readFileSync } from 'node:fs';
import { pathToFileURL } from 'node:url';

export function assetReferences(html) {
  return [...html.matchAll(/(?:src|href)=["']([^"']+)["']/g)].flatMap(([, value]) => {
    if (/^(?:https?:)?\/\//.test(value)) return [];
    const [file, query = ''] = value.replace(/^\//, '').split('?');
    return /^(?:js\/.*\.js|css\/.*\.css|index\.css)$/.test(file)
      ? [{ file, version: new URLSearchParams(query).get('v') }] : [];
  });
}
export function cacheBusterErrors(changed, before, after) {
  const errors = [];
  for (const [html, source] of Object.entries(after)) {
    const old = assetReferences(before[html] || '');
    for (const ref of assetReferences(source).filter(ref => changed.includes(ref.file))) {
      if (!ref.version || old.some(previous => previous.file === ref.file && previous.version === ref.version))
        errors.push(`${html}: ${ref.file} changed without a new ?v= URL`);
    }
  }
  return errors;
}
export function checkCacheBusters(base = process.env.MENU_QA_BASE_REF || 'HEAD') {
  const git = (...args) => execFileSync('git', args, { encoding: 'utf8' }).trim();
  git('rev-parse', '--verify', `${base}^{commit}`);
  const changed = git('diff', '--name-only', base, '--', 'js', 'css', 'index.css').split('\n');
  const pages = git('ls-files', '*.html').split('\n').filter(Boolean);
  const before = {}, after = {};
  for (const page of pages) {
    after[page] = readFileSync(page, 'utf8');
    try { before[page] = git('show', `${base}:${page}`); } catch { before[page] = ''; }
  }
  const errors = cacheBusterErrors(changed, before, after);
  if (errors.length) throw new Error(errors.join('\n'));
  console.log(`Cache-buster diff verified against ${base}`);
}
if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) checkCacheBusters(process.argv[2]);
