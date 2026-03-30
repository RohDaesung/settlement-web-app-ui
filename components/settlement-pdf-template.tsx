'use client';

import { SettlementItem } from '@/lib/types';

interface SettlementPDFTemplateProps {
  productName: string;
  companyName: string;
  date: string;
  items: SettlementItem[];
  totalAmount: number;
  depositAmount: number;
  balanceAmount: number;
  remarks?: string;
  isDepositLocked?: boolean;
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

function getSingleLineRemarkFontSize(remark: string) {
  const length = (remark || '').trim().length;

  if (length <= 8) return '9px';
  if (length <= 14) return '8px';
  if (length <= 20) return '7px';
  if (length <= 28) return '6px';
  if (length <= 36) return '5px';
  return '4.2px';
}

export function SettlementPDFTemplate({
  productName,
  companyName,
  date,
  items,
  totalAmount,
  depositAmount,
  balanceAmount,
  remarks,
  isDepositLocked = false,
}: SettlementPDFTemplateProps) {
  const visibleSizes = getVisibleSizes(items);
  const hasSizeColumns = visibleSizes.length > 0;
  const rows = buildPrintRows(items, visibleSizes);
  const emptyRowCount = Math.max(0, BODY_ROW_COUNT - rows.length);

  const leftCategoryWidth = '7%';
  const productWidth = hasSizeColumns ? '21%' : '22%';
  const remarksWidth = '12%';
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
    <>
      <style>{`
        @media print {
          body {
            margin: 0;
            padding: 0;
          }
          #settlement-pdf-content {
            margin: 0;
            padding: 0;
            page-break-after: avoid;
          }
          table {
            page-break-inside: avoid;
          }
        }
      `}</style>

      <div
        id="settlement-pdf-content"
        style={{
          width: '100%',
          maxWidth: '210mm',
          minHeight: '297mm',
          padding: '10mm 12mm',
          margin: '0 auto',
          backgroundColor: '#fff',
          fontFamily:
            '"Noto Sans KR", "Pretendard", -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
          fontSize: '10px',
          color: '#000',
          boxSizing: 'border-box',
          display: 'flex',
          flexDirection: 'column',
        }}
      >
        <div
          style={{
            textAlign: 'center',
            marginBottom: '2mm',
            fontSize: '22px',
            fontWeight: 'bold',
            letterSpacing: '-0.5px',
          }}
        >
          {isDepositLocked ? '정산표' : '계약 정산표'}
        </div>

        <div
          style={{
            textAlign: 'center',
            marginBottom: '4mm',
            fontSize: '12px',
            fontWeight: '500',
          }}
        >
          {date}
        </div>

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
                {productName}
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
                {companyName}
              </td>
            </tr>
          </tbody>
        </table>

        <table
          style={{
            width: '100%',
            borderCollapse: 'collapse',
            border: '1px solid #000',
            tableLayout: 'fixed',
            flex: 1,
          }}
        >
          <colgroup>
            <col style={{ width: leftCategoryWidth }} />
            <col style={{ width: productWidth }} />

            {hasSizeColumns ? (
              visibleSizes.map((size) => (
                <col key={size} style={{ width: perSizeWidth }} />
              ))
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
                    padding: '0.3mm 0.5mm',
                    fontSize: getSingleLineRemarkFontSize(row.remarks),
                    textAlign: 'center',
                    verticalAlign: 'middle',
                    whiteSpace: 'nowrap',
                    overflow: 'visible',
                    lineHeight: '1',
                    letterSpacing: '-0.2px',
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

            <tr style={{ backgroundColor: '#F7E7A9', height: '16px' }}>
              <td
                colSpan={2}
                style={{
                  border: '1px solid #000',
                  padding: '1mm 2mm',
                  fontWeight: '700',
                  fontSize: '9px',
                  textAlign: 'center',
                  verticalAlign: 'middle',
                }}
              >
                총액 总額
              </td>
              <td
                colSpan={hasSizeColumns ? visibleSizes.length + 2 : 3}
                style={{
                  border: '1px solid #000',
                  padding: '1mm 4mm',
                  fontWeight: '700',
                  fontSize: '9px',
                  textAlign: 'right',
                  verticalAlign: 'middle',
                }}
              >
                {formatCurrency(totalAmount)}
              </td>
              <td style={{ border: '1px solid #000' }} />
            </tr>

            <tr style={{ backgroundColor: '#F7E7A9', height: '16px' }}>
              <td
                colSpan={2}
                style={{
                  border: '1px solid #000',
                  padding: '1mm 2mm',
                  fontWeight: '700',
                  fontSize: '9px',
                  textAlign: 'center',
                  verticalAlign: 'middle',
                }}
              >
                계약금 定金
              </td>
              <td
                colSpan={hasSizeColumns ? visibleSizes.length + 2 : 3}
                style={{
                  border: '1px solid #000',
                  padding: '1mm 4mm',
                  fontWeight: '700',
                  fontSize: '9px',
                  textAlign: 'right',
                  verticalAlign: 'middle',
                }}
              >
                {formatCurrency(depositAmount)}
              </td>
              <td style={{ border: '1px solid #000' }} />
            </tr>

            <tr style={{ backgroundColor: '#FFC000', height: '16px' }}>
              <td
                colSpan={2}
                style={{
                  border: '1px solid #000',
                  padding: '1mm 2mm',
                  fontWeight: '700',
                  fontSize: '9px',
                  textAlign: 'center',
                  verticalAlign: 'middle',
                }}
              >
                잔금 尾款
              </td>
              <td
                colSpan={hasSizeColumns ? visibleSizes.length + 2 : 3}
                style={{
                  border: '1px solid #000',
                  padding: '1mm 4mm',
                  fontWeight: '700',
                  fontSize: '9px',
                  textAlign: 'right',
                  verticalAlign: 'middle',
                }}
              >
                {formatCurrency(balanceAmount)}
              </td>
              <td style={{ border: '1px solid #000' }} />
            </tr>
          </tbody>
        </table>

        <div
          style={{
            marginTop: '3mm',
            paddingTop: '2mm',
            paddingBottom: '2mm',
            fontSize: '8.5px',
            textAlign: 'center',
            color: '#111',
            borderTop: '1px solid #000',
            fontWeight: 600,
            lineHeight: '1.6',
          }}
        >
          <div style={{ marginBottom: '1mm', fontWeight: 700 }}>칸 어패럴</div>
          <div style={{ fontWeight: 600 }}>
            하나은행 357-910040-73404 칸컬쳐 주식회사 (VAT 별도)
          </div>
        </div>

        {remarks && (
          <div
            style={{
              marginTop: '4mm',
              padding: '2mm 4mm',
              border: '1px solid #000',
              fontSize: '9px',
              lineHeight: '1.6',
            }}
          >
            <div style={{ fontWeight: '700', marginBottom: '2mm' }}>
              비고 (Remarks):
            </div>
            <div style={{ whiteSpace: 'pre-wrap', wordBreak: 'break-word' }}>
              {remarks}
            </div>
          </div>
        )}
      </div>
    </>
  );
}