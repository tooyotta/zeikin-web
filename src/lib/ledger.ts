import media from "../data/ledger-media.json";
import data from "../data/ledger.json";

export interface Entry {
  no: number;
  slug: string;
  title: string;
  type: string;
  stage: string;
  date: string | null;
  date_note?: string;
  place: string | null;
  people: string[] | null;
  numbers: Record<string, number> | null;
  related: number[];
  status: string;
  links: string[] | null;
  filed: string;
  filing?: string;
  body: string;
}

export const entries = data.entries as Entry[];

export const TYPE_LABELS: Record<string, string> = {
  dev: "開発",
  event: "出店・展示",
  shop: "ストア",
  goods: "グッズ",
  distribution: "無料配布",
  press: "掲載",
  award: "応募・受賞",
  collab: "共作",
  kobun: "構文",
  friend: "フレンズ",
  idea: "思いつき",
};

export const STAGES = ["思いつき", "受理", "形式化", "流通", "増殖"];

export const NUMBER_LABELS: Record<string, string> = {
  sold: "販売",
  distributed: "配布",
  visitors: "接触",
  pages: "ページ",
  emoji: "emoji",
};

export const fileNo = (no: number) => `第${String(no).padStart(3, "0")}号`;
export const byNo = (no: number) => entries.find((e) => e.no === no);
export const derivedFrom = (no: number) => entries.filter((e) => e.related.includes(no));

export const pad = (no: number) => String(no).padStart(3, "0");
export const hrefOf = (no: number) => `/ledger/${pad(no)}/`;
export const typeLabel = (t: string) => TYPE_LABELS[t] ?? t;
export const stageIndex = (s: string) => STAGES.indexOf(s);
// 2025-06-15 → 2025.06.15。日付が無いものは「日付不詳」
export const dateLabel = (d: string | null) => (d ? d.replaceAll("-", ".") : "日付不詳");
export const ordered = [...entries].sort((a, b) => a.no - b.no);

export interface Media {
  src: string;
  alt: string;
  pos: string;
}
const mediaMap = media as Record<string, Media>;
export const DEFAULT_MEDIA = mediaMap.default;
// 写真が無い申告は既定のキーグラフィックを使う
export const mediaOf = (no: number): Media & { fallback: boolean } =>
  mediaMap[String(no)] ? { ...mediaMap[String(no)], fallback: false } : { ...DEFAULT_MEDIA, fallback: true };
