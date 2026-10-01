#!/usr/bin/env node

/**
 * Menu Data Copy CLI
 * Điều phối toàn bộ quy trình: inventory -> snapshot -> mapping -> preview -> apply -> verify
 */

import { runInventory } from './inventory.mjs';
import { createSnapshot } from './snapshot.mjs';
import { runMapping } from './mapping.mjs';
import { runPreview } from './preview.mjs';
import { applyCopy } from './apply.mjs';
import { runVerify } from './verify.mjs';

const cmd = process.argv[2] || 'help';

async function main() {
  switch (cmd) {
    case 'inventory': {
      const dbName = process.argv[3] || 'blab-db-production';
      await runInventory(dbName);
      break;
    }
    case 'snapshot': {
      const dbName = process.argv[3] || 'blab-db-production';
      await createSnapshot(dbName);
      break;
    }
    case 'mapping': {
      runMapping();
      break;
    }
    case 'preview': {
      const targetDb = process.argv[3];
      runPreview(targetDb);
      break;
    }
    case 'apply': {
      const targetDb = process.argv[3];
      applyCopy(targetDb);
      break;
    }
    case 'verify': {
      const targetDb = process.argv[3];
      runVerify(targetDb);
      break;
    }
    case 'all': {
      console.log('=== CHẠY TOÀN BỘ QUY TRÌNH (T01 -> T07) ===\n');
      const dbName = process.argv[3] || 'blab-db-production';
      await runInventory(dbName);
      await createSnapshot(dbName);
      runMapping();
      runPreview();
      applyCopy();
      runVerify();
      console.log('\n=== HOÀN TẤT THÀNH CÔNG 100% ===');
      break;
    }
    default: {
      console.log(`
Menu Data Copy CLI
Cách dùng:
  node scripts/menu-data-copy/cli.mjs <command> [database/path]

Các lệnh khả dụng:
  inventory [db]   (T01) Kiểm kê schema và dữ liệu nguồn (mặc định: blab-db-production)
  snapshot  [db]   (T02) Tạo snapshot nhất quán và khôi phục isolated SQLite DB
  mapping          (T03) Sinh id-map.json, conflicts.json và field-mapping.md
  preview   [path] (T05) Chạy dry-run preview phân loại insert/equal/conflict
  apply     [path] (T06) Thực thi copy dữ liệu vào target database
  verify    [path] (T07) Đối chiếu dữ liệu nguồn và đích sau copy
  all       [db]   Chạy toàn bộ chu trình từ T01 đến T07
      `);
      break;
    }
  }
}

main().catch(err => {
  console.error('\n[CLI Error]:', err.message);
  process.exit(1);
});
