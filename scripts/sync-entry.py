#!/usr/bin/env python3
"""応募PDFとページ画像を /CREATIVE-HACK-AWARD/ に同期する。

使い方: python3 scripts/sync-entry.py [ソースディレクトリ]
ソース側は build.py の出力（zeikin_entry.pdf と preview/pNN.png）を前提にする。
ページ数はソースの画像枚数から自動で決まるので、枚数が変わっても直さなくてよい。
"""
import shutil
import subprocess
import sys
from pathlib import Path

from PIL import Image

REPO = Path(__file__).resolve().parent.parent
DEST = REPO / "public" / "CREATIVE-HACK-AWARD"
SRC = Path(sys.argv[1]) if len(sys.argv) > 1 else REPO.parent / "wired-hack-zeikin"

pdf_src = SRC / "zeikin_entry.pdf"
pngs = sorted((SRC / "preview").glob("p*.png"))
if not pdf_src.is_file():
    sys.exit(f"PDF が見つからない: {pdf_src}")
if not pngs:
    sys.exit(f"ページ画像が見つからない: {SRC / 'preview'}")

# PDF 本体
DEST.mkdir(parents=True, exist_ok=True)
shutil.copy2(pdf_src, DEST / "zeikin-entry.pdf")

# ページ画像（JPEG 化して軽くする）。古い枚数分が残らないよう作り直す
pages_dir = DEST / "pages"
if pages_dir.exists():
    shutil.rmtree(pages_dir)
pages_dir.mkdir()

sizes = []
for i, f in enumerate(pngs, 1):
    im = Image.open(f).convert("RGB")
    w, h = im.size
    nw = 1400
    im = im.resize((nw, round(h * nw / w)), Image.LANCZOS)
    im.save(pages_dir / f"p{i:02d}.jpg", "JPEG", quality=82, optimize=True, progressive=True)
    sizes.append(im.size)

imgs = "\n".join(
    f'''        <img
          src="/CREATIVE-HACK-AWARD/pages/p{i:02d}.jpg"
          width="{w}"
          height="{h}"
          alt=""
          {'fetchpriority="high"' if i == 1 else 'loading="lazy" decoding="async"'}
        />'''
    for i, (w, h) in enumerate(sizes, 1)
)

html = f'''<!doctype html>
<html lang="ja">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <meta name="robots" content="noindex, nofollow" />

    <title>CREATIVE HACK AWARD ENTRY DOCUMENT</title>
    <meta name="theme-color" content="#000000" />

    <link rel="preconnect" href="https://fonts.googleapis.com" />
    <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin />
    <link
      href="https://fonts.googleapis.com/css2?family=DotGothic16&family=Fragment+Mono&display=swap"
      rel="stylesheet"
    />

    <style>
      :root {{
        --bg: #000000;
        --fg: #ffffff;
        --orange: #ef472f;
        --gray: #555555;
        --font-pixel: "DotGothic16", sans-serif;
        --font-mono: "Fragment Mono", monospace;
      }}

      * {{
        box-sizing: border-box;
      }}

      html,
      body {{
        margin: 0;
        padding: 0;
        background: var(--bg);
        color: var(--fg);
        font-family: var(--font-pixel);
      }}

      .page {{
        max-width: 1180px;
        margin: 0 auto;
        padding: 24px 24px 64px;
      }}

      h1 {{
        margin: 0 0 20px;
        font-size: clamp(22px, 4.2vw, 40px);
        font-weight: 400;
        line-height: 1.25;
        letter-spacing: 0.02em;
      }}

      .actions {{
        display: flex;
        flex-wrap: wrap;
        gap: 12px;
        position: sticky;
        top: 0;
        z-index: 2;
        padding: 12px 0;
        background: linear-gradient(var(--bg) 70%, rgba(0, 0, 0, 0));
      }}

      .actions a {{
        font-family: var(--font-mono);
        font-size: 15px;
        text-decoration: none;
        padding: 10px 16px;
        border: 1px solid var(--orange);
        color: var(--orange);
      }}

      .actions a:hover {{
        background: var(--orange);
        color: var(--bg);
      }}

      .pages {{
        display: flex;
        flex-direction: column;
        gap: 28px;
        margin-top: 12px;
      }}

      .pages img {{
        display: block;
        width: 100%;
        height: auto;
        background: #111;
        border: 1px solid var(--gray);
      }}

      @media (max-width: 600px) {{
        .page {{
          padding: 16px 16px 48px;
        }}
        .pages {{
          gap: 18px;
        }}
      }}
    </style>
  </head>
  <body>
    <div class="page">
      <h1>CREATIVE HACK AWARD ENTRY DOCUMENT</h1>

      <nav class="actions">
        <a href="/CREATIVE-HACK-AWARD/zeikin-entry.pdf" target="_blank" rel="noopener">PDF を開く</a>
        <a href="/CREATIVE-HACK-AWARD/zeikin-entry.pdf" download="zeikin-entry.pdf">PDF をダウンロード</a>
      </nav>

      <main class="pages">
{imgs}
      </main>
    </div>
  </body>
</html>
'''
(DEST / "index.html").write_text(html, encoding="utf-8")

jpg_total = sum(p.stat().st_size for p in pages_dir.glob("*.jpg"))
print(f"pages   : {len(sizes)}")
print(f"pdf     : {(DEST / 'zeikin-entry.pdf').stat().st_size / 1e6:.1f} MB")
print(f"images  : {jpg_total / 1e6:.1f} MB")
print(f"src mtime: {subprocess.run(['stat','-f','%Sm',str(pdf_src)],capture_output=True,text=True).stdout.strip()}")
