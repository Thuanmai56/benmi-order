const { execFileSync } = require('node:child_process');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');

const WORKER_DIR = path.resolve(__dirname, '..');
const CF_BIN = path.join(WORKER_DIR, 'node_modules/cf/bin/cf');

function resolveDatabase(database, mode) {
  const factory = require('../cloudflare.config.ts').default;
  const modes = mode ? [mode] : ['production', 'test', 'dev'];
  for (const candidate of modes) {
    const config = factory({ mode: candidate, isPreview: false });
    const binding = config.worker.env.DB;
    if (database === binding.name || database === binding.id) {
      return { id: binding.id, accountId: config.accountId };
    }
  }
  throw new Error(`Database ${database} does not match the configured Cloudflare mode ${mode || '(any)'}.`);
}

function parseQueryResults(output) {
  const parsed = JSON.parse(output);
  if (parsed.success === false) throw new Error('cf D1 query failed.');
  const results = Array.isArray(parsed) ? parsed : parsed.result;
  if (!Array.isArray(results) || results.some(result => result.success === false || !Array.isArray(result.results))) {
    throw new Error('Unexpected cf D1 query response.');
  }
  return results;
}

function executeD1(database, sql, isRemote = true, mode = null) {
  const target = resolveDatabase(database, mode);
  const directory = fs.mkdtempSync(path.join(os.tmpdir(), 'benmi-cf-d1-'));
  const bodyPath = path.join(directory, 'query.json');
  try {
    fs.writeFileSync(bodyPath, JSON.stringify({ sql: sql.trim() }), { mode: 0o600 });
    const args = [CF_BIN, 'd1', 'query', target.id, '--body', `@${bodyPath}`];
    if (!isRemote) args.push('--local');
    const output = execFileSync(process.execPath, args, {
      cwd: WORKER_DIR,
      env: { ...process.env, CLOUDFLARE_ACCOUNT_ID: target.accountId },
      encoding: 'utf8',
      maxBuffer: 100 * 1024 * 1024,
      stdio: ['ignore', 'pipe', 'pipe']
    });
    return parseQueryResults(output);
  } finally {
    fs.rmSync(directory, { recursive: true, force: true });
  }
}

function executeD1Query(database, sql, isRemote = true, mode = null) {
  return executeD1(database, sql, isRemote, mode).flatMap(result => result.results);
}

function executeD1File(database, file, isRemote = true, mode = null) {
  return executeD1(database, fs.readFileSync(file, 'utf8'), isRemote, mode);
}

module.exports = { resolveDatabase, parseQueryResults, executeD1Query, executeD1File };
