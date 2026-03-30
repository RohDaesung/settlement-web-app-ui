import type {
  MarginAnalysisRow,
  MarginCalculations,
  MarginKPI,
} from './margin-types';

const DOCUMENT_FEE_TOTAL = 103000;
const OTHER_COST_TOTAL = 20000;

export function calculateMarginPerRow(
  row: MarginAnalysisRow
): MarginCalculations {
  const quantity = Number(row.totalQuantity || 0);
  const appliedExchangeRate = Number(row.exchangeRate || 0);

  // 원화 원가 = 원가(CNY) × 환율
  const baseCostPerUnit = Number(row.costCNY || 0) * appliedExchangeRate;

  // 장당 입력값
  const shippingFeePer = Number(row.shippingFeePer || 0);
  const inspectionFeePer = Number(row.inspectionFeePer || 0);

  // 자동 계산값
  const documentFeePer = quantity > 0 ? DOCUMENT_FEE_TOTAL / quantity : 0;
  const otherCostPer = quantity > 0 ? OTHER_COST_TOTAL / quantity : 0;

  // 관세는 "장당 금액" 직접 입력
  const tariffAmount = Number(row.tariffRate || 0);

  // 장당 총원가
  const costPerUnit =
    baseCostPerUnit +
    shippingFeePer +
    inspectionFeePer +
    documentFeePer +
    otherCostPer +
    tariffAmount;

  // 장당 이윤
  const profitPerUnit = Number(row.sellingPrice || 0) - costPerUnit;

  // 총 이윤
  const totalProfit = Math.round(profitPerUnit * quantity);

  return {
    appliedExchangeRate: Math.round(appliedExchangeRate * 10000) / 10000,
    baseCostPerUnit: Math.round(baseCostPerUnit),
    tariffAmount: Math.round(tariffAmount),
    shippingFeePer: Math.round(shippingFeePer),
    inspectionFeePer: Math.round(inspectionFeePer),
    documentFeePer: Math.round(documentFeePer),
    otherCostPer: Math.round(otherCostPer),
    costPerUnit: Math.round(costPerUnit),
    profitPerUnit: Math.round(profitPerUnit),
    totalProfit,
  };
}

export function calculateMarginKPI(
  rows: MarginAnalysisDataLike[]
): MarginKPI {
  if (rows.length === 0) {
    return {
      totalProfit: 0,
      totalQuantity: 0,
      avgProfitPerUnit: 0,
      avgCostPerUnit: 0,
    };
  }

  const totalProfit = rows.reduce(
    (sum, row) => sum + row.calculations.totalProfit,
    0
  );

  const totalQuantity = rows.reduce(
    (sum, row) => sum + Number(row.totalQuantity || 0),
    0
  );

  let totalWeightedProfit = 0;
  let totalWeightedCost = 0;

  rows.forEach((row) => {
    totalWeightedProfit +=
      Number(row.calculations.profitPerUnit || 0) *
      Number(row.totalQuantity || 0);

    totalWeightedCost +=
      Number(row.calculations.costPerUnit || 0) *
      Number(row.totalQuantity || 0);
  });

  const avgProfitPerUnit =
    totalQuantity > 0 ? Math.round(totalWeightedProfit / totalQuantity) : 0;

  const avgCostPerUnit =
    totalQuantity > 0 ? Math.round(totalWeightedCost / totalQuantity) : 0;

  return {
    totalProfit,
    totalQuantity,
    avgProfitPerUnit,
    avgCostPerUnit,
  };
}

type MarginAnalysisDataLike = MarginAnalysisRow & {
  calculations: MarginCalculations;
};

export function formatCurrency(value: number): string {
  return `₩${Number(value || 0).toLocaleString()}`;
}

export function formatNumber(value: number): string {
  return Number(value || 0).toLocaleString();
}

export function formatDate(dateString: string): string {
  if (!dateString) return '';

  const date = new Date(dateString);
  if (Number.isNaN(date.getTime())) return '';

  return date.toLocaleDateString('ko-KR', {
    year: '2-digit',
    month: '2-digit',
    day: '2-digit',
  });
}

export function formatDateCompact(dateString: string): string {
  if (!dateString) return '';

  const date = new Date(dateString);
  if (Number.isNaN(date.getTime())) return '';

  const year = String(date.getFullYear()).slice(-2);
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');

  return `${year}. ${month}. ${day}`;
}