/* 税金構文かるた — 手本とランダムの材料
 * 札そのもの（パッケージ・画像・名前）は catalog.js（scripts/build-catalog.py が作る）。
 * id は共有URLに入るので、一度出したら変えない。
 */
(function (root) {
  "use strict";

  const C = root.KARUTA_CATALOG;

  /* 一文字札の熟語（z-tax 税金絵文字） */
  const WORDS = [
    ["a06", "a03"], // 納税
    ["a11", "a03"], // 課税
    ["a09", "a03"], // 免税
    ["a03", "a08"], // 税務
    ["a03", "a04"], // 税理
    ["a12", "a10"], // 代金
    ["a12", "a04"], // 代理
    ["a02"], // 税金
    ["a07"], // 猫
  ];

  /* ランダムで文の頭・中・締めに使うパッケージ */
  const ROLES = {
    head: ["c", "f", "h"],
    body: ["d", "e", "b", "i", "j"],
    tail: ["f", "g", "h"],
  };

  const PRESETS = [
    { name: "胴長タックスフンド", items: ["b007", "b008", "b008", "b008", "b009"] },
    { name: "代理納税", items: ["a12", "a04", "a06", "a03"] },
    { name: "納税の時間だ", items: ["j004", "d011", "j014"] },
    { name: "雨は自然の税金", items: ["c014", "d021", "f022"] },
    { name: "量産体制で完全理解", items: ["f010", "f011", "d001"] },
    { name: "在宅の構文", items: ["i003", "e010", "f013"] },
    { name: "これは徴税の機会", items: ["c004", "a07", "d024"] },
    { name: "早起きは三文の還付金", items: ["c016", "d016", "h034"] },
  ];

  root.KARUTA = {
    PACKS: C.packs,
    EMOJI: C.emoji,
    WORDS,
    ROLES,
    PRESETS,
  };
})(typeof globalThis !== "undefined" ? globalThis : this);
