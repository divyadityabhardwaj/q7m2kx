export interface Row {
  decisionDate: string;
  startTime: string;
  cutoffTime: string;
  publishTime: string | null;
  forecastMw: number | null;
  actualMw: number | null;
  errorMw: number | null;
  leadHours: number | null;
  issueAgeHours: number | null;
}
export interface Metrics {
  matchedHours: number;
  expectedHours: number;
  coveragePct: number;
  maeMw: number | null;
  rmseMw: number | null;
  biasMw: number | null;
  wapePct: number | null;
  p90AbsoluteErrorMw: number | null;
  forecastMwh: number;
  actualMwh: number;
  shortfallMwh: number;
  surplusMwh: number;
}
export interface Report {
  rows: Row[];
  summary: Metrics;
  daily: (Metrics & { decisionDate: string; deliveryDate: string })[];
  hourly: (Metrics & { hour: number })[];
  worstHours: Row[];
  provenance: {
    source: string;
    fetchedAt: string;
    sha256: string;
    forecastRows: number;
    actualRows: number;
  };
  selection: {
    decisionFrom: string;
    decisionTo: string;
    cutoffHourUtc: number;
  };
}
