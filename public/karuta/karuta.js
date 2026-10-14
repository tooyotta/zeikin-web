/* 税金構文かるた — 画面と操作
 *
 * ドラッグは HTML5 の DnD ではなく Pointer Events で組む（スマホでも同じ操作にするため）。
 * マウスは少し動かした時点で、タッチは長押し（または横方向に動かした時点）で札を持ち上げる。
 * 縦に動かしたタッチはページのスクロールとして扱う。
 */
(function () {
  "use strict";

  const K = globalThis.KARUTA;
  const BY_ID = new Map(K.EMOJI.map((e) => [e.id, e]));
  const STORE_KEY = "zeikin-karuta/v1";
  const MAX_ITEMS = 40;

  const $ = (s) => document.querySelector(s);
  const el = {
    board: $("#board"),
    reading: $("#reading"),
    deck: $("#deck"),
    presets: $("#presets"),
    random: $("#random"),
    undo: $("#undo"),
    clear: $("#clear"),
    png: $("#png"),
    share: $("#share"),
    toast: $("#toast"),
    tabs: $("#tabs"),
    search: $("#search"),
    credit: $("#credit"),
  };

  // item = { uid, id }。uid は札1枚ごとの傾きと選択の目印
  let uidSeq = 1;
  const mk = (id) => ({ uid: uidSeq++, id });

  const state = { items: [], sel: null };

  // --- 取り消し -------------------------------------------------------------

  const history = [];
  function snapshot() {
    history.push(state.items.map((it) => it.id));
    if (history.length > 80) history.shift();
  }
  function undo() {
    if (!history.length) return;
    state.items = history.pop().map(mk);
    state.sel = null;
    render();
  }

  // --- 札 -------------------------------------------------------------------

  function fudaNode(e, tag) {
    const n = document.createElement(tag || "div");
    n.className = "fuda";
    n.dataset.id = e.id;
    const img = document.createElement("img");
    img.className = "fuda__img";
    img.crossOrigin = "anonymous";
    img.src = e.src;
    img.alt = "";
    img.draggable = false;
    img.loading = "lazy";
    img.decoding = "async";
    n.appendChild(img);
    return n;
  }

  // --- 描画 -----------------------------------------------------------------

  function render(placedUid) {
    const b = el.board;
    b.textContent = "";

    if (!state.items.length) {
      const p = document.createElement("p");
      p.className = "board__empty";
      p.textContent = "ここに絵文字を並べる";
      b.appendChild(p);
    }

    state.items.forEach((it, i) => {
      const e = BY_ID.get(it.id);
      const n = fudaNode(e);
      n.dataset.uid = String(it.uid);
      n.dataset.src = "board";
      n.tabIndex = 0;
      n.setAttribute("role", "listitem");
      n.setAttribute("aria-label", i + 1 + "枚目 " + e.label);
      if (it.uid === placedUid) n.classList.add("is-placed");
      if (it.uid === state.sel) {
        n.classList.add("is-selected");
        n.appendChild(opsNode(i));
      }
      b.appendChild(n);
    });

    const text = readingOf(state.items.map((it) => BY_ID.get(it.id).label));
    el.reading.innerHTML = "";
    if (text) {
      const s = document.createElement("b");
      s.textContent = text;
      const c = document.createElement("small");
      c.textContent = state.items.length + "枚";
      el.reading.append("よみ", s, c);
    }
    b.setAttribute("aria-label", text ? "台紙: " + text : "台紙は空です");

    const empty = !state.items.length;
    el.clear.disabled = empty;
    el.png.disabled = empty;
    el.share.disabled = empty;
    el.undo.disabled = !history.length;
    persist();
  }

  const plainLabel = (e) => e.label.replace(/（.*?）/g, "");

  /**
   * 一文字の絵文字どうしは続けて（代理納税）、長い絵文字のあいだには空白を入れて読む。
   * 「胴長ダックス（頭）（胴）（しっぽ）」のように括弧だけ違う続きものは一度だけ読む。
   */
  function readingOf(rawLabels) {
    const parts = [];
    let prevRaw = null;
    for (const raw of rawLabels) {
      const l = raw.replace(/（.*?）/g, "");
      const series = prevRaw != null && l !== raw && prevRaw.replace(/（.*?）/g, "") === l;
      if (!series) parts.push(l);
      prevRaw = raw;
    }
    let out = "";
    parts.forEach((l, i) => {
      const prev = parts[i - 1];
      if (i && !(prev.length <= 2 && l.length <= 2)) out += "　";
      out += l;
    });
    return out;
  }

  function opsNode(i) {
    const box = document.createElement("div");
    box.className = "ops";
    const mkBtn = (label, aria, fn, disabled) => {
      const btn = document.createElement("button");
      btn.type = "button";
      btn.textContent = label;
      btn.setAttribute("aria-label", aria);
      btn.disabled = !!disabled;
      btn.addEventListener("click", (ev) => {
        ev.stopPropagation();
        fn();
      });
      btn.addEventListener("pointerdown", (ev) => ev.stopPropagation());
      box.appendChild(btn);
    };
    mkBtn("‹", "左へ", () => moveBy(i, -1), i === 0);
    mkBtn("×", "片付ける", () => removeAt(i));
    mkBtn("›", "右へ", () => moveBy(i, 1), i === state.items.length - 1);
    return box;
  }

  /* 札の目録。パッケージごとに節を立て、タブと検索で絞る */
  const deckState = { pack: "all", q: "" };

  function renderTabs() {
    const mkTab = (key, label, count) => {
      const b = document.createElement("button");
      b.type = "button";
      b.className = "tab";
      b.dataset.pack = key;
      b.setAttribute("aria-pressed", String(deckState.pack === key));
      b.textContent = label;
      const sm = document.createElement("small");
      sm.textContent = count;
      b.appendChild(sm);
      el.tabs.appendChild(b);
    };
    mkTab("all", "すべて", K.EMOJI.length);
    for (const p of K.PACKS) mkTab(p.key, p.short, K.EMOJI.filter((e) => e.pack === p.key).length);
    el.tabs.addEventListener("click", (ev) => {
      const t = ev.target.closest(".tab");
      if (!t) return;
      deckState.pack = t.dataset.pack;
      for (const b of el.tabs.children) b.setAttribute("aria-pressed", String(b === t));
      renderDeck();
    });
  }

  function matches(e, q) {
    if (!q) return true;
    const hay = (e.label + " " + (e.yomi || "") + " " + (e.tags || []).join(" ")).toLowerCase();
    return q
      .toLowerCase()
      .split(/\s+/)
      .every((w) => hay.includes(w));
  }

  function cellNode(e) {
    const fig = document.createElement("figure");
    fig.className = "cell";
    const n = fudaNode(e, "button");
    n.type = "button";
    n.dataset.src = "deck";
    n.setAttribute("aria-label", plainLabel(e) + " を台紙に置く");
    const cap = document.createElement("figcaption");
    cap.textContent = e.label;
    fig.append(n, cap);
    return fig;
  }

  function renderDeck() {
    const q = deckState.q.trim();
    el.deck.textContent = "";
    let shown = 0;
    for (const p of K.PACKS) {
      if (deckState.pack !== "all" && deckState.pack !== p.key) continue;
      const list = K.EMOJI.filter((e) => e.pack === p.key && matches(e, q));
      if (!list.length) continue;
      shown += list.length;

      const sec = document.createElement("section");
      sec.className = "pack";
      const h = document.createElement("h3");
      h.className = "pack__h";
      h.textContent = p.title;
      const st = document.createElement("span");
      st.className = "pack__status";
      if (p.store) {
        const a = document.createElement("a");
        a.href = p.store;
        a.target = "_blank";
        a.rel = "noopener";
        a.textContent = "LINE STORE で販売中";
        st.appendChild(a);
      } else {
        st.textContent = "LINE絵文字 審査中";
      }
      h.appendChild(st);
      sec.appendChild(h);
      if (p.desc && !q) {
        const d = document.createElement("p");
        d.className = "pack__desc";
        d.textContent = p.desc;
        sec.appendChild(d);
      } else {
        h.style.marginBottom = "18px";
      }
      const grid = document.createElement("div");
      grid.className = "grid";
      for (const e of list) grid.appendChild(cellNode(e));
      sec.appendChild(grid);
      el.deck.appendChild(sec);
    }
    if (!shown) {
      const p = document.createElement("p");
      p.className = "deck__empty";
      p.textContent = "「" + q + "」に当てはまる絵文字はありません";
      el.deck.appendChild(p);
    }
  }

  let searchTimer = null;
  el.search.addEventListener("input", () => {
    clearTimeout(searchTimer);
    searchTimer = setTimeout(() => {
      deckState.q = el.search.value;
      renderDeck();
    }, 120);
  });

  function renderPresets() {
    for (const p of K.PRESETS) {
      const b = document.createElement("button");
      b.type = "button";
      b.className = "preset";
      b.setAttribute("aria-label", "手本「" + p.name + "」を台紙に並べる");
      const row = document.createElement("span");
      row.className = "preset__row";
      for (const id of p.items) row.appendChild(fudaNode(BY_ID.get(id), "span"));
      const name = document.createElement("span");
      name.className = "preset__name";
      name.textContent = p.name;
      b.append(row, name);
      b.addEventListener("click", () => {
        setItems(p.items);
        toast("手本「" + p.name + "」を並べました");
        el.board.scrollIntoView({ behavior: "smooth", block: "center" });
      });
      el.presets.appendChild(b);
    }
  }

  // --- 操作 -----------------------------------------------------------------

  function insertAt(id, index) {
    if (!BY_ID.has(id)) return;
    if (state.items.length >= MAX_ITEMS) {
      toast("台紙がいっぱいです（" + MAX_ITEMS + "枚まで）");
      return;
    }
    snapshot();
    const it = mk(id);
    const at = index == null ? state.items.length : Math.max(0, Math.min(index, state.items.length));
    state.items.splice(at, 0, it);
    state.sel = null;
    render(it.uid);
  }

  function removeAt(i) {
    if (i < 0 || i >= state.items.length) return;
    snapshot();
    state.items.splice(i, 1);
    state.sel = null;
    render();
  }

  function moveTo(from, to) {
    if (from === to) return;
    snapshot();
    const [it] = state.items.splice(from, 1);
    state.items.splice(to, 0, it);
    render(it.uid);
  }

  function moveBy(i, d) {
    const j = i + d;
    if (j < 0 || j >= state.items.length) return;
    const uid = state.items[i].uid;
    moveTo(i, j);
    state.sel = uid;
    render();
    focusUid(uid);
  }

  function setItems(ids) {
    snapshot();
    state.items = ids.filter((id) => BY_ID.has(id)).slice(0, MAX_ITEMS).map(mk);
    state.sel = null;
    render();
    // 一枚ずつ置いていくように見せる
    el.board.querySelectorAll(".fuda").forEach((n, i) => {
      n.style.animationDelay = i * 45 + "ms";
      n.classList.add("is-placed");
    });
  }

  function clearAll() {
    if (!state.items.length) return;
    snapshot();
    state.items = [];
    state.sel = null;
    render();
    toast("片付けました（ひとつ戻すで元に戻せます）");
  }

  /* 頭（セリフ）・中（税金語か一文字の熟語）・締め（決まり文句）の順に引く */
  function randomize() {
    const pick = (a) => a[Math.floor(Math.random() * a.length)];
    const fromPacks = (keys) => pick(K.EMOJI.filter((e) => keys.includes(e.pack))).id;
    const ids = [fromPacks(K.ROLES.head)];
    if (Math.random() < 0.6) ids.push(...pick(K.WORDS));
    ids.push(fromPacks(K.ROLES.body));
    if (Math.random() < 0.5) ids.push(fromPacks(K.ROLES.body));
    ids.push(fromPacks(K.ROLES.tail));
    setItems(ids);
  }

  function focusUid(uid) {
    const n = el.board.querySelector('[data-uid="' + uid + '"]');
    if (n) n.focus({ preventScroll: true });
  }

  // --- ドラッグ -------------------------------------------------------------

  const DRAG_PX = 5;
  const LONG_PRESS_MS = 260;

  let press = null; // 押した直後（まだ持ち上げていない）
  let drag = null; // 持ち上げ中
  let suppressClick = false;

  function onPointerDown(ev) {
    const card = ev.target.closest(".fuda[data-src]");
    if (!card || drag) return;
    if (ev.pointerType === "mouse" && ev.button !== 0) return;

    press = {
      card,
      id: card.dataset.id,
      src: card.dataset.src,
      uid: card.dataset.uid ? Number(card.dataset.uid) : null,
      x0: ev.clientX,
      y0: ev.clientY,
      pid: ev.pointerId,
      touch: ev.pointerType !== "mouse",
      timer: null,
    };
    if (press.touch) {
      press.timer = setTimeout(() => {
        if (press) startDrag(press.x0, press.y0);
      }, LONG_PRESS_MS);
    }
  }

  function onPointerMove(ev) {
    if (drag) {
      if (ev.pointerId !== drag.pid) return;
      ev.preventDefault();
      moveDrag(ev.clientX, ev.clientY);
      return;
    }
    if (!press || ev.pointerId !== press.pid) return;
    const dx = ev.clientX - press.x0;
    const dy = ev.clientY - press.y0;
    const dist = Math.hypot(dx, dy);
    if (press.touch) {
      // 縦に動いたらスクロールに譲る。横に動いたら札を持つ
      if (dist > 8) {
        if (Math.abs(dx) > Math.abs(dy) * 1.2) startDrag(ev.clientX, ev.clientY);
        else cancelPress();
      }
    } else if (dist > DRAG_PX) {
      startDrag(ev.clientX, ev.clientY);
    }
  }

  function cancelPress() {
    if (press && press.timer) clearTimeout(press.timer);
    press = null;
  }

  function startDrag(x, y) {
    const p = press;
    cancelPress();
    if (!p) return;
    const rect = p.card.getBoundingClientRect();
    const ghost = fudaNode(BY_ID.get(p.id));
    ghost.classList.add("ghost");
    const w = p.src === "board" ? p.card.offsetWidth : boardCardWidth();
    ghost.style.setProperty("--w", w + "px");
    document.body.appendChild(ghost);

    // 持った位置を札の中で保つ（札箱→台紙は大きさが変わるので比率で）
    const rx = (p.x0 - rect.left) / rect.width;
    const ry = (p.y0 - rect.top) / rect.height;

    drag = {
      ...p,
      ghost,
      offX: rx * w,
      offY: ry * w,
      from: p.src === "board" ? state.items.findIndex((it) => it.uid === p.uid) : -1,
      index: null,
      over: false,
      lastX: x,
      vx: 0,
      slot: null,
    };

    state.sel = null;
    if (p.src === "board") {
      render();
      const orig = el.board.querySelector('[data-uid="' + p.uid + '"]');
      if (orig) orig.classList.add("is-hidden");
    }
    document.body.classList.add("is-dragging");
    const ua = navigator.userActivation;
    if (navigator.vibrate && p.touch && (!ua || ua.hasBeenActive)) navigator.vibrate(8);
    moveDrag(x, y);
    drag.raf = requestAnimationFrame(autoScroll);
  }

  function boardCardWidth() {
    const v = getComputedStyle(document.documentElement).getPropertyValue("--board-w");
    return parseFloat(v) || 74;
  }

  /* 画面の上下の端まで持っていくと、ページが流れる（スマホで台紙と札箱が離れているため） */
  function autoScroll() {
    const d = drag;
    if (!d) return;
    const edge = 70;
    const h = window.innerHeight;
    let v = 0;
    if (d.y < edge) v = -Math.ceil(((edge - d.y) / edge) * 14);
    else if (d.y > h - edge) v = Math.ceil(((d.y - (h - edge)) / edge) * 14);
    if (v) {
      window.scrollBy(0, v);
      moveDrag(d.lastX, d.y);
    }
    d.raf = requestAnimationFrame(autoScroll);
  }

  function moveDrag(x, y) {
    const d = drag;
    d.y = y;
    d.vx = d.vx * 0.7 + (x - d.lastX) * 0.3;
    d.lastX = x;
    const rot = Math.max(-14, Math.min(14, d.vx * 1.2));
    d.ghost.style.transform =
      "translate(" + (x - d.offX) + "px," + (y - d.offY) + "px) rotate(" + rot.toFixed(1) + "deg) scale(1.06)";

    const br = el.board.getBoundingClientRect();
    const pad = 24;
    const over = x > br.left - pad && x < br.right + pad && y > br.top - pad && y < br.bottom + pad;
    d.over = over;
    el.board.classList.toggle("is-over", over);
    d.ghost.classList.toggle("is-trash", !over && d.src === "board");

    if (over) {
      const idx = slotIndex(x, y);
      if (idx !== d.index) {
        d.index = idx;
        placeSlot(idx);
      }
    } else if (d.slot) {
      d.slot.remove();
      d.slot = null;
      d.index = null;
    }
  }

  /** 台紙のどこに差し込むか。見えている札（持ち上げた札を除く）の並びでの位置を返す */
  function slotIndex(x, y) {
    const d = drag;
    if (d.slot) {
      const r = d.slot.getBoundingClientRect();
      if (x >= r.left && x <= r.right && y >= r.top && y <= r.bottom) return d.index;
    }
    const cards = visibleCards();
    if (!cards.length) return 0;
    const rects = cards.map((c) => c.getBoundingClientRect());
    const gapY = 7;
    let lastInRow = -1;
    for (let i = 0; i < rects.length; i++) {
      const r = rects[i];
      if (y >= r.top - gapY && y <= r.bottom + gapY) {
        if (x < r.left + r.width / 2) return i;
        lastInRow = i;
      }
    }
    if (lastInRow >= 0) return lastInRow + 1;
    if (y < rects[0].top) return 0;
    return cards.length;
  }

  function visibleCards() {
    return Array.from(el.board.querySelectorAll(".fuda[data-uid]:not(.is-hidden)"));
  }

  function placeSlot(idx) {
    const d = drag;
    if (!d.slot) {
      d.slot = document.createElement("div");
      d.slot.className = "slot";
      d.slot.setAttribute("aria-hidden", "true");
    }
    const empty = el.board.querySelector(".board__empty");
    if (empty) empty.style.visibility = "hidden";
    const cards = visibleCards();
    if (idx >= cards.length) el.board.appendChild(d.slot);
    else el.board.insertBefore(d.slot, cards[idx]);
  }

  function endDrag(commit) {
    const d = drag;
    drag = null;
    cancelAnimationFrame(d.raf);
    d.ghost.remove();
    if (d.slot) d.slot.remove();
    el.board.classList.remove("is-over");
    document.body.classList.remove("is-dragging");
    suppressClick = true;
    setTimeout(() => (suppressClick = false), 0);

    if (!commit) {
      render();
      return;
    }
    if (d.src === "deck") {
      if (d.over) insertAt(d.id, d.index);
      else render();
    } else {
      if (d.over && d.index != null) moveTo(d.from, d.index);
      else if (!d.over) {
        removeAt(d.from);
        toast("片付けました");
      } else render();
    }
  }

  function onPointerUp(ev) {
    if (drag && ev.pointerId === drag.pid) {
      endDrag(ev.type === "pointerup");
      return;
    }
    if (press && ev.pointerId === press.pid) cancelPress();
  }

  // タッチで札を持ち上げている間は、ページがスクロールしないようにする
  document.addEventListener(
    "touchmove",
    (ev) => {
      if (drag) ev.preventDefault();
    },
    { passive: false }
  );
  document.addEventListener("contextmenu", (ev) => {
    if (drag || press) ev.preventDefault();
  });

  document.addEventListener("pointerdown", onPointerDown);
  document.addEventListener("pointermove", onPointerMove, { passive: false });
  document.addEventListener("pointerup", onPointerUp);
  document.addEventListener("pointercancel", onPointerUp);

  // --- 押す（ドラッグしなかったとき） ---------------------------------------

  el.deck.addEventListener("click", (ev) => {
    if (suppressClick) return;
    const card = ev.target.closest(".fuda");
    if (!card) return;
    insertAt(card.dataset.id, null);
  });

  el.board.addEventListener("click", (ev) => {
    // 描き直しで押した札が DOM から外れるので、下の「外を押したら選択解除」に届かせない
    ev.stopPropagation();
    if (suppressClick) return;
    const card = ev.target.closest(".fuda[data-uid]");
    const uid = card ? Number(card.dataset.uid) : null;
    state.sel = uid && uid !== state.sel ? uid : null;
    render();
    if (uid) focusUid(uid);
  });

  document.addEventListener("click", (ev) => {
    if (state.sel && !ev.target.closest(".board")) {
      state.sel = null;
      render();
    }
  });

  el.board.addEventListener("keydown", (ev) => {
    const card = ev.target.closest(".fuda[data-uid]");
    if (!card) return;
    const uid = Number(card.dataset.uid);
    const i = state.items.findIndex((it) => it.uid === uid);
    if (ev.key === "Delete" || ev.key === "Backspace") {
      ev.preventDefault();
      removeAt(i);
      const next = state.items[Math.min(i, state.items.length - 1)];
      if (next) focusUid(next.uid);
    } else if (ev.key === "ArrowLeft" || ev.key === "ArrowRight") {
      ev.preventDefault();
      const d = ev.key === "ArrowLeft" ? -1 : 1;
      if (ev.shiftKey) moveBy(i, d);
      else {
        const t = state.items[i + d];
        if (t) focusUid(t.uid);
      }
    } else if (ev.key === "Escape") {
      state.sel = null;
      render();
      focusUid(uid);
    }
  });

  document.addEventListener("keydown", (ev) => {
    if ((ev.metaKey || ev.ctrlKey) && !ev.shiftKey && ev.key.toLowerCase() === "z") {
      if (ev.target.closest("input, textarea")) return;
      ev.preventDefault();
      undo();
    }
  });

  el.random.addEventListener("click", randomize);
  el.undo.addEventListener("click", undo);
  el.clear.addEventListener("click", clearAll);
  el.share.addEventListener("click", copyUrl);
  el.png.addEventListener("click", savePng);

  // --- 保存・共有 -----------------------------------------------------------

  const encode = () => state.items.map((it) => it.id).join(".");
  const decode = (s) =>
    String(s || "")
      .split(".")
      .filter((id) => BY_ID.has(id));

  function persist() {
    const code = encode();
    try {
      localStorage.setItem(STORE_KEY, code);
    } catch (_) {}
    const url = location.pathname + location.search + (code ? "#" + code : "");
    window.history.replaceState(null, "", url);
  }

  function restore() {
    const fromHash = decode(location.hash.slice(1));
    if (fromHash.length) return fromHash;
    try {
      return decode(localStorage.getItem(STORE_KEY));
    } catch (_) {
      return [];
    }
  }

  async function copyUrl() {
    const url = location.origin + location.pathname + "#" + encode();
    try {
      await navigator.clipboard.writeText(url);
      toast("URLをコピーしました");
    } catch (_) {
      window.prompt("このURLをコピーしてください", url);
    }
  }

  function loadImg(src) {
    return new Promise((res, rej) => {
      const i = new Image();
      i.crossOrigin = "anonymous";
      i.onload = () => res(i);
      i.onerror = rej;
      i.src = src;
    });
  }

  /** 台紙を一枚の画像に描き起こす。DOM のスクショではなく canvas で組み直す */
  async function savePng() {
    if (!state.items.length) return;
    el.png.disabled = true;
    try {
      await Promise.all([
        document.fonts.load('20px "DotGothic16"'),
        document.fonts.load('16px "Fragment Mono"'),
      ]);
      const imgs = await Promise.all(state.items.map((it) => loadImg(BY_ID.get(it.id).src)));

      const S = 2;
      const W = 128, H = W, GX = 6, GY = 14;
      const perRow = Math.min(state.items.length, 8);
      const rows = Math.ceil(state.items.length / perRow);
      const PAD = 64, FOOT = 70;
      const cw = Math.max(PAD * 2 + perRow * W + (perRow - 1) * GX, 560);
      const ch = PAD * 2 + rows * H + (rows - 1) * GY + FOOT;

      const c = document.createElement("canvas");
      c.width = cw * S;
      c.height = ch * S;
      const g = c.getContext("2d");
      g.scale(S, S);

      // 黒地に、トップと同じ 1px の線
      g.fillStyle = "#000000";
      g.fillRect(0, 0, cw, ch);
      g.strokeStyle = "#555555";
      g.lineWidth = 1;
      g.strokeRect(16.5, 16.5, cw - 33, ch - 33);

      const rowW = perRow * W + (perRow - 1) * GX;
      const left = (cw - rowW) / 2;
      state.items.forEach((it, i) => {
        const r = Math.floor(i / perRow), col = i % perRow;
        const x = left + col * (W + GX), y = PAD + r * (H + GY);
        drawFuda(g, imgs[i], x, y, W);
      });

      // 署名
      const fy = ch - PAD + 18;
      g.strokeStyle = "#ffffff";
      g.beginPath();
      g.moveTo(left, fy - 30.5);
      g.lineTo(cw - left, fy - 30.5);
      g.stroke();
      g.fillStyle = "#ffffff";
      g.textBaseline = "alphabetic";
      g.font = '18px "DotGothic16", sans-serif';
      g.fillText("税金構文かるた", left, fy);
      g.fillStyle = "#ef472f";
      g.font = '15px "Fragment Mono", monospace';
      const sig = "zeikin.org";
      g.fillText(sig, cw - left - g.measureText(sig).width, fy);

      const blob = await new Promise((res) => c.toBlob(res, "image/png"));
      const a = document.createElement("a");
      a.href = URL.createObjectURL(blob);
      a.download = "zeikin-karuta-" + Date.now() + ".png";
      document.body.appendChild(a);
      a.click();
      a.remove();
      setTimeout(() => URL.revokeObjectURL(a.href), 2000);
      toast("画像を保存しました");
    } catch (err) {
      console.error(err);
      toast("画像にできませんでした。通信状態を確かめてください");
    } finally {
      el.png.disabled = !state.items.length;
    }
  }

  function drawFuda(g, img, x, y, w) {
    g.fillStyle = "#ffffff";
    g.fillRect(x, y, w, w);
    g.drawImage(img, x, y, w, w);
  }

  // --- 知らせ ---------------------------------------------------------------

  let toastTimer = null;
  function toast(msg) {
    el.toast.textContent = msg;
    el.toast.classList.add("is-on");
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => el.toast.classList.remove("is-on"), 2200);
  }

  // --- はじめ ---------------------------------------------------------------

  const live = K.PACKS.filter((p) => p.store);
  el.credit.append("絵文字は税金絵文字（LINE絵文字）。販売中：");
  live.forEach((p, i) => {
    const a = document.createElement("a");
    a.href = p.store;
    a.target = "_blank";
    a.rel = "noopener";
    a.textContent = "「" + p.title + "」";
    if (i) el.credit.append("、");
    el.credit.appendChild(a);
  });
  el.credit.append("。ほかのパッケージは審査中です。");
  renderTabs();
  renderDeck();
  renderPresets();
  state.items = restore().slice(0, MAX_ITEMS).map(mk);
  render();
})();
