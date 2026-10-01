const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

const targetEnv = process.argv[2] || 'dev'; // dev, test, prod
const fileRelPath = process.argv[3] || 'seeds/tenants/miyansuo.sql';

const filePath = path.resolve(__dirname, '..', fileRelPath);
if (!fs.existsSync(filePath)) {
  console.error(`File not found: ${filePath}`);
  process.exit(1);
}

let dbName = 'blab-db-dev';
let envFlag = '--env dev';
if (targetEnv === 'test' || targetEnv === 'staging') {
  dbName = 'blab-db-test';
  envFlag = '--env test';
} else if (targetEnv === 'prod' || targetEnv === 'production' || targetEnv === 'main') {
  dbName = 'blab-db-production';
  envFlag = '';
}

console.log(`Executing ${fileRelPath} on ${dbName} (${targetEnv})...`);

const sqlContent = fs.readFileSync(filePath, 'utf-8');

// Strip full-line comments and split by semicolon
const lines = sqlContent.split('\n');
const cleanLines = lines.map(line => {
  const trimmed = line.trim();
  if (trimmed.startsWith('--')) return '';
  return line;
});

const statements = cleanLines.join('\n')
  .split(';')
  .map(s => s.trim())
  .filter(s => s.length > 0);

console.log(`Found ${statements.length} SQL statements to execute.`);

for (let i = 0; i < statements.length; i++) {
  const stmt = statements[i];
  console.log(`[${i + 1}/${statements.length}] Executing statement...`);
  
  // Use a temporary file or pass via command
  const singleLine = stmt.replace(/\n/g, ' ');
  const cmd = `npx wrangler d1 execute ${dbName} --remote ${envFlag} --command=${JSON.stringify(singleLine)}`;
  try {
    execSync(cmd, { cwd: path.resolve(__dirname, '..'), stdio: 'inherit' });
  } catch (err) {
    console.error(`Error executing statement ${i + 1}:`, err.message);
    process.exit(1);
  }
}

console.log(`Successfully applied ${fileRelPath} to ${dbName}!`);
