/** Financial input parameters for wind project assessment */
export interface FinancialParams {
  /** Capital expenditure per MW installed (GBP). Default: 1,300,000 */
  capexPerMw: number;
  /** Operating expenditure per MW per year (GBP). Default: 45,000 */
  opexPerMwPerYear: number;
  /** Energy sale price per MWh (GBP). Default: 60 */
  energyPricePerMwh: number;
  /** Weighted average cost of capital / discount rate (0-1). Default: 0.08 */
  discountRate: number;
  /** Project operational life in years. Default: 25 */
  projectLifeYears: number;
  /** Annual energy degradation rate (0-1). Default: 0.016 */
  degradationRatePercent: number;
  /** Construction period in years. Default: 2 */
  constructionYears: number;
  /** Annual inflation rate (0-1). Default: 0.02 */
  inflationRate: number;
  /** Grid connection cost (GBP). If undefined, estimated from grid proximity. */
  gridConnectionCostGbp?: number;
  /** Decommissioning cost as fraction of CAPEX (0-1). Default: 0.03 */
  decommissioningFraction: number;
  /** Currency symbol for display. Default: 'GBP' */
  currency: string;
}

/** Levelised Cost of Energy result */
export interface LcoeResult {
  /** LCOE in currency per MWh */
  lcoePerMwh: number;
  /** Total lifetime discounted cost */
  totalLifetimeCostGbp: number;
  /** Total lifetime discounted energy production (MWh) */
  totalLifetimeEnergyMwh: number;
  /** Cost breakdown */
  breakdown: {
    capex: number;
    opex: number;
    decommissioning: number;
  };
  /** Human-readable summary */
  summary: string;
}

/** Internal rate of return result */
export interface IrrResult {
  /** IRR as a decimal (e.g. 0.12 = 12%) */
  irr: number;
  /** Whether IRR converged */
  converged: boolean;
  /** Human-readable summary */
  summary: string;
}

/** Payback period result */
export interface PaybackResult {
  /** Simple (undiscounted) payback in years */
  simplePaybackYears: number;
  /** Discounted payback in years (Infinity if never achieved) */
  discountedPaybackYears: number;
  /** Human-readable summary */
  summary: string;
}

/** A single year in the cashflow projection */
export interface YearlyCashflow {
  /** Year number (0 = construction start, constructionYears+1 = first operational year) */
  year: number;
  /** Revenue from energy sales (GBP) */
  revenueGbp: number;
  /** Operating costs (GBP) */
  opexGbp: number;
  /** Capital expenditure (GBP, non-zero during construction) */
  capexGbp: number;
  /** Net cashflow for this year */
  netCashflowGbp: number;
  /** Cumulative undiscounted cashflow */
  cumulativeCashflowGbp: number;
  /** Discounted net cashflow */
  discountedCashflowGbp: number;
  /** Cumulative discounted cashflow */
  cumulativeDiscountedCashflowGbp: number;
  /** Energy produced this year (MWh) */
  energyMwh: number;
}

/** Full cashflow projection over project lifetime */
export interface CashflowProjection {
  /** Year-by-year cashflow */
  years: YearlyCashflow[];
  /** Net present value (GBP) */
  npvGbp: number;
  /** Internal rate of return (0-1) */
  irr: number;
  /** Simple payback period (years from first operational year) */
  simplePaybackYears: number;
  /** Discounted payback period (years) */
  discountedPaybackYears: number;
  /** Total installed capacity (MW) */
  installedCapacityMw: number;
  /** Total CAPEX (GBP) */
  totalCapexGbp: number;
  /** Human-readable summary */
  summary: string;
}

/** Parameter variation for sensitivity analysis */
export interface ParameterVariation {
  /** Parameter name to vary */
  parameter: keyof FinancialParams;
  /** Display label */
  label: string;
  /** Low-case value */
  low: number;
  /** High-case value */
  high: number;
}

/** Sensitivity analysis result for one parameter */
export interface SensitivityItem {
  /** Parameter that was varied */
  parameter: string;
  /** Display label */
  label: string;
  /** LCOE at low-case value */
  lcoeLow: number;
  /** LCOE at high-case value */
  lcoeHigh: number;
  /** LCOE at base-case value */
  lcoeBase: number;
  /** Spread (high - low) indicating sensitivity */
  spread: number;
}

/** Full sensitivity analysis result */
export interface SensitivityResult {
  /** Base-case LCOE */
  baseLcoe: number;
  /** Sensitivity items sorted by spread (most sensitive first) */
  items: SensitivityItem[];
  /** Human-readable summary */
  summary: string;
}
