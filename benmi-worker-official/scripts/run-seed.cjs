const fs = require('fs');
const path = require('path');
const { executeD1File } = require('./cloudflare-d1.cjs');

const targetEnv = process.argv[2] || 'dev'; // dev, test, prod
const fileRelPath = process.argv[3] || 'seeds/tenants/miyansuo.sql';

const filePath = path.resolve(__dirname, '..', fileRelPath);
if (!fs.existsSync(filePath)) {
  console.error(`File not found: ${filePath}`);
  process.exit(1);
}

let dbName = 'blab-db-dev';
let mode = 'dev';
if (targetEnv === 'test' || targetEnv === 'staging') {
  dbName = 'blab-db-test';
  mode = 'test';
} else if (targetEnv === 'prod' || targetEnv === 'production' || targetEnv === 'main') {
  dbName = 'blab-db-production';
  mode = 'production';
} else if (targetEnv !== 'dev') {
  throw new Error(`Unknown seed environment: ${targetEnv}`);
}

console.log(`Executing ${fileRelPath} on ${dbName} (${targetEnv})...`);

executeD1File(dbName, filePath, true, mode);

console.log(`Successfully applied ${fileRelPath} to ${dbName}!`);
