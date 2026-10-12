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
