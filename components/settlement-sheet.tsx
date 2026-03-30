'use client';

import { RoundData, SettlementItem } from '@/lib/types';

interface SettlementSheetProps {
  mode: 'deposit' | 'balance';
  round: RoundData;
  vendor: string;
  style: string;
}

const INTERNAL_FREE_SIZE = 'FREE';
const BODY_ROW_COUNT = 24;

type PrintRow = {
  key: string;
  name: string;
  remarks: string;
  freeQuantity: number;
  quantities: Record<string, number>;
  unitPricesBySize: Record<string, number>;
  baseUnitPrice: number;
  hasMixedPrices: boolean;
  totalAmount: number;
};

function formatCurrency(amount: number) {
  return `₩${new Intl.NumberFormat('ko-KR').format(Math.round(amount))}`;
}

function getVisibleSizes(items: SettlementItem[]) {
  const set = new Set<string>();

  items.forEach((item) => {
    const size = (item.size || '').trim();
    if (!size || size === INTERNAL_FREE_SIZE) return;
    set.add(size);
  });

  return Array.from(set);
}

function buildPrintRows(items: SettlementItem[], visibleSizes: string[]): PrintRow[] {
  const map = new Map<string, PrintRow>();

  items.forEach((item) => {
    const name = item.name || '';
    const rowRemarks = item.remarks || '';
    const size = (item.size || '').trim() || INTERNAL_FREE_SIZE;
    const quantity = Number(item.quantity || 0);
    const unitPrice = Number(item.unitPrice || 0);
    const key = `${name}__${rowRemarks}`;

    if (!map.has(key)) {
      const row: PrintRow = {
        key,
        name,
        remarks: rowRemarks,
        freeQuantity: 0,
        quantities: {},
        unitPricesBySize: {},
        baseUnitPrice: unitPrice,
        hasMixedPrices: false,
        totalAmount: 0,
      };

      visibleSizes.forEach((s) => {
        row.quantities[s] = 0;
      });

      map.set(key, row);
    }

    const row = map.get(key)!;

    if (size === INTERNAL_FREE_SIZE) {
      row.freeQuantity += quantity;
      row.totalAmount += quantity * unitPrice;
      if (!row.baseUnitPrice) row.baseUnitPrice = unitPrice;
      return;
    }

    row.quantities[size] = (row.quantities[size] || 0) + quantity;
    row.unitPricesBySize[size] = unitPrice;
    row.totalAmount += quantity * unitPrice;

    if (!row.baseUnitPrice) {
      row.baseUnitPrice = unitPrice;
    }
  });

  for (const row of map.values()) {
    if (visibleSizes.length === 0) {
      row.hasMixedPrices = false;
      continue;
    }

    const usedSizes = visibleSizes.filter((size) => Number(row.quantities[size] || 0) > 0);
    const prices = usedSizes.map((size) => row.unitPricesBySize[size] ?? row.baseUnitPrice);
    const distinctPrices = Array.from(new Set(prices));

    row.hasMixedPrices = distinctPrices.length > 1;

    if (distinctPrices.length === 1 && distinctPrices[0] !== undefined) {
      row.baseUnitPrice = distinctPrices[0];
    }
  }

  return Array.from(map.values());
}

function getUnitPriceLabel(row: PrintRow, visibleSizes: string[]) {
  if (visibleSizes.length === 0) {
    return formatCurrency(row.baseUnitPrice);
  }

  if (!row.hasMixedPrices) {
    return formatCurrency(row.baseUnitPrice);
  }

  const parts = visibleSizes
    .filter((size) => Number(row.quantities[size] || 0) > 0)
    .map(
      (size) =>
        `${size} ${new Intl.NumberFormat('ko-KR').format(
          row.unitPricesBySize[size] ?? row.baseUnitPrice
        )}`
    );

  return parts.join(' / ');
}

export function SettlementSheet({
  mode,
  round,
  vendor,
  style,
}: SettlementSheetProps) {
  const today = new Date();
  const dateStr = `${String(today.getFullYear()).slice(-2)}.${String(
    today.getMonth() + 1
  ).padStart(2, '0')}.${String(today.getDate()).padStart(2, '0')}`;

  const items = round.items || [];
  const visibleSizes = getVisibleSizes(items);
  const hasSizeColumns = visibleSizes.length > 0;
  const rows = buildPrintRows(items, visibleSizes);
  const emptyRowCount = Math.max(0, BODY_ROW_COUNT - rows.length);

  const totalAmount = Number(round.totalAmount || 0);
  const deposit =
    mode === 'deposit'
      ? Math.round(totalAmount * 0.4)
      : Number((round as any).depositPaidAmount || round.depositAmount || 0);
  const balance = totalAmount - deposit;

  const leftCategoryWidth = '7%';
  const productWidth = hasSizeColumns ? '21%' : '22%';
  const remarksWidth = '8%';
  const priceWidth = hasSizeColumns ? '16%' : '15%';
  const amountWidth = hasSizeColumns ? '16%' : '15%';
  const quantityWidthSingle = hasSizeColumns ? '0%' : '31%';

  const totalSizeAreaPercent = hasSizeColumns
    ? 100 - 7 - 21 - 16 - 16 - 8
    : 0;

  const perSizeWidth = hasSizeColumns
    ? `${Math.max(6, totalSizeAreaPercent / visibleSizes.length)}%`
    : '0%';

  return (
    <div
      style={{
        width: '210mm',
        minHeight: '297mm',
        padding: '10mm 12mm',
        margin: '0 auto',
        backgroundColor: '#fff',
        fontFamily:
          '"Noto Sans KR", "Pretendard", -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
        fontSize: '10px',
        color: '#000',
        boxSizing: 'border-box',
      }}
    >
      <style>{`
        @page {
          size: A4 portrait;
          margin: 0;
        }
        @media print {
          body, html {
            margin: 0;
            padding: 0;
          }
          .no-print {
            display: none !important;
          }
          table {
            border-collapse: collapse;
            page-break-inside: avoid;
          }
        }
      `}</style>

      {/* 제목 */}
      <div
        style={{
          textAlign: 'center',
          marginBottom: '2mm',
          fontSize: '22px',
          fontWeight: 'bold',
          letterSpacing: '-0.5px',
        }}
      >
        {mode === 'deposit' ? '계약 정산표' : '정산표'}
      </div>

      {/* 날짜 */}
      <div
        style={{
          textAlign: 'center',
          marginBottom: '4mm',
          fontSize: '12px',
          fontWeight: '500',
        }}
      >
        {dateStr}
      </div>

      {/* 상단 정보 */}
      <table
        style={{
          width: '100%',
          marginBottom: '5mm',
          borderCollapse: 'collapse',
          border: '1px solid #000',
          tableLayout: 'fixed',
        }}
      >
        <tbody>
          <tr>
            <td
              style={{
                width: '50%',
                padding: '1.5mm 4mm',
                border: '1px solid #000',
                backgroundColor: '#DCE6F1',
                fontWeight: '700',
                fontSize: '9px',
                textAlign: 'center',
              }}
            >
              생산품명 品名
            </td>
            <td
              style={{
                width: '50%',
                padding: '1.5mm 4mm',
                border: '1px solid #000',
                backgroundColor: '#DCE6F1',
                fontWeight: '700',
                fontSize: '9px',
                textAlign: 'center',
              }}
            >
              회사명 公司名
            </td>
          </tr>
          <tr>
            <td
              style={{
                padding: '5mm 4mm',
                border: '1px solid #000',
                fontSize: '10px',
                textAlign: 'center',
                fontWeight: '500',
              }}
            >
              {style}
            </td>
            <td
              style={{
                padding: '5mm 4mm',
                border: '1px solid #000',
                fontSize: '10px',
                textAlign: 'center',
                fontWeight: '500',
              }}
            >
              {vendor}
            </td>
          </tr>
        </tbody>
      </table>

      {/* 메인 테이블 */}
      <table
        style={{
          width: '100%',
          borderCollapse: 'collapse',
          border: '1px solid #000',
          tableLayout: 'fixed',
        }}
      >
        <colgroup>
          <col style={{ width: leftCategoryWidth }} />
          <col style={{ width: productWidth }} />
          {hasSizeColumns ? (
            visibleSizes.map((size) => <col key={size} style={{ width: perSizeWidth }} />)
          ) : (
            <col style={{ width: quantityWidthSingle }} />
          )}
          <col style={{ width: priceWidth }} />
          <col style={{ width: amountWidth }} />
          <col style={{ width: remarksWidth }} />
        </colgroup>

        <thead>
          <tr>
            <th
              rowSpan={2}
              style={{
                border: '1px solid #000',
                backgroundColor: '#DCE6F1',
                fontWeight: '700',
                fontSize: '9px',
                padding: '1.2mm 1mm',
                textAlign: 'center',
                verticalAlign: 'middle',
              }}
            >
              구분 分类
            </th>

            <th
              rowSpan={2}
              style={{
                border: '1px solid #000',
                backgroundColor: '#DCE6F1',
                fontWeight: '700',
                fontSize: '9px',
                padding: '1.2mm 1mm',
                textAlign: 'center',
                verticalAlign: 'middle',
              }}
            >
              품명 品名
            </th>

            <th
              colSpan={hasSizeColumns ? visibleSizes.length + 2 : 3}
              style={{
                border: '1px solid #000',
                backgroundColor: '#DCE6F1',
                fontWeight: '700',
                fontSize: '9px',
                padding: '1.2mm 1mm',
                textAlign: 'center',
                verticalAlign: 'middle',
              }}
            >
              내용 內容
            </th>

            <th
              rowSpan={2}
              style={{
                border: '1px solid #000',
                backgroundColor: '#DCE6F1',
                fontWeight: '700',
                fontSize: '9px',
                padding: '1.2mm 1mm',
                textAlign: 'center',
                verticalAlign: 'middle',
              }}
            >
              비고 备注
            </th>
          </tr>

          <tr>
            {hasSizeColumns ? (
              visibleSizes.map((size) => (
                <th
                  key={size}
                  style={{
                    border: '1px solid #000',
                    backgroundColor: '#DCE6F1',
                    fontWeight: '700',
                    fontSize: '9px',
                    padding: '1.2mm 1mm',
                    textAlign: 'center',
                  }}
                >
                  {size}
                </th>
              ))
            ) : (
              <th
                style={{
                  border: '1px solid #000',
                  backgroundColor: '#DCE6F1',
                  fontWeight: '700',
                  fontSize: '9px',
                  padding: '1.2mm 1mm',
                  textAlign: 'center',
                }}
              >
                수량 數量
              </th>
            )}

            <th
              style={{
                border: '1px solid #000',
                backgroundColor: '#DCE6F1',
                fontWeight: '700',
                fontSize: '9px',
                padding: '1.2mm 1mm',
                textAlign: 'center',
              }}
            >
              단가 单价
            </th>

            <th
              style={{
                border: '1px solid #000',
                backgroundColor: '#DCE6F1',
                fontWeight: '700',
                fontSize: '9px',
                padding: '1.2mm 1mm',
                textAlign: 'center',
              }}
            >
              금액 总价
            </th>
          </tr>
        </thead>

        <tbody>
          {rows.map((row, idx) => (
            <tr key={row.key} style={{ height: '16px' }}>
              {idx === 0 && (
                <td
                  rowSpan={BODY_ROW_COUNT + 1}
                  style={{
                    border: '1px solid #000',
                    backgroundColor: '#D9D9D9',
                  }}
                />
              )}

              <td
                style={{
                  border: '1px solid #000',
                  padding: '1mm 2mm',
                  fontSize: '9px',
                  textAlign: 'center',
                  verticalAlign: 'middle',
                  wordBreak: 'break-word',
                }}
              >
                {row.name}
              </td>

              {hasSizeColumns ? (
                visibleSizes.map((size) => (
                  <td
                    key={size}
                    style={{
                      border: '1px solid #000',
                      padding: '1mm 1mm',
                      fontSize: '9px',
                      textAlign: 'right',
                      verticalAlign: 'middle',
                    }}
                  >
                    {row.quantities[size] || ''}
                  </td>
                ))
              ) : (
                <td
                  style={{
                    border: '1px solid #000',
                    padding: '1mm 2mm',
                    fontSize: '9px',
                    textAlign: 'right',
                    verticalAlign: 'middle',
                  }}
                >
                  {row.freeQuantity || ''}
                </td>
              )}

              <td
                style={{
                  border: '1px solid #000',
                  padding: '1mm 2mm',
                  fontSize: '9px',
                  textAlign: 'right',
                  verticalAlign: 'middle',
                  whiteSpace: 'pre-wrap',
                  lineHeight: '1.25',
                }}
              >
                {getUnitPriceLabel(row, visibleSizes)}
              </td>

              <td
                style={{
                  border: '1px solid #000',
                  padding: '1mm 2mm',
                  fontSize: '9px',
                  textAlign: 'right',
                  verticalAlign: 'middle',
                  fontWeight: '600',
                }}
              >
                {formatCurrency(row.totalAmount)}
              </td>

              <td
                style={{
                  border: '1px solid #000',
                  padding: '1mm 2mm',
                  fontSize: '9px',
                  textAlign: 'center',
                  verticalAlign: 'middle',
                  wordBreak: 'break-word',
                }}
              >
                {row.remarks || ''}
              </td>
            </tr>
          ))}

          {Array.from({ length: emptyRowCount }).map((_, idx) => (
            <tr key={`empty-${idx}`} style={{ height: '16px' }}>
              <td style={{ border: '1px solid #000' }} />
              {hasSizeColumns ? (
                visibleSizes.map((size) => (
                  <td key={size} style={{ border: '1px solid #000' }} />
                ))
              ) : (
                <td style={{ border: '1px solid #000' }} />
              )}
              <td style={{ border: '1px solid #000' }} />
              <td style={{ border: '1px solid #000' }} />
              <td style={{ border: '1px solid #000' }} />
            </tr>
          ))}

          <tr style={{ height: '16px' }}>
            <td style={{ border: '1px solid #000' }} />
            {hasSizeColumns ? (
              visibleSizes.map((size) => (
                <td key={size} style={{ border: '1px solid #000' }} />
              ))
            ) : (
              <td style={{ border: '1px solid #000' }} />
            )}
            <td style={{ border: '1px solid #000' }} />
            <td style={{ border: '1px solid #000' }} />
            <td style={{ border: '1px solid #000' }} />
          </tr>

          <tr style={{ backgroundColor: '#F7E7A9' }}>
            <td
              colSpan={2}
              style={{
                border: '1px solid #000',
                padding: '1.5mm 2mm',
                fontWeight: '700',
                fontSize: '9px',
                textAlign: 'center',
              }}
            >
              총액 总額
            </td>
            <td
              colSpan={hasSizeColumns ? visibleSizes.length + 2 : 3}
              style={{
                border: '1px solid #000',
                padding: '1.5mm 4mm',
                fontWeight: '700',
                fontSize: '9px',
                textAlign: 'right',
              }}
            >
              {formatCurrency(totalAmount)}
            </td>
            <td style={{ border: '1px solid #000' }} />
          </tr>

          <tr style={{ backgroundColor: '#F7E7A9' }}>
            <td
              colSpan={2}
              style={{
                border: '1px solid #000',
                padding: '1.5mm 2mm',
                fontWeight: '700',
                fontSize: '9px',
                textAlign: 'center',
              }}
            >
              계약금 定金
            </td>
            <td
              colSpan={hasSizeColumns ? visibleSizes.length + 2 : 3}
              style={{
                border: '1px solid #000',
                padding: '1.5mm 4mm',
                fontWeight: '700',
                fontSize: '9px',
                textAlign: 'right',
              }}
            >
              {formatCurrency(deposit)}
            </td>
            <td style={{ border: '1px solid #000' }} />
          </tr>

          <tr style={{ backgroundColor: '#FFC000' }}>
            <td
              colSpan={2}
              style={{
                border: '1px solid #000',
                padding: '1.5mm 2mm',
                fontWeight: '700',
                fontSize: '9px',
                textAlign: 'center',
              }}
            >
              잔금 尾款
            </td>
            <td
              colSpan={hasSizeColumns ? visibleSizes.length + 2 : 3}
              style={{
                border: '1px solid #000',
                padding: '1.5mm 4mm',
                fontWeight: '700',
                fontSize: '9px',
                textAlign: 'right',
              }}
            >
              {formatCurrency(balance)}
            </td>
            <td style={{ border: '1px solid #000' }} />
          </tr>
        </tbody>
      </table>

      {/* 푸터 */}
      <div
        style={{
          marginTop: '3mm',
          paddingTop: '2mm',
          paddingBottom: '2mm',
          fontSize: '8px',
          textAlign: 'center',
          color: '#333',
          borderTop: '1px solid #000',
        }}
      >
        <div style={{ marginBottom: '1mm' }}>(VAT 별도)</div>
        <div>하나은행 357-910040-73404 칸컬쳐 주식회사</div>
      </div>
    </div>
  );
}