'use client';

import { useRouter, useSearchParams } from 'next/navigation';
import { Suspense } from 'react';
import { SettlementSheetTemplate } from '@/components/settlement-sheet-template';
import { mockVendors } from '@/lib/mock-data';
import { Button } from '@/components/ui/button';
import { X, Printer } from 'lucide-react';

interface PrintPageProps {
  params: { mode: string };
}

function PrintContent({ mode }: { mode: string }) {
  const router = useRouter();
  const searchParams = useSearchParams();

  const roundId = searchParams.get('roundId');
  const vendorId = searchParams.get('vendorId');
  const styleId = searchParams.get('styleId');

  // Find the round data
  let round = null;
  let vendor = null;
  let style = null;

  if (vendorId && styleId && roundId) {
    const vendorData = mockVendors.find((v) => v.id === vendorId);
    if (vendorData) {
      vendor = vendorData;
      const styleData = vendorData.styles.find((s) => s.id === styleId);
      if (styleData) {
        style = styleData;
        round = styleData.rounds.find((r) => r.id === roundId);
      }
    }
  }

  if (!round || !vendor || !style) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <h1 className="text-2xl font-bold mb-4">데이터를 찾을 수 없습니다</h1>
          <Button onClick={() => router.back()}>돌아가기</Button>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-gray-100 min-h-screen p-8">
      <div className="max-w-[210mm] mx-auto">
        {/* Control Bar */}
        <div className="flex justify-between items-center mb-6 print:hidden">
          <div>
            <p className="text-sm text-gray-600">
              {vendor.name} / {style.name} / {round.name}
            </p>
          </div>
          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => window.print()}
              className="flex items-center gap-2"
            >
              <Printer className="h-4 w-4" />
              인쇄
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => router.back()}
              className="flex items-center gap-2"
            >
              <X className="h-4 w-4" />
              닫기
            </Button>
          </div>
        </div>

        {/* Print Area */}
        <div className="bg-gray-100">
          <SettlementSheetTemplate
            mode={mode as 'deposit' | 'balance'}
            round={round}
            vendor={vendor.name}
            style={style.name}
          />
        </div>
      </div>
    </div>
  );
}

export default function PrintPage({ params }: PrintPageProps) {
  return (
    <Suspense fallback={<div>로딩 중...</div>}>
      <PrintContent mode={params.mode} />
    </Suspense>
  );
}
