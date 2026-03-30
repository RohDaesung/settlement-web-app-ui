// 마진 분석 데이터 타입

export interface MarginAnalysisRow {
  id: string;
  companyName: string;
  designCode: string;
  round: string;
  shippingDate: string;
  totalQuantity: number;
  costCNY: number;
  exchangeRate: number;

  // 장당 입력 가능
  shippingFeePer: number;
  inspectionFeePer: number;

  // 자동 계산용 표시값
  documentFeePer: number;
  otherCostPer: number;

  // 관세는 장당 금액 직접 입력
  tariffRate: number;

  sellingPrice: number;
}

export interface MarginCalculations {
  appliedExchangeRate: number;
  baseCostPerUnit: number;
  tariffAmount: number;

  shippingFeePer: number;
  inspectionFeePer: number;
  documentFeePer: number;
  otherCostPer: number;

  costPerUnit: number;
  profitPerUnit: number;
  totalProfit: number;
}

export interface MarginAnalysisData extends MarginAnalysisRow {
  calculations: MarginCalculations;
}

export interface MarginKPI {
  totalProfit: number;
  totalQuantity: number;
  avgProfitPerUnit: number;
  avgCostPerUnit: number;
}