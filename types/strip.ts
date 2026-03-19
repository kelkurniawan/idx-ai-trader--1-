/**
 * Strip Data Types
 *
 * Types for the hybrid scrolling strip (movers + headlines).
 */

export interface MoverItem {
  code: string;
  price: number;
  pct: number;
  dir: "up" | "dn";
}

export interface HeadlineItem {
  id: string;
  label: string;
  color: string;
  text: string;
  tickers: string[];
}

export interface StripData {
  movers: MoverItem[];
  headlines: HeadlineItem[];
}
