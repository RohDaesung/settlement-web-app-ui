export interface SettlementItem {
  id: string;
  name: string;        // (지금 UI에선 color/품명)
  size?: string;       // NEW: 'S' | 'M' | 'L' | 'XL' | 'FREE' | etc
  quantity: number;
  unitPrice: number;
  remarks?: string;    // 상품별 비고 (DB remarks)
}

export interface RoundData {
  id: string;
  name: string; // e.g., "1차", "2차"
  items: SettlementItem[];
  depositItems: SettlementItem[]; // 계약금 항목 (초기 설정)
  totalAmount: number; // 계약금 탭에서의 총액
  depositAmount: number; // 계약금 금액 (한번 정해지면 고정)
  balanceAmount: number; // 계약금 탭에서 계산된 잔금 (60%)
  depositLocked: boolean; // 계약금 고정 여부
  lockedDepositAmount?: number; // 고정된 계약금 금액
  lockedAt?: string; // 계약금 고정 시간
  // 최종 정산용
  finalTotalAmount?: number; // 잔금 탭에서 수정된 총액
  finalBalanceAmount?: number; // 최종 정산 잔액 (최종총액 - 계약금)
  depositPaymentDate?: string;
  balancePaymentDate?: string;
  memo?: string;
  remarks?: string; // 비고
  withVAT: boolean;
  files: SettlementFile[];
  createdAt: string;
}

export interface SettlementFile {
  id: string;
  name: string;
  type: 'pdf' | 'xlsx';
  uploadedAt: string;
}

export interface StyleFolder {
  id: string;
  code: string; // e.g., "0130"
  name: string; // e.g., "퀼팅 누빔 배색점퍼"
  rounds: RoundData[];
}

export interface Vendor {
  id: string;
  code: string; // e.g., "01"
  name: string; // e.g., "로브로브"
  styles: StyleFolder[];
}

export interface SettlementState {
  vendors: Vendor[];
  selectedVendorId?: string;
  selectedStyleId?: string;
  selectedRoundId?: string;
  searchQuery: string;
  recentItems: Array<{ vendorCode: string; styleCode: string; roundName: string }>;
}
