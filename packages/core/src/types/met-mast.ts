/** A single record from a met mast dataset */
export interface MetMastRecord {
  /** Timestamp of the measurement (UTC) */
  timestamp: Date;
  /** Wind speed at measurement height (m/s) */
  windSpeedMs: number;
  /** Wind direction in degrees (0-360, north = 0) */
  windDirectionDeg: number;
  /** Measurement height above ground (m) */
  heightM: number;
  /** Air temperature (degrees C) */
  temperatureC?: number;
  /** Atmospheric pressure (hPa) */
  pressureHpa?: number;
  /** Turbulence intensity as fraction (0-1) */
  turbulenceIntensity?: number;
}

/** Configuration for mapping CSV columns to MetMastRecord fields */
export interface MetMastColumnConfig {
  /** Column name or 0-based index for timestamp */
  timestamp: string | number;
  /** Column name or index for wind speed */
  windSpeed: string | number;
  /** Column name or index for wind direction */
  windDirection: string | number;
  /** Measurement height in metres */
  heightM: number;
  /** Column name or index for temperature (optional) */
  temperature?: string | number;
  /** Column name or index for pressure (optional) */
  pressure?: string | number;
  /** Column name or index for turbulence intensity (optional) */
  turbulenceIntensity?: string | number;
  /** Timestamp format string (default: ISO 8601). Supports: 'iso', 'yyyy-mm-dd hh:mm', 'dd/mm/yyyy hh:mm' */
  timestampFormat?: string;
  /** CSV delimiter (default: ',') */
  delimiter?: string;
  /** Whether CSV has a header row (default: true) */
  hasHeader?: boolean;
}

/** A flagged record with quality issue */
export interface FlaggedRecord {
  /** Index of the record in the dataset */
  index: number;
  /** Timestamp of the flagged record */
  timestamp: Date;
  /** Type of issue detected */
  flagType: 'range_exceeded' | 'stuck_sensor' | 'icing' | 'gap' | 'duplicate';
  /** Human-readable description */
  description: string;
}

/** A gap in the time series */
export interface DataGap {
  /** Start of the gap */
  startTime: Date;
  /** End of the gap */
  endTime: Date;
  /** Duration of the gap in hours */
  durationHours: number;
}

/** Complete met mast dataset with metadata */
export interface MetMastDataset {
  /** All valid records */
  records: MetMastRecord[];
  /** Site identifier */
  siteId: string;
  /** Measurement height (m) */
  heightM: number;
  /** Start of the dataset */
  startDate: Date;
  /** End of the dataset */
  endDate: Date;
  /** Data recovery as fraction (0-1) */
  dataRecovery: number;
  /** Mean wind speed across the dataset (m/s) */
  meanSpeedMs: number;
  /** Total number of records parsed (including invalid) */
  totalRecordsParsed: number;
  /** Records that failed validation */
  flaggedRecords: FlaggedRecord[];
  /** Gaps detected in the time series */
  gaps: DataGap[];
}

/** Result of data quality assessment */
export interface DataQualityReport {
  /** Data recovery percentage (0-100) */
  recoveryPercent: number;
  /** Number of gaps detected */
  gapCount: number;
  /** Total gap duration (hours) */
  totalGapHours: number;
  /** Longest gap (hours) */
  longestGapHours: number;
  /** Number of records flagged for icing */
  icingRecordCount: number;
  /** Number of records flagged as stuck sensor */
  stuckSensorCount: number;
  /** Whether each calendar month has data */
  seasonalCompleteness: boolean[];
  /** Months with data (0-indexed) */
  monthsWithData: number[];
  /** Is dataset complete enough for reliable analysis */
  isAdequate: boolean;
  /** Human-readable summary */
  summary: string;
}

/** Result of Measure-Correlate-Predict analysis */
export interface McpResult {
  /** R-squared of the on-site vs reference correlation */
  correlationR2: number;
  /** Predicted long-term mean wind speed at measurement height (m/s) */
  predictedLongTermMeanMs: number;
  /** Ratio of long-term predicted to short-term measured mean */
  adjustmentFactor: number;
  /** Monthly means predicted by applying regression to full reference period */
  longTermMonthlyMeans: Array<{ year: number; month: number; predictedSpeedMs: number }>;
  /** Number of concurrent months used for correlation */
  concurrentPeriodMonths: number;
  /** Regression slope */
  regressionSlope: number;
  /** Regression intercept */
  regressionIntercept: number;
  /** Standard error of the regression */
  standardError: number;
  /** Confidence level of the prediction */
  confidence: 'high' | 'medium' | 'low';
  /** Human-readable summary */
  summary: string;
}
