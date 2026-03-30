/** A single elevation grid point */
export interface ElevationGridPoint {
  lat: number;
  lng: number;
  elevationM: number;
}

/** A grid of elevation values across a site */
export interface ElevationGrid {
  points: ElevationGridPoint[][];
  spacingM: number;
  rows: number;
  cols: number;
  minElevationM: number;
  maxElevationM: number;
}

/** Wind speed-up factor at a specific grid point */
export interface SpeedUpPoint {
  lat: number;
  lng: number;
  /** Fractional speed-up ratio (1.0 = no change, >1.0 = acceleration, <1.0 = deceleration) */
  speedUpFactor: number;
}

/** Grid of speed-up factors across a site */
export interface SpeedUpGrid {
  points: SpeedUpPoint[][];
  rows: number;
  cols: number;
  maxSpeedUp: number;
  minSpeedUp: number;
  meanSpeedUp: number;
}

/** Ruggedness Index result */
export interface RixResult {
  /** RIX value as percentage (0-100) */
  rixPercent: number;
  /** Number of terrain profiles analysed */
  profileCount: number;
  /** Fraction of profiles exceeding critical slope */
  exceedingFraction: number;
  /** Assessment of flow model reliability */
  flowModelReliability: 'high' | 'moderate' | 'low';
  /** Human-readable summary */
  summary: string;
}
