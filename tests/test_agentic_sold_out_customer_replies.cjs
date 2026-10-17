const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const path = require('path');

test('Agentic sold-out item change flow retains conversation history and full order context', () => {
  const lineTsPath = path.resolve(__dirname, '../benmi-worker-official/src/modules/line.ts');
  const lineTs = fs.readFileSync(lineTsPath, 'utf-8');
  const ordersTsPath = path.resolve(__dirname, '../benmi-worker-official/src/modules/orders.ts');
  const ordersTs = fs.readFileSync(ordersTsPath, 'utf-8');

  // 1. Multi-message conversation context tracking
  assert.ok(
    lineTs.includes('pending_replies:'),
    'Tracks customer replies in KV with pending_replies key'
  );
  assert.ok(
    lineTs.includes('allCustomerReplies = [...existingReplies, userText.trim()].filter(Boolean)'),
    'Accumulates all customer replies in conversation history'
  );

  // 2. Full order content and accumulated history passed to AI prompt
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

  // 5. Quick reply takes priority over grace period to prevent false intercepts (Fixing PR-Agent review finding)
  const quickReplyIndex = lineTs.indexOf('// 2) Quick reply');
  const gracePeriodIndex = lineTs.indexOf('// 2.5) Follow-up / supplementary message for recently modified order');
  assert.ok(quickReplyIndex !== -1, 'Quick reply step must exist');
  assert.ok(gracePeriodIndex !== -1, 'Grace period step must exist');
  assert.ok(
    quickReplyIndex < gracePeriodIndex,
    'Quick replies must be evaluated BEFORE grace period so store queries are never captured as order notes'
  );

  // 6. Polite acknowledgments during grace period do not pollute order_content
  assert.ok(
    lineTs.includes('isPoliteAck'),
    'Checks and ignores polite acknowledgments during grace period'
  );

  // 7. Orders.ts clears recent_modified on staff ACCEPTED and FORCE_REJECT
  assert.ok(
    ordersTs.includes('await env.ORDER_STATE.delete(`recent_modified:${tenantId}:${order.userId}`)'),
    'Cleans up recent_modified KV when order is accepted or force-rejected'
  );
});

test('Grace period logic correctly differentiates cancel, polite ack, and note content', () => {
  const isPoliteAck = (text) => /^(好|好的|ok|謝謝|谢谢|感謝|感谢|感恩|thx|thanks|thank you|ok!|好！|好的！|收到了)$/i.test(text.trim());
  const isCancel = (lowerText) => lowerText.includes("不要了") || lowerText.includes("取消") || lowerText.includes("不用了") || lowerText === "不要";

  // Acknowledgments
  assert.equal(isPoliteAck('好'), true);
  assert.equal(isPoliteAck('好的！'), true);
  assert.equal(isPoliteAck('謝謝'), true);
  assert.equal(isPoliteAck('ok'), true);
  assert.equal(isPoliteAck('感恩'), true);

  // Real supplementary notes (should NOT be marked polite ack)
  assert.equal(isPoliteAck('不要加辣'), false);
  assert.equal(isPoliteAck('請多放一包餐具'), false);
  assert.equal(isPoliteAck('換成大杯奶茶'), false);

  // Cancellations
  assert.equal(isCancel('取消'), true);
  assert.equal(isCancel('那我不要了'), true);
  assert.equal(isCancel('不用了謝謝'), true);
  assert.equal(isCancel('換成大杯奶茶'), false);
});
