'use client';

import { useRouter } from 'next/navigation';
import { Printer as Print } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { RoundData, Vendor, StyleFolder } from '@/lib/types';

interface PrintSettlementTabProps {
  round: RoundData;
  vendor: Vendor;
  style: StyleFolder;
  onPrintDeposit?: () => void;
  onPrintBalance?: () => void;
}

function SettlementTablePrint({
  title,
  round,
  vendor,
  style,
  type,
}: {
  title: string;
  round: RoundData;
  vendor: Vendor;
  style: StyleFolder;
  type: 'deposit' | 'balance';
}) {
  const displayAmount =
    type === 'deposit' ? round.depositPaidAmount : Math.max(
      round.totalAmount - round.depositPaidAmount,
      0
    );

  return (
    <div className="bg-white p-8 border border-black print:border-0">
      <div className="text-center mb-6">
        <h1 className="text-2xl font-bold mb-2">정산표</h1>
        <p className="text-sm text-gray-600">
          {new Date().toLocaleDateString('ko-KR')}
        </p>
      </div>

      <div className="space-y-4 mb-6 text-sm">
        <div className="flex justify-between">
          <span className="font-medium">생산품명:</span>
          <span>{style.name}</span>
        </div>
        <div className="flex justify-between">
          <span className="font-medium">회사명:</span>
          <span>{vendor.name}</span>
        </div>
        <div className="flex justify-between">
          <span className="font-medium">차수:</span>
          <span>{round.name}</span>
        </div>
      </div>

      {/* Table */}
      <table className="w-full border-collapse mb-4 text-sm">
        <thead>
          <tr>
            <th className="border border-black px-3 py-2 text-left">번호</th>
            <th className="border border-black px-3 py-2 text-left">품명</th>
            <th className="border border-black px-3 py-2 text-right">수량</th>
            <th className="border border-black px-3 py-2 text-right">단가</th>
            <th className="border border-black px-3 py-2 text-right">금액</th>
          </tr>
        </thead>
        <tbody>
          {round.items.map((item, idx) => (
            <tr key={item.id}>
              <td className="border border-black px-3 py-2 text-center">
                {idx + 1}
              </td>
              <td className="border border-black px-3 py-2">{item.name}</td>
              <td className="border border-black px-3 py-2 text-right">
                {item.quantity.toLocaleString()}
              </td>
              <td className="border border-black px-3 py-2 text-right">
                ₩ {item.unitPrice.toLocaleString()}
              </td>
              <td className="border border-black px-3 py-2 text-right font-semibold">
                ₩ {(item.quantity * item.unitPrice).toLocaleString()}
              </td>
            </tr>
          ))}
        </tbody>
      </table>

      {/* Summary */}
      <table className="w-full border-collapse mb-6 text-sm">
        <tbody>
          <tr className="bg-yellow-100">
            <td className="border border-black px-3 py-2 font-bold w-2/3">
              총액
            </td>
            <td className="border border-black px-3 py-2 text-right font-bold">
              ₩ {round.totalAmount.toLocaleString()}
            </td>
          </tr>
          <tr className="bg-yellow-100">
            <td className="border border-black px-3 py-2 font-bold">계약금</td>
            <td className="border border-black px-3 py-2 text-right font-bold">
              ₩ {round.depositPaidAmount.toLocaleString()}
            </td>
          </tr>
          <tr className="bg-yellow-100">
            <td className="border border-black px-3 py-2 font-bold">잔금</td>
            <td className="border border-black px-3 py-2 text-right font-bold">
              ₩{' '}
              {Math.max(
                round.totalAmount - round.depositPaidAmount,
                0
              ).toLocaleString()}
            </td>
          </tr>
        </tbody>
      </table>

      {/* Footer */}
      <div className="text-sm space-y-2 border-t-2 border-black pt-4">
        <p>
          <span className="font-bold">계좌:</span> ________________
        </p>
        <p className="text-gray-600">
          {round.withVAT && '(VAT 별도)'}
        </p>
      </div>
    </div>
  );
}

export function PrintSettlementTab({
  round,
  vendor,
  style,
  onPrintDeposit,
  onPrintBalance,
}: PrintSettlementTabProps) {
  const router = useRouter();

  const handlePrintDeposit = () => {
    const params = new URLSearchParams({
      vendorId: vendor.id,
      styleId: style.id,
      roundId: round.id,
    });
    router.push(`/print/deposit?${params.toString()}`);
  };

  const handlePrintBalance = () => {
    const params = new URLSearchParams({
      vendorId: vendor.id,
      styleId: style.id,
      roundId: round.id,
    });
    router.push(`/print/balance?${params.toString()}`);
  };

  return (
    <div className="space-y-4">
      <div className="flex gap-3">
        <Button
          onClick={handlePrintDeposit}
          className="flex items-center gap-2"
        >
          <Print className="w-4 h-4" />
          계약금 정산표 출력
        </Button>
        <Button
          onClick={handlePrintBalance}
          className="flex items-center gap-2"
        >
          <Print className="w-4 h-4" />
          잔금 정산표 출력
        </Button>
      </div>

      {/* Print Preview */}
      <div className="print:hidden border-t pt-6">
        <h3 className="font-semibold mb-4">미리보기: 계약금 정산표</h3>
        <div className="border border-border rounded overflow-hidden bg-muted/20">
          <SettlementTablePrint
            title="계약금 정산표"
            round={round}
            vendor={vendor}
            style={style}
            type="deposit"
          />
        </div>
      </div>

      {/* Print Styles */}
      <style>{`
        @media print {
          body { margin: 0; }
          .print-page { page-break-after: always; }
          .print:hidden { display: none; }
        }
      `}</style>
    </div>
  );
}
