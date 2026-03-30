import type { LatLng } from './analysis.js';

/** Wake model algorithm selection */
export type WakeModelType = 'jensen' | 'bastankhah' | 'parametric';

/** Turbine position with operational parameters for wake calculations */
export interface TurbinePosition {
  id: number;
  location: LatLng;
  hubHeightM: number;
  rotorDiameterM: number;
}

/** Wake deficit at a specific downstream turbine from a single upstream source */
export interface WakeDeficit {
  upstreamTurbineId: number;
  downstreamTurbineId: number;
  /** Fractional velocity deficit (0-1) */
  velocityDeficit: number;
  /** Downwind distance in metres */
  downwindDistanceM: number;
  /** Crosswind offset in metres */
  crosswindOffsetM: number;
  /** Fraction of downstream rotor swept area affected by wake (0-1) */
  overlapFraction: number;
}

/** Wake result for a single wind direction sector */
export interface SectorWakeResult {
  /** Wind direction in degrees (0 = North, clockwise) */
  directionDeg: number;
  /** Frequency weight for this sector (0-1) */
  frequencyWeight: number;
  /** Effective wind speed at each turbine after wake effects (m/s) */
  effectiveSpeedMs: number[];
  /** Power output at each turbine (kW) */
  powerOutputKw: number[];
  /** Wake deficits between turbine pairs */
  deficits: WakeDeficit[];
}

/** Per-turbine wake analysis result */
export interface TurbineWakeResult {
  turbineId: number;
  location: LatLng;
  /** Free-stream AEP without wake effects (MWh) */
  freeStreamAepMwh: number;
  /** Wake-adjusted AEP (MWh) */
  wakeAdjustedAepMwh: number;
  /** Wake loss as percentage (0-100) */
  wakeLossPercent: number;
  /** Individual wake efficiency (0-1) */
  efficiency: number;
}

/** Complete wake loss analysis result for a wind farm */
export interface WakeLossResult {
  /** Model used for calculation */
  model: WakeModelType;
  /** Gross farm AEP without wake effects (MWh) */
  grossFarmAepMwh: number;
  /** Wake-adjusted farm AEP (MWh) */
  wakeAdjustedFarmAepMwh: number;
  /** Overall wake loss percentage (0-100) */
  wakeLossPercent: number;
  /** Overall farm efficiency (0-1) */
  farmEfficiency: number;
  /** Per-turbine results */
  perTurbineResults: TurbineWakeResult[];
  /** Per-sector results for directional analysis */
  sectorResults: SectorWakeResult[];
  /** Wake decay constant used */
  wakeDecayConstant: number;
  /** Summary string */
  summary: string;
}

/** Options for wake model calculations */
export interface WakeOptions {
  /** Number of directional sectors (default: 36 = 10-degree intervals) */
  sectorCount?: number;
  /** Override wake decay constant (k). If not set, derived from terrain roughness */
  wakeDecayConstant?: number;
  /** Terrain roughness class (0-3), used to derive wake decay if wakeDecayConstant not set */
  roughnessClass?: number;
  /** Hub height for power calculations (m) */
  hubHeightM?: number;
}
