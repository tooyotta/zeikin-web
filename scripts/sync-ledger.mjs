// 税金台帳（../zeikin-ledger）を検証・集計して src/data/ledger.json に取り込む。
// 公開前の申告（申告準備中・取下げ）はサイトに出さない。
// 使い方: node scripts/sync-ledger.mjs [台帳のパス]
import { execFileSync } from 'node:child_process';
import { readFileSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';

const ledgerDir = resolve(process.argv[2] ?? '../zeikin-ledger');
execFileSync('node', ['scripts/build.mjs'], { cwd: ledgerDir, stdio: 'inherit' });
const ledger = JSON.parse(readFileSync(`${ledgerDir}/dist/ledger.json`, 'utf8'));

const HIDDEN = ['申告準備中', '取下げ'];
const shown = new Set(ledger.entries.filter((e) => !HIDDEN.includes(e.status)).map((e) => e.no));
const entries = ledger.entries
  .filter((e) => shown.has(e.no))
  .map((e) => ({ ...e, related: (e.related ?? []).filter((r) => shown.has(r)) }));

writeFileSync('src/data/ledger.json', JSON.stringify({ generated_at: ledger.generated_at, entries }, null, 2) + '\n');
console.log(`→ src/data/ledger.json（${entries.length} 件を公開、${ledger.entries.length - entries.length} 件は非公開）`);
