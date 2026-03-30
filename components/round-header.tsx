'use client';

import { Badge } from '@/components/ui/badge';
import { RoundData, Vendor, StyleFolder } from '@/lib/types';

interface RoundHeaderProps {
  vendor: Vendor;
  style: StyleFolder;
  round: RoundData;
}

export function RoundHeader({
  vendor,
  style,
  round,
}: RoundHeaderProps) {
  const getStatus = () => {
    if (round.depositAmount > 0 && round.finalBalanceAmount && round.finalBalanceAmount <= 0) {
      return '완료';
    } else if (round.depositAmount > 0) {
      return '진행중';
    }
    return '미작성';
  };

  return (
    <div className="bg-card border-b border-border">
      <div className="p-3 sm:p-4 space-y-3 sm:space-y-4">
        {/* Title and Status */}
        <div className="flex items-center justify-between gap-2 sm:gap-4">
          <div>
            <h1 className="text-lg sm:text-2xl font-bold">
              {vendor.code} {vendor.name}
            </h1>
            <p className="text-xs sm:text-sm text-muted-foreground mt-0.5 sm:mt-1">
              {style.code} {style.name} • {round.name}
            </p>
          </div>
          <Badge variant="outline" className="whitespace-nowrap text-xs">
            {getStatus()}
          </Badge>
        </div>

        {/* Key Info */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-2 sm:gap-4 text-xs sm:text-sm">
          <div className="bg-muted rounded p-2 sm:p-3">
            <div className="text-muted-foreground mb-0.5 sm:mb-1">총액</div>
            <div className="font-bold text-sm sm:text-lg">
              {(round.totalAmount || 0).toLocaleString()} ₩
            </div>
          </div>
          <div className="bg-muted rounded p-2 sm:p-3">
            <div className="text-muted-foreground mb-0.5 sm:mb-1">계약금 (고정)</div>
            <div className="font-bold text-sm sm:text-lg">
              {(round.depositAmount || 0).toLocaleString()} ₩
            </div>
          </div>
          <div className="bg-muted rounded p-2 sm:p-3">
            <div className="text-muted-foreground mb-0.5 sm:mb-1">잔금</div>
            <div className="font-bold text-sm sm:text-lg">
              {(round.finalBalanceAmount || round.balanceAmount || 0).toLocaleString()} ₩
            </div>
          </div>
          <div className="bg-muted rounded p-2 sm:p-3">
            <div className="text-muted-foreground mb-0.5 sm:mb-1">상품 수</div>
            <div className="font-bold text-sm sm:text-lg">
              {(round.items?.length || 0)}개
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
