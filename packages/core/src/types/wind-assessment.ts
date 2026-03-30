/** Turbulence intensity result for a wind speed bin */
export interface TurbulenceBin {
  /** Centre wind speed of the bin (m/s) */
  speedBinMs: number;
  /** Mean turbulence intensity (0-1) */
  ti: number;
  /** Number of records in this bin */
  count: number;
}

/** IEC 61400-1 turbulence class */
export type IecTurbulenceClass = 'A' | 'B' | 'C' | 'exceeds_A';

/** Full turbulence intensity analysis result */
export interface TurbulenceResult {
  /** Mean turbulence intensity across all bins */
  meanTi: number;
  /** TI per wind speed bin */
  tiBins: TurbulenceBin[];
  /** IEC 61400-1 turbulence class */
  iecClass: IecTurbulenceClass;
  /** Representative TI at 15 m/s (standard reference speed) */
  representativeTi: number;
  /** Data source used */
  dataSource: 'hourly' | 'daily_estimated';
  /** Human-readable summary */
  summary: string;
}

/** Extreme wind estimation result */
export interface ExtremeWindResult {
  /** Annual maximum wind speeds extracted from the data */
  annualMaxima: Array<{ year: number; maxSpeedMs: number }>;
  /** Gumbel Type I location parameter */
  gumbelMu: number;
  /** Gumbel Type I scale parameter */
  gumbelSigma: number;
  /** 50-year return period wind speed (m/s) at reference height */
  v50YearMs: number;
  /** 1-year return period wind speed (m/s) */
  v1YearMs: number;
  /** IEC 61400-1 wind class based on V50 at hub height */
  iecWindClass: 'I' | 'II' | 'III' | 'S';
  /** Confidence in the estimate */
  confidence: 'high' | 'medium' | 'low';
  /** Height at which values are reported (m) */
  referenceHeightM: number;
  /** Human-readable summary */
  summary: string;
}
