# AGENTS.md — zeikin.org（tooyotta/zeikin-web）

税金の公式サイト。Astro 5 の静的サイトで、**main に push すると GitHub Pages に自動でデプロイ**される。

税金プロジェクト全体の引き継ぎ（台帳・ストアを含む）は、private リポジトリ `zeikinorg/shop` と `zeikinorg/ledger` の `docs/HANDOFF.md` にある。作業を始める前に読むこと。

## 守ること
- **`public/CREATIVE-HACK-AWARD/`（https://zeikin.org/CREATIVE-HACK-AWARD/）を変えない・消さない。** 応募済みの URL で、結果発表まで有効に保つ必要がある。push の前に `dist/CREATIVE-HACK-AWARD/index.html` が出力されているか確かめる
- トップ（`src/pages/index.astro`）から新しいページへのリンクは、本人の指示があるまで張らない（サイレント公開が基本）
- `src/data/ledger.json` は手で編集しない。台帳（zeikinorg/ledger）から `scripts/sync-ledger.mjs` で生成する
- このリポジトリは public。トークン・個人情報・会社の情報を書かない
- コミットは本人名義だけ。AI の署名行（Co-Authored-By など）を入れない。gh は `GH_HOST=github.com` を明示する

## 作業のしかた
- ローカルの共有チェックアウトは複数のセッションが使うことがある。作業は worktree かブランチで行い、`origin/main` の先頭に積んでから push する
- node_modules をシンボリックリンクした worktree では `astro dev` が 403 になる。確認は `npx astro build && npx astro preview`
- ページの構成: `/ledger/`（台帳）、`/shop/`（ストア。API は Cloudflare Workers）、`/shop/law/`、`/shop/privacy/`、`/shop/thanks/`
