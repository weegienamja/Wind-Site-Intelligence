import type { EnergyYieldResult } from '../types/energy.js';
import type {
  FinancialParams,
  ParameterVariation,
  SensitivityItem,
  SensitivityResult,
} from '../types/financial.js';
import { calculateLcoe, resolveParams } from './financial-model.js';

/** Default parameter variations for sensitivity analysis */
export const DEFAULT_VARIATIONS: ParameterVariation[] = [
  { parameter: 'energyPricePerMwh', label: 'Energy Price', low: 40, high: 80 },
  { parameter: 'discountRate', label: 'Discount Rate', low: 0.05, high: 0.12 },
  { parameter: 'capexPerMw', label: 'CAPEX per MW', low: 1_000_000, high: 1_600_000 },
  { parameter: 'opexPerMwPerYear', label: 'OPEX per MW/yr', low: 30_000, high: 60_000 },
  { parameter: 'projectLifeYears', label: 'Project Life', low: 20, high: 30 },
  { parameter: 'degradationRatePercent', label: 'Degradation Rate', low: 0.005, high: 0.025 },
];

/**
 * Run a sensitivity analysis showing how LCOE changes when varying each parameter.
 *
 * For each variation, calculates the LCOE at the low and high values while
 * keeping all other parameters at their base values. Results are sorted by
 * spread (most sensitive parameter first), suitable for a tornado chart.
 */
export function runSensitivityAnalysis(
  aep: EnergyYieldResult,
  baseParams?: Partial<FinancialParams>,
  variations?: ParameterVariation[],
): SensitivityResult {
  const params = resolveParams(baseParams);
  const baseLcoe = calculateLcoe(aep, params).lcoePerMwh;
  const vars = variations ?? DEFAULT_VARIATIONS;

  const items: SensitivityItem[] = vars.map((v) => {
    const lowParams = { ...params, [v.parameter]: v.low };
    const highParams = { ...params, [v.parameter]: v.high };

    const lcoeLow = calculateLcoe(aep, lowParams).lcoePerMwh;
    const lcoeHigh = calculateLcoe(aep, highParams).lcoePerMwh;

    return {
      parameter: v.parameter,
      label: v.label,
      lcoeLow,
      lcoeHigh,
      lcoeBase: baseLcoe,
      spread: Math.abs(lcoeHigh - lcoeLow),
    };
  });

  // Sort by spread (most sensitive first)
  items.sort((a, b) => b.spread - a.spread);

  const topParam = items[0];
  const summaryLine = topParam
    ? `Most sensitive parameter: ${topParam.label} (LCOE range: ${topParam.lcoeLow.toFixed(2)} - ${topParam.lcoeHigh.toFixed(2)}).`
    : 'No sensitivity analysis performed.';

  return {
    baseLcoe,
    items,
    summary:
      `Base LCOE: ${baseLcoe.toFixed(2)}/MWh. ${summaryLine} ` +
      `${items.length} parameters analysed.`,
  };
}

/**
 * Compare multiple financial scenarios side by side.
 *
 * Each scenario uses different FinancialParams but the same AEP.
 * Returns the LCOE, IRR, and payback for each scenario.
 */
export function compareScenarios(
  aep: EnergyYieldResult,
  scenarios: Array<{ label: string; params: Partial<FinancialParams> }>,
): Array<{
  label: string;
  lcoePerMwh: number;
  npvGbp: number;
  simplePaybackYears: number;
}> {
  // Import lazily to avoid circular dependencies at module level
  const results = scenarios.map((scenario) => {
    const p = resolveParams(scenario.params);
    const lcoe = calculateLcoe(aep, p);
    const cashflows = buildSimpleNpv(aep, p);

    return {
      label: scenario.label,
      lcoePerMwh: lcoe.lcoePerMwh,
      npvGbp: cashflows.npv,
      simplePaybackYears: cashflows.paybackYears,
    };
  });

  return results;
}

function buildSimpleNpv(
  aep: EnergyYieldResult,
  p: FinancialParams,
): { npv: number; paybackYears: number } {
  const capacityMw = (aep.turbineCount * aep.turbineModel.ratedPowerKw) / 1000;
  const totalCapex = capacityMw * p.capexPerMw + (p.gridConnectionCostGbp ?? 0);
  const annualOpex = capacityMw * p.opexPerMwPerYear;

  let npv = 0;
  let cumulative = 0;
  let paybackYears = Infinity;

  // Construction
  for (let y = 0; y < p.constructionYears; y++) {
    const capexYear = totalCapex / p.constructionYears;
    cumulative -= capexYear;
    npv -= capexYear / (1 + p.discountRate) ** y;
  }

  // Operations
  for (let y = 1; y <= p.projectLifeYears; y++) {
    const t = p.constructionYears + y - 1;
    const degradation = (1 - p.degradationRatePercent) ** (y - 1);
    const energy = aep.netTotalAepMwh * degradation;
    const revenue = energy * p.energyPricePerMwh * (1 + p.inflationRate) ** (y - 1);
    const opex = annualOpex * (1 + p.inflationRate) ** (y - 1);
    const net = revenue - opex;

    cumulative += net;
    npv += net / (1 + p.discountRate) ** t;

    if (cumulative >= 0 && paybackYears === Infinity) {
      paybackYears = t;
    }
  }

  return { npv: Math.round(npv), paybackYears };
}
