// Run with: node --test tests/test_order_prefix_unique.js (requires sqlite3).
const assert = require('node:assert/strict');
const { spawnSync } = require('node:child_process');
const { readFileSync } = require('node:fs');
const path = require('node:path');
const { test } = require('node:test');

const migration = readFileSync(path.join(__dirname,
  '../benmi-worker-official/migrations/0051_make_order_prefix_unique.sql'), 'utf8');
const fixture = `
  CREATE TABLE tenant_config (
    tenant_id TEXT PRIMARY KEY,
    order_prefix TEXT DEFAULT NULL,
    is_active INTEGER DEFAULT 1
  );
  INSERT INTO tenant_config (tenant_id, order_prefix) VALUES
    ('haojihui', 'H'), ('quanthuyhang', 'H'),
    ('jiangjiejie', 'JJ'), ('jidangaodashu', 'JD'), ('unconfigured', NULL);
`;

function runSql(after = '', before = '') {
  const result = spawnSync('sqlite3', ['-batch', '-bail', ':memory:'], {
    input: `${fixture}\n${before}\nBEGIN;\n${migration}\nCOMMIT;\n${after}`,
    encoding: 'utf8'
  });
  if (result.error) throw result.error;
  return result;
}

test('repairs the known H collision and creates a unique index', () => {
  const result = runSql(`
    SELECT tenant_id, order_prefix FROM tenant_config WHERE order_prefix IS NOT NULL ORDER BY tenant_id;
    SELECT "unique" FROM pragma_index_list('tenant_config')
      WHERE name = 'idx_tenant_config_order_prefix_unique';
  `);
  assert.equal(result.status, 0, result.stderr);
  assert.equal(result.stdout.trim(), 'haojihui|HJ\njiangjiejie|JJ\njidangaodashu|JD\nquanthuyhang|H\n1');
});

test('preserves an already configured prefix and can be reapplied', () => {
  const result = runSql(`${migration}\nSELECT order_prefix FROM tenant_config WHERE tenant_id = 'haojihui';`,
    "UPDATE tenant_config SET order_prefix = 'CUSTOM' WHERE tenant_id = 'haojihui';");
  assert.equal(result.status, 0, result.stderr);
  assert.equal(result.stdout.trim(), 'CUSTOM');
});

for (const prefix of ['JJ', 'jj', ' JJ ']) {
  test(`rejects a duplicate INSERT with prefix ${JSON.stringify(prefix)}`, () => {
    const result = runSql(`INSERT INTO tenant_config (tenant_id, order_prefix, is_active) VALUES ('new', '${prefix}', 0);`);
    assert.notEqual(result.status, 0);
    assert.match(result.stderr, /UNIQUE constraint failed: index 'idx_tenant_config_order_prefix_unique'/);
  });
}

test('rejects a duplicate UPDATE', () => {
  const result = runSql("UPDATE tenant_config SET order_prefix = ' jd ' WHERE tenant_id = 'jiangjiejie';");
  assert.notEqual(result.status, 0);
  assert.match(result.stderr, /UNIQUE constraint failed: index 'idx_tenant_config_order_prefix_unique'/);
});

test('accepts distinct prefixes and retains nullable defaults', () => {
  const result = runSql(`
    INSERT INTO tenant_config (tenant_id, order_prefix) VALUES ('new', 'NEW');
    INSERT INTO tenant_config (tenant_id) VALUES ('another-unconfigured');
    SELECT COUNT(*) FROM tenant_config WHERE order_prefix IS NULL;
  `);
  assert.equal(result.status, 0, result.stderr);
  assert.equal(result.stdout.trim(), '2');
});

test('fails if unexpected duplicates remain instead of silently skipping the constraint', () => {
  const result = runSql('', "INSERT INTO tenant_config (tenant_id, order_prefix) VALUES ('unexpected', ' jj ');");
  assert.notEqual(result.status, 0);
  assert.match(result.stderr, /UNIQUE constraint failed: index 'idx_tenant_config_order_prefix_unique'/);
});
