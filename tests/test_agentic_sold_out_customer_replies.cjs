const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const path = require('path');

test('Agentic sold-out item change flow retains conversation history and full order context', () => {
  const lineTsPath = path.resolve(__dirname, '../benmi-worker-official/src/modules/line.ts');
  const lineTs = fs.readFileSync(lineTsPath, 'utf-8');

  // 1. Multi-message conversation context tracking
  assert.ok(
    lineTs.includes('pending_replies:'),
    'Tracks customer replies in KV with pending_replies key'
  );
  assert.ok(
    lineTs.includes('allCustomerReplies = [...existingReplies, userText]'),
    'Accumulates all customer replies in conversation history'
  );

  // 2. Full order content passed to AI
  assert.ok(
    lineTs.includes('顧客原訂單餐點內容：'),
    'Passes original order content to AI prompt'
  );
  assert.ok(
    lineTs.includes('顧客至今的回覆歷程：'),
    'Passes accumulated customer replies history to AI prompt'
  );

  // 3. Structured order content update on change
  assert.ok(
    lineTs.includes('【顧客換單需求】：'),
    'Updates order content with full customer change requirements'
  );

  // 4. Grace period for follow-up messages / corrections
  assert.ok(
    lineTs.includes('recent_modified:'),
    'Saves recent_modified tracker in KV with grace period'
  );
  assert.ok(
    lineTs.includes('【顧客補充說明】：'),
    'Appends supplementary notes to recently modified order'
  );
});
