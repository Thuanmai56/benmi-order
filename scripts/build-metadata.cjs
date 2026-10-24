const { execFileSync } = require('node:child_process');
const path = require('node:path');
const root = path.resolve(__dirname, '..');
function buildMetadata(environment) {
  const git = (...args) => execFileSync('git', args, { cwd: root, encoding: 'utf8' }).trim();
  return {
    commit: git('rev-parse', 'HEAD'),
    environment,
    dirty: Boolean(git('status', '--porcelain', '--untracked-files=normal')),
  };
}
module.exports = { buildMetadata };
if (require.main === module) {
  const branch = process.env.CF_PAGES_BRANCH || execFileSync('git', ['branch', '--show-current'], { cwd: root, encoding: 'utf8' }).trim();
  const environment = branch === 'main' ? 'production' : branch === 'staging' ? 'staging' : branch === 'dev' ? 'dev' : 'preview';
  require('node:fs').writeFileSync(path.join(root, '_build.json'), JSON.stringify(buildMetadata(environment)) + '\n');
}
