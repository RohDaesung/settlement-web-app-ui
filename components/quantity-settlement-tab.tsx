'use client';

import { useState } from 'react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Checkbox } from '@/components/ui/checkbox';
import { RoundData, SettlementItem } from '@/lib/types';

interface QuantitySettlementTabProps {
  round: RoundData;
  onUpdate: (round: RoundData) => void;
}

export function QuantitySettlementTab({
  round,
  onUpdate,
}: QuantitySettlementTabProps) {
  const [items, setItems] = useState<SettlementItem[]>(round.items);
  const [unitPrice, setUnitPrice] = useState<number>(
    round.items.length > 0 ? round.items[0].unitPrice : 0
  );
  const [withVAT, setWithVAT] = useState(round.withVAT);
  const [depositLocked, setDepositLocked] = useState(true);
  const [depositPaymentDate, setDepositPaymentDate] = useState(
    round.depositPaymentDate || ''
  );
  const [balancePaymentDate, setBalancePaymentDate] = useState(
    round.balancePaymentDate || ''
  );
  const [memo, setMemo] = useState(round.memo || '');

  const handleQuantityChange = (itemId: string, newQuantity: number) => {
    const newItems = items.map((item) =>
      item.id === itemId ? { ...item, quantity: newQuantity } : item
    );
    setItems(newItems);
    recalculateRound(newItems, unitPrice);
  };

  const handleUnitPriceChange = (newPrice: number) => {
    setUnitPrice(newPrice);
    const newItems = items.map((item) => ({
      ...item,
      unitPrice: newPrice,
    }));
    setItems(newItems);
    recalculateRound(newItems, newPrice);
  };

  const recalculateRound = (
    newItems: SettlementItem[],
    price: number
  ) => {
    const totalQty = newItems.reduce((sum, item) => sum + item.quantity, 0);
    const newTotal = totalQty * price;

    // Balance = new total - locked deposit
    const balance = newTotal - round.depositPaidAmount;

    const updatedRound: RoundData = {
      ...round,
      items: newItems,
      totalAmount: newTotal,
      // depositPaidAmount stays locked
      withVAT,
      depositPaymentDate,
      balancePaymentDate,
      memo,
    };

    onUpdate(updatedRound);
  };

  const totalQty = items.reduce((sum, item) => sum + item.quantity, 0);
  const newTotal = totalQty * unitPrice;
  const balance = newTotal - round.depositPaidAmount;

  return (
    <div className="space-y-6">
      {/* Header Info */}
      <div className="bg-card border border-border rounded-lg p-4 space-y-4">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
          <div>
            <div className="text-muted-foreground mb-1">단가(₩)</div>
            <Input
              type="number"
              value={unitPrice}
              onChange={(e) => handleUnitPriceChange(Number(e.target.value))}
              placeholder="0"
              className="text-lg font-semibold"
            />
          </div>
          <div>
            <div className="text-muted-foreground mb-1">계약금 입금일</div>
            <Input
              type="date"
              value={depositPaymentDate}
              onChange={(e) => setDepositPaymentDate(e.target.value)}
            />
          </div>
          <div>
            <div className="text-muted-foreground mb-1">잔금 입금일</div>
            <Input
              type="date"
              value={balancePaymentDate}
              onChange={(e) => setBalancePaymentDate(e.target.value)}
            />
          </div>
          <div className="flex items-end">
            <label className="flex items-center gap-2 cursor-pointer">
              <Checkbox checked={withVAT} onCheckedChange={(checked) => {
                setWithVAT(!!checked);
                onUpdate({
                  ...round,
                  items,
                  totalAmount: newTotal,
                  withVAT: !!checked,
                });
              }} />
              <span className="text-sm">VAT 별도</span>
            </label>
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium mb-2">메모</label>
          <Input
            value={memo}
            onChange={(e) => setMemo(e.target.value)}
            placeholder="메모를 입력하세요"
            className="text-sm"
          />
        </div>
      </div>

      {/* Settlement Table */}
      <div className="border border-border rounded-lg overflow-hidden">
        <Table>
          <TableHeader className="bg-muted">
            <TableRow>
              <TableHead className="w-1/3">품명(옵션/색상)</TableHead>
              <TableHead className="w-1/6 text-right">수량</TableHead>
              <TableHead className="w-1/6 text-right">단가(₩)</TableHead>
              <TableHead className="w-1/4 text-right">금액(₩)</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {items.map((item) => (
              <TableRow key={item.id}>
                <TableCell className="font-medium">{item.name}</TableCell>
                <TableCell className="text-right">
                  <Input
                    type="number"
                    value={item.quantity}
                    onChange={(e) =>
                      handleQuantityChange(item.id, Number(e.target.value))
                    }
                    className="w-20 ml-auto text-right"
                  />
                </TableCell>
                <TableCell className="text-right">
                  {item.unitPrice.toLocaleString()}
                </TableCell>
                <TableCell className="text-right font-semibold">
                  {(item.quantity * item.unitPrice).toLocaleString()}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      {/* Summary Section */}
      <div className="bg-yellow-50 border-2 border-yellow-200 rounded-lg overflow-hidden">
        <Table>
          <TableBody>
            <TableRow className="hover:bg-yellow-50">
              <TableCell className="font-bold w-1/3">총액</TableCell>
              <TableCell className="text-right font-bold text-lg">
                {newTotal.toLocaleString()} ₩
              </TableCell>
            </TableRow>
            <TableRow className="hover:bg-yellow-50">
              <TableCell className="font-bold">
                계약금
                <div className="text-xs font-normal text-muted-foreground mt-1">
                  고정값(실입금 기준)
                </div>
              </TableCell>
              <TableCell className="text-right">
                <div className="flex flex-col items-end gap-2">
                  <span className="font-bold text-lg">
                    {round.depositPaidAmount.toLocaleString()} ₩
                  </span>
                  <span className="text-xs text-muted-foreground">
                    {((round.depositPaidAmount / (round.totalAmount || 1)) * 100).toFixed(1)}%
                  </span>
                </div>
              </TableCell>
            </TableRow>
            <TableRow className="hover:bg-yellow-50">
              <TableCell className="font-bold">잔금</TableCell>
              <TableCell className="text-right font-bold text-lg">
                {Math.max(balance, 0).toLocaleString()} ₩
              </TableCell>
            </TableRow>
          </TableBody>
        </Table>
      </div>

      {/* Info Text */}
      <div className="bg-blue-50 border border-blue-200 rounded p-3 text-sm text-blue-900">
        <p className="font-semibold mb-1">계약금은 고정값입니다</p>
        <p>계약금은 고정값(실입금 기준)이며, 수량 변경 시 재계산되지 않습니다.</p>
      </div>

      {/* Save Button */}
      <Button className="w-full md:w-auto">저장</Button>
    </div>
  );
}
