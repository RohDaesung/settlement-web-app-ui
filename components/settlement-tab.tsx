'use client';

import React, { useEffect, useMemo, useRef, useState } from 'react';
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
import { Plus, Trash2, FileDown, Eye, EyeOff, Save } from 'lucide-react';
import type { RoundData, SettlementItem } from '@/lib/types';
import { SettlementPDFTemplate } from './settlement-pdf-template';
import { supabase } from '@/lib/supabase/client';

interface SettlementTabProps {
  round: RoundData;
  vendorName: string;
  styleName: string;
  onUpdate: (round: RoundData) => void;
}

const INTERNAL_FREE_SIZE = 'FREE';

type SettlementItemRow = {
  id: string;
  round_id: string;
  color: string | null;
  size: string | null;
  remarks: string | null;
  quantity: number | null;
  unit_price: number | null;
  amount: number | null;
  is_deposit: boolean | null;
  sort_order: number | null;
};

type PivotRow = {
  id: string;
  name: string;
  baseUnitPrice: number;
  remarks: string;
  freeQuantity: number;
  quantities: Record<string, number>;
  unitPricesBySize: Record<string, number | ''>;
  useSizePriceOverrides: boolean;
};

function makeRow(): PivotRow {
  return {
    id: `row-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    name: '',
    baseUnitPrice: 0,
    remarks: '',
    freeQuantity: 0,
    quantities: {},
    unitPricesBySize: {},
    useSizePriceOverrides: false,
  };
}

function uniqueSizeList(items: SettlementItem[]): string[] {
  const set = new Set<string>();

  for (const item of items) {
    const size = (item.size || '').trim();
    if (!size || size === INTERNAL_FREE_SIZE) continue;
    set.add(size);
  }

  return Array.from(set);
}

function getEffectiveUnitPrice(row: PivotRow, size?: string): number {
  if (!size || size === INTERNAL_FREE_SIZE) {
    return Number(row.baseUnitPrice || 0);
  }

  if (!row.useSizePriceOverrides) {
    return Number(row.baseUnitPrice || 0);
  }

  const override = row.unitPricesBySize[size];
  if (override === '' || override === undefined || override === null) {
    return Number(row.baseUnitPrice || 0);
  }

  return Number(override || 0);
}

function getRowTotal(row: PivotRow, visibleSizes: string[]): number {
  if (visibleSizes.length === 0) {
    return Number(row.freeQuantity || 0) * Number(row.baseUnitPrice || 0);
  }

  return visibleSizes.reduce((sum, size) => {
    const qty = Number(row.quantities[size] || 0);
    const price = getEffectiveUnitPrice(row, size);
    return sum + qty * price;
  }, 0);
}

function itemsToPivotRows(
  items: SettlementItem[],
  visibleSizes: string[]
): PivotRow[] {
  const map = new Map<string, PivotRow>();

  for (const item of items) {
    const name = item.name || '';
    const remarks = item.remarks || '';
    const size = (item.size || '').trim() || INTERNAL_FREE_SIZE;
    const quantity = Number(item.quantity || 0);
    const unitPrice = Number(item.unitPrice || 0);

    const key = `${name}__${remarks}`;

    if (!map.has(key)) {
      const row = makeRow();
      row.id = item.id || row.id;
      row.name = name;
      row.baseUnitPrice = unitPrice;
      row.remarks = remarks;

      visibleSizes.forEach((s) => {
        row.quantities[s] = 0;
        row.unitPricesBySize[s] = '';
      });

      map.set(key, row);
    }

    const row = map.get(key)!;

    if (size === INTERNAL_FREE_SIZE) {
      row.freeQuantity += quantity;
      if (!row.baseUnitPrice) {
        row.baseUnitPrice = unitPrice;
      }
      continue;
    }

    row.quantities[size] = Number(row.quantities[size] || 0) + quantity;

    if (row.baseUnitPrice === 0) {
      row.baseUnitPrice = unitPrice;
    }

    if (unitPrice !== row.baseUnitPrice) {
      row.useSizePriceOverrides = true;
      row.unitPricesBySize[size] = unitPrice;
    } else if (!(size in row.unitPricesBySize)) {
      row.unitPricesBySize[size] = '';
    }
  }

  for (const row of map.values()) {
    if (row.useSizePriceOverrides) {
      visibleSizes.forEach((size) => {
        const hasQty = Number(row.quantities[size] || 0) > 0;
        if (
          hasQty &&
          (row.unitPricesBySize[size] === '' ||
            row.unitPricesBySize[size] === undefined)
        ) {
          row.unitPricesBySize[size] = row.baseUnitPrice;
        }
      });
    }
  }

  return Array.from(map.values());
}

function pivotRowsToItems(
  rows: PivotRow[],
  visibleSizes: string[]
): SettlementItem[] {
  const result: SettlementItem[] = [];

  for (const row of rows) {
    const name = row.name?.trim() || '';
    const remarks = row.remarks || '';

    if (!name) continue;

    if (visibleSizes.length === 0) {
      result.push({
        id: row.id,
        name,
        size: INTERNAL_FREE_SIZE,
        quantity: Number(row.freeQuantity || 0),
        unitPrice: Number(row.baseUnitPrice || 0),
        remarks,
      });
      continue;
    }

    visibleSizes.forEach((size) => {
      const quantity = Number(row.quantities[size] || 0);
      if (quantity <= 0) return;

      const unitPrice = getEffectiveUnitPrice(row, size);

      result.push({
        id: `${row.id}-${size}`,
        name,
        size,
        quantity,
        unitPrice,
        remarks,
      });
    });
  }

  return result;
}

function formatDateToDisplay(dateString?: string | null): string {
  if (!dateString) return '';

  const date = new Date(dateString);
  if (Number.isNaN(date.getTime())) return '';

  const yy = String(date.getFullYear()).slice(-2);
  const mm = String(date.getMonth() + 1).padStart(2, '0');
  const dd = String(date.getDate()).padStart(2, '0');

  return `${yy}.${mm}.${dd}`;
}

function todayDisplayDate(): string {
  const d = new Date();
  return `${String(d.getFullYear()).slice(-2)}.${String(
    d.getMonth() + 1
  ).padStart(2, '0')}.${String(d.getDate()).padStart(2, '0')}`;
}

function displayDateToInputValue(date: string): string {
  const parts = date.split('.');
  if (parts.length !== 3) return '';

  const yy = parts[0];
  const yyyy = parseInt(yy, 10) > 50 ? `19${yy}` : `20${yy}`;
  return `${yyyy}-${parts[1]}-${parts[2]}`;
}

function displayDateToDbValue(date: string): string | null {
  const parts = date.split('.');
  if (parts.length !== 3) return null;

  const yy = parts[0];
  const yyyy = parseInt(yy, 10) > 50 ? `19${yy}` : `20${yy}`;
  const mm = parts[1];
  const dd = parts[2];

  if (!yyyy || !mm || !dd) return null;
  return `${yyyy}-${mm}-${dd}`;
}

export function SettlementTab({
  round,
  vendorName,
  styleName,
  onUpdate,
}: SettlementTabProps) {
  const roundId = (round as any)?.id as string | undefined;

  const [pivotRows, setPivotRows] = useState<PivotRow[]>([]);
  const [sizeColumns, setSizeColumns] = useState<string[]>([]);
  const [remarks, setRemarks] = useState((round as any)?.remarks || '');
  const [productName, setProductName] = useState(styleName || '');
  const [showPreview, setShowPreview] = useState(false);
  const [isDepositLocked, setIsDepositLocked] = useState(
    (round as any)?.depositLocked || false
  );
  const [date, setDate] = useState(todayDisplayDate());

  const [isLoading, setIsLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  const fetchSeq = useRef(0);

  const depositItems = useMemo(() => {
    return pivotRowsToItems(pivotRows, sizeColumns);
  }, [pivotRows, sizeColumns]);

  const depositTabTotalAmount = useMemo(() => {
    return pivotRows.reduce(
      (sum, row) => sum + getRowTotal(row, sizeColumns),
      0
    );
  }, [pivotRows, sizeColumns]);

  const depositTabDepositAmount = useMemo(() => {
    const locked = (round as any)?.lockedDepositAmount as number | undefined;
    return isDepositLocked && locked !== undefined
      ? locked
      : Math.round(depositTabTotalAmount * 0.4);
  }, [depositTabTotalAmount, isDepositLocked, round]);

  const depositTabBalanceAmount = useMemo(() => {
    return depositTabTotalAmount - depositTabDepositAmount;
  }, [depositTabTotalAmount, depositTabDepositAmount]);

  const syncRound = () => {
    const updatedRound: RoundData = {
      ...(round as any),
      depositItems,
      items: depositItems,
      totalAmount: depositTabTotalAmount,
      depositAmount: depositTabDepositAmount,
      balanceAmount: depositTabBalanceAmount,
      depositLocked: isDepositLocked,
      lockedDepositAmount: isDepositLocked
        ? depositTabDepositAmount
        : undefined,
      remarks,
    } as any;

    onUpdate(updatedRound);
  };

  useEffect(() => {
    syncRound();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [depositItems, remarks, depositTabDepositAmount, isDepositLocked]);

  useEffect(() => {
    setRemarks((round as any)?.remarks || '');
    setProductName(styleName || '');
    setIsDepositLocked((round as any)?.depositLocked || false);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [roundId, styleName]);

  useEffect(() => {
    if (!roundId) {
      setPivotRows([]);
      setSizeColumns([]);
      setDate(todayDisplayDate());
      return;
    }

    const seq = ++fetchSeq.current;
    setIsLoading(true);

    (async () => {
      const { data: itemsData, error: itemsError } = await supabase
        .from('settlement_items')
        .select(
          'id, round_id, color, size, remarks, quantity, unit_price, amount, is_deposit, sort_order'
        )
        .eq('round_id', roundId)
        .order('sort_order', { ascending: true });

      if (seq !== fetchSeq.current) return;

      if (itemsError) {
        console.error('[settlement-tab] load settlement_items error:', itemsError);
        setPivotRows([]);
        setSizeColumns([]);
        setDate(todayDisplayDate());
        setIsLoading(false);
        return;
      }

      const rows = (itemsData || []) as SettlementItemRow[];

      const normalizedItems: SettlementItem[] = rows.map((r) => ({
        id: r.id,
        name: r.color ?? '',
        size: r.size && r.size.trim() ? r.size.trim() : INTERNAL_FREE_SIZE,
        quantity: r.quantity ?? 0,
        unitPrice: r.unit_price ?? 0,
        remarks: r.remarks ?? '',
      }));

      const detectedSizes = uniqueSizeList(normalizedItems);
      const pivot = itemsToPivotRows(normalizedItems, detectedSizes);

      setSizeColumns(detectedSizes);
      setPivotRows(pivot);

      const { error: summaryError } = await supabase
        .from('round_summaries')
        .select('round_id, total_amount, deposit_amount, balance_amount')
        .eq('round_id', roundId)
        .maybeSingle();

      if (summaryError && (summaryError as any).code !== 'PGRST116') {
        console.warn('[settlement-tab] load round_summaries warn:', summaryError);
      }

      const { data: marginRow, error: marginRowError } = await supabase
        .from('margin_rows')
        .select('shipping_date')
        .eq('round_id', roundId)
        .maybeSingle();

      if (marginRowError && (marginRowError as any).code !== 'PGRST116') {
        console.warn('[settlement-tab] load margin_rows warn:', marginRowError);
      }

      const loadedDate = formatDateToDisplay(marginRow?.shipping_date);
      setDate(loadedDate || todayDisplayDate());

      setIsLoading(false);
    })();
  }, [roundId]);

  const handleAddRow = () => {
    const newRow = makeRow();

    sizeColumns.forEach((size) => {
      newRow.quantities[size] = 0;
      newRow.unitPricesBySize[size] = '';
    });

    setPivotRows((prev) => [...prev, newRow]);
  };

  const handleRemoveRow = (rowId: string) => {
    setPivotRows((prev) => prev.filter((row) => row.id !== rowId));
  };

  const handleUpdateRow = (
    rowId: string,
    field:
      | 'name'
      | 'baseUnitPrice'
      | 'remarks'
      | 'freeQuantity'
      | 'useSizePriceOverrides',
    value: string | number | boolean
  ) => {
    setPivotRows((prev) =>
      prev.map((row) => {
        if (row.id !== rowId) return row;
        return { ...row, [field]: value } as PivotRow;
      })
    );
  };

  const handleUpdateSizeQuantity = (
    rowId: string,
    size: string,
    quantity: number
  ) => {
    setPivotRows((prev) =>
      prev.map((row) => {
        if (row.id !== rowId) return row;
        return {
          ...row,
          quantities: {
            ...row.quantities,
            [size]: quantity,
          },
        };
      })
    );
  };

  const handleUpdateSizeUnitPrice = (
    rowId: string,
    size: string,
    unitPrice: number | ''
  ) => {
    setPivotRows((prev) =>
      prev.map((row) => {
        if (row.id !== rowId) return row;
        return {
          ...row,
          unitPricesBySize: {
            ...row.unitPricesBySize,
            [size]: unitPrice,
          },
        };
      })
    );
  };

  const handleAddSizeColumn = () => {
    const raw = window.prompt('추가할 사이즈명을 입력하세요. 예: S, M, L, XL');
    const next = (raw || '').trim().toUpperCase();

    if (!next) return;
    if (next === INTERNAL_FREE_SIZE) {
      alert('FREE는 화면에서 직접 추가하지 않습니다.');
      return;
    }
    if (sizeColumns.includes(next)) {
      alert('이미 존재하는 사이즈입니다.');
      return;
    }

    setSizeColumns((prev) => [...prev, next]);
    setPivotRows((prev) =>
      prev.map((row) => ({
        ...row,
        quantities: {
          ...row.quantities,
          [next]: 0,
        },
        unitPricesBySize: {
          ...row.unitPricesBySize,
          [next]: '',
        },
      }))
    );
  };

  const handleRemoveSizeColumn = (size: string) => {
    const hasValues = pivotRows.some(
      (row) => Number(row.quantities[size] || 0) > 0
    );
    if (hasValues) {
      const ok = window.confirm(
        `${size} 사이즈 수량이 있습니다. 컬럼을 삭제하면 해당 수량도 함께 제거됩니다. 계속할까요?`
      );
      if (!ok) return;
    }

    setSizeColumns((prev) => prev.filter((s) => s !== size));
    setPivotRows((prev) =>
      prev.map((row) => {
        const nextQuantities = { ...row.quantities };
        const nextUnitPrices = { ...row.unitPricesBySize };
        delete nextQuantities[size];
        delete nextUnitPrices[size];
        return {
          ...row,
          quantities: nextQuantities,
          unitPricesBySize: nextUnitPrices,
        };
      })
    );
  };

  const handleLockDeposit = () => setIsDepositLocked(true);
  const handleUnlockDeposit = () => setIsDepositLocked(false);

  const handleSave = async () => {
    if (!roundId) {
      alert('차수를 먼저 선택해주세요.');
      return;
    }

    setIsSaving(true);

    try {
      const { error: delError } = await supabase
        .from('settlement_items')
        .delete()
        .eq('round_id', roundId);

      if (delError) {
        console.error('[settlement-tab] delete settlement_items error:', delError);
        alert('저장 중 오류가 발생했습니다. (items delete)');
        return;
      }

      const normalizedItems = pivotRowsToItems(pivotRows, sizeColumns);

      const payload = normalizedItems.map((item, idx) => {
        const quantity = Number(item.quantity || 0);
        const unitPrice = Number(item.unitPrice || 0);
        const amount = quantity * unitPrice;

        return {
          round_id: roundId,
          color: item.name || '',
          size:
            item.size && item.size.trim()
              ? item.size.trim()
              : INTERNAL_FREE_SIZE,
          remarks: item.remarks || '',
          quantity,
          unit_price: unitPrice,
          amount,
          is_deposit: false,
          sort_order: idx,
        };
      });

      if (payload.length > 0) {
        const { error: insError } = await supabase
          .from('settlement_items')
          .insert(payload);

        if (insError) {
          console.error('[settlement-tab] insert settlement_items error:', insError);
          alert('저장 중 오류가 발생했습니다. (items insert)');
          return;
        }
      }

      const summaryUpsert = {
        round_id: roundId,
        total_amount: Math.round(depositTabTotalAmount),
        deposit_amount: Math.round(depositTabDepositAmount),
        balance_amount: Math.round(depositTabBalanceAmount),
      };

      const { error: sumError } = await supabase
        .from('round_summaries')
        .upsert(summaryUpsert, { onConflict: 'round_id' });

      if (sumError) {
        console.error('[settlement-tab] upsert round_summaries error:', sumError);
        alert('저장 중 오류가 발생했습니다. (summary)');
        return;
      }

      const unitPrices = depositItems
        .map((item) => Number(item.unitPrice || 0))
        .filter((price) => price > 0);

      const sellingPrice =
        unitPrices.length > 0
          ? Math.round(
              unitPrices.reduce((sum, price) => sum + price, 0) /
                unitPrices.length
            )
          : 0;

      const shippingDateForDb = displayDateToDbValue(date);

      const { error: marginError } = await supabase
        .from('margin_rows')
        .upsert(
          {
            round_id: roundId,
            selling_price: sellingPrice,
            shipping_date: shippingDateForDb,
          },
          { onConflict: 'round_id' }
        );

      if (marginError) {
        console.error('[settlement-tab] upsert margin_rows error:', marginError);
        alert('저장 중 오류가 발생했습니다. (margin_rows)');
        return;
      }

      syncRound();
      alert('저장되었습니다.');
    } finally {
      setIsSaving(false);
    }
  };

  const handleExportPDF = () => {
    try {
      const element = document.getElementById('settlement-pdf-content');

      if (!element) {
        alert('미리보기를 먼저 표시해주세요.');
        return;
      }

      const printWindow = window.open('', '_blank');
      if (!printWindow) {
        alert('팝업 차단이 활성화되어 있습니다. 팝업을 허용해주세요.');
        return;
      }

      const clonedElement = element.cloneNode(true) as HTMLElement;
      const allElements = clonedElement.querySelectorAll('*');

      allElements.forEach((el) => {
        const computed = window.getComputedStyle(el as Element);
        const styles: string[] = [];

        for (let i = 0; i < computed.length; i++) {
          const prop = computed[i];
          const value = computed.getPropertyValue(prop);
          if (value) styles.push(`${prop}: ${value}`);
        }

        if (styles.length > 0) {
          (el as HTMLElement).setAttribute('style', styles.join('; '));
        }
      });

      const typeLabel = '정산표';
      printWindow.document.write(`
        <!DOCTYPE html>
        <html>
        <head>
          <meta charset="UTF-8">
          <title>${typeLabel}_${new Date().toISOString().slice(0, 10)}</title>
          <style>
            @page {
              size: A4;
              margin: 0;
            }
            body {
              margin: 0;
              padding: 0;
            }
          </style>
        </head>
        <body>
          ${clonedElement.outerHTML}
          <script>
            window.onload = function() {
              window.print();
              window.close();
            };
          </script>
        </body>
        </html>
      `);
      printWindow.document.close();
    } catch (error) {
      console.error('[v0] PDF export error:', error);
      alert('PDF 저장에 실패했습니다.');
    }
  };

  return (
    <div className="space-y-4 sm:space-y-6">
      <div className="border-b border-gray-200 pb-3 sm:pb-6">
        <div className="flex items-center justify-between gap-3">
          <div>
            <h2 className="text-xl sm:text-2xl font-semibold text-gray-900 mb-1 sm:mb-2">
              정산표
            </h2>
            <p className="text-xs sm:text-sm text-gray-600">
              {styleName} / {vendorName}
            </p>
          </div>

          <div className="flex items-center gap-2">
            <Button
              onClick={handleSave}
              disabled={isSaving || isLoading || !roundId}
              className="gap-1 sm:gap-2 bg-gray-900 hover:bg-gray-800 text-xs sm:text-sm"
            >
              <Save className="w-3 h-3 sm:w-4 sm:h-4" />
              {isSaving ? '저장 중…' : '저장'}
            </Button>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
        <div>
          <label className="text-xs sm:text-sm text-gray-600 block mb-2 font-medium">
            생산품명 (PDF)
          </label>
          <Input
            value={productName}
            onChange={(e) => setProductName(e.target.value)}
            placeholder="생산품명을 입력하세요"
            className="text-sm"
            disabled={isSaving}
          />
        </div>

        <div>
          <label className="text-xs sm:text-sm text-gray-600 block mb-2 font-medium">
            날짜
          </label>
          <Input
            type="date"
            value={displayDateToInputValue(date)}
            onChange={(e) => {
              if (e.target.value) {
                const [yyyy, mm, dd] = e.target.value.split('-');
                const yy = yyyy.slice(-2);
                setDate(`${yy}.${mm}.${dd}`);
              } else {
                setDate('');
              }
            }}
            className="text-sm"
            disabled={isSaving}
          />
        </div>
      </div>

      <div className="bg-purple-50 rounded-lg p-3 sm:p-6 border border-purple-200">
        <div className="flex items-center justify-between mb-3 sm:mb-4 flex-wrap gap-2">
          <h3 className="text-base sm:text-lg font-semibold text-purple-900">
            정산 항목
          </h3>
          <div className="flex items-center gap-2">
            <Button
              onClick={handleAddSizeColumn}
              size="sm"
              variant="outline"
              className="gap-1 sm:gap-2 text-xs"
              disabled={isSaving || isLoading}
            >
              <Plus className="w-3 h-3 sm:w-4 sm:h-4" />
              사이즈 추가
            </Button>
            <Button
              onClick={handleAddRow}
              size="sm"
              variant="outline"
              className="gap-1 sm:gap-2 text-xs"
              disabled={isSaving || isLoading}
            >
              <Plus className="w-3 h-3 sm:w-4 sm:h-4" />
              상품 추가
            </Button>
          </div>
        </div>

        {sizeColumns.length > 0 && (
          <div className="mb-3 flex flex-wrap gap-2">
            {sizeColumns.map((size) => (
              <div
                key={size}
                className="inline-flex items-center gap-2 rounded border bg-white px-2 py-1 text-xs"
              >
                <span>{size}</span>
                <button
                  type="button"
                  onClick={() => handleRemoveSizeColumn(size)}
                  className="text-red-600 hover:text-red-800"
                  disabled={isSaving}
                >
                  ×
                </button>
              </div>
            ))}
          </div>
        )}

        <div className="mb-3 sm:mb-4">
          {isLoading ? (
            <div className="bg-gray-50 p-4 sm:p-6 rounded border border-gray-200 text-center text-gray-500 text-xs sm:text-sm">
              불러오는 중…
            </div>
          ) : pivotRows.length === 0 ? (
            <div className="bg-gray-50 p-4 sm:p-6 rounded border border-gray-200 text-center text-gray-500 text-xs sm:text-sm">
              상품을 추가해주세요
            </div>
          ) : (
            <>
              <div className="block sm:hidden space-y-3">
                {pivotRows.map((row) => (
                  <div
                    key={row.id}
                    className="bg-white border border-purple-200 rounded-lg p-3 space-y-3"
                  >
                    <div className="flex justify-between items-center">
                      <span className="text-xs font-semibold text-purple-900">
                        상품
                      </span>
                      <button
                        onClick={() => handleRemoveRow(row.id)}
                        className="text-red-600 hover:text-red-800 disabled:text-gray-300"
                        disabled={isSaving}
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>

                    <div>
                      <label className="text-xs text-gray-600 block mb-1">
                        상품명
                      </label>
                      <Input
                        value={row.name}
                        onChange={(e) =>
                          handleUpdateRow(row.id, 'name', e.target.value)
                        }
                        placeholder="상품명"
                        className="text-sm"
                        disabled={isSaving}
                      />
                    </div>

                    {sizeColumns.length === 0 ? (
                      <div>
                        <label className="text-xs text-gray-600 block mb-1">
                          수량
                        </label>
                        <Input
                          type="number"
                          value={row.freeQuantity}
                          onChange={(e) =>
                            handleUpdateRow(
                              row.id,
                              'freeQuantity',
                              parseInt(e.target.value) || 0
                            )
                          }
                          className="text-sm"
                          disabled={isSaving}
                        />
                      </div>
                    ) : (
                      <>
                        <div className="flex items-center justify-between">
                          <label className="text-xs text-gray-600">
                            사이즈별 수량
                          </label>
                          <button
                            type="button"
                            className="text-xs text-blue-600"
                            onClick={() =>
                              handleUpdateRow(
                                row.id,
                                'useSizePriceOverrides',
                                !row.useSizePriceOverrides
                              )
                            }
                          >
                            {row.useSizePriceOverrides
                              ? '사이즈별 단가 숨기기'
                              : '사이즈별 단가 설정'}
                          </button>
                        </div>

                        <div className="space-y-2">
                          {sizeColumns.map((size) => (
                            <div key={size} className="grid grid-cols-2 gap-2">
                              <div>
                                <label className="text-xs text-gray-600 block mb-1">
                                  {size} 수량
                                </label>
                                <Input
                                  type="number"
                                  value={row.quantities[size] || 0}
                                  onChange={(e) =>
                                    handleUpdateSizeQuantity(
                                      row.id,
                                      size,
                                      parseInt(e.target.value) || 0
                                    )
                                  }
                                  className="text-sm"
                                  disabled={isSaving}
                                />
                              </div>

                              {row.useSizePriceOverrides ? (
                                <div>
                                  <label className="text-xs text-gray-600 block mb-1">
                                    {size} 단가
                                  </label>
                                  <Input
                                    type="number"
                                    value={
                                      row.unitPricesBySize[size] === ''
                                        ? ''
                                        : row.unitPricesBySize[size] ?? ''
                                    }
                                    onChange={(e) =>
                                      handleUpdateSizeUnitPrice(
                                        row.id,
                                        size,
                                        e.target.value === ''
                                          ? ''
                                          : parseInt(e.target.value) || 0
                                      )
                                    }
                                    placeholder={`${row.baseUnitPrice}`}
                                    className="text-sm"
                                    disabled={isSaving}
                                  />
                                </div>
                              ) : null}
                            </div>
                          ))}
                        </div>
                      </>
                    )}

                    <div>
                      <label className="text-xs text-gray-600 block mb-1">
                        기본 단가
                      </label>
                      <Input
                        type="number"
                        value={row.baseUnitPrice}
                        onChange={(e) =>
                          handleUpdateRow(
                            row.id,
                            'baseUnitPrice',
                            parseInt(e.target.value) || 0
                          )
                        }
                        className="text-sm"
                        disabled={isSaving}
                      />
                    </div>

                    <div>
                      <label className="text-xs text-gray-600 block mb-1">
                        비고
                      </label>
                      <Input
                        value={row.remarks}
                        onChange={(e) =>
                          handleUpdateRow(row.id, 'remarks', e.target.value)
                        }
                        placeholder="비고"
                        className="text-sm"
                        disabled={isSaving}
                      />
                    </div>

                    <div className="pt-2 border-t border-gray-200">
                      <div className="flex justify-between items-center">
                        <span className="text-xs text-gray-600">금액</span>
                        <span className="text-base font-bold text-purple-900">
                          {getRowTotal(row, sizeColumns).toLocaleString()} ₩
                        </span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>

              <div className="hidden sm:block overflow-x-auto">
                <Table className="text-sm">
                  <TableHeader>
                    <TableRow className="bg-purple-100">
                      <TableHead className="min-w-[180px] px-4">상품명</TableHead>

                      {sizeColumns.length === 0 ? (
                        <TableHead className="min-w-[90px] text-right px-4">
                          수량
                        </TableHead>
                      ) : (
                        sizeColumns.map((size) => (
                          <TableHead
                            key={size}
                            className="min-w-[120px] text-right px-4"
                          >
                            <div className="flex flex-col items-end">
                              <span>{size}</span>
                              <span className="text-[10px] text-slate-400">수량</span>
                            </div>
                          </TableHead>
                        ))
                      )}

                      <TableHead className="min-w-[110px] text-right px-4">
                        기본단가
                      </TableHead>
                      <TableHead className="min-w-[110px] text-center px-4">
                        사이즈별 단가
                      </TableHead>
                      <TableHead className="min-w-[110px] text-right px-4">
                        금액
                      </TableHead>
                      <TableHead className="min-w-[180px] px-4">비고</TableHead>
                      <TableHead className="w-12 px-4">삭제</TableHead>
                    </TableRow>
                  </TableHeader>

                  <TableBody>
                    {pivotRows.map((row) => (
                      <React.Fragment key={row.id}>
                        <TableRow>
                          <TableCell className="px-4">
                            <Input
                              value={row.name}
                              onChange={(e) =>
                                handleUpdateRow(row.id, 'name', e.target.value)
                              }
                              placeholder="상품명"
                              className="text-xs h-9"
                              disabled={isSaving}
                            />
                          </TableCell>

                          {sizeColumns.length === 0 ? (
                            <TableCell className="text-right px-4">
                              <Input
                                type="number"
                                value={row.freeQuantity}
                                onChange={(e) =>
                                  handleUpdateRow(
                                    row.id,
                                    'freeQuantity',
                                    parseInt(e.target.value) || 0
                                  )
                                }
                                className="text-xs text-right h-9"
                                disabled={isSaving}
                              />
                            </TableCell>
                          ) : (
                            sizeColumns.map((size) => (
                              <TableCell key={size} className="text-right px-4">
                                <Input
                                  type="number"
                                  value={row.quantities[size] || 0}
                                  onChange={(e) =>
                                    handleUpdateSizeQuantity(
                                      row.id,
                                      size,
                                      parseInt(e.target.value) || 0
                                    )
                                  }
                                  className="text-xs text-right h-9"
                                  disabled={isSaving}
                                />
                              </TableCell>
                            ))
                          )}

                          <TableCell className="text-right px-4">
                            <Input
                              type="number"
                              value={row.baseUnitPrice}
                              onChange={(e) =>
                                handleUpdateRow(
                                  row.id,
                                  'baseUnitPrice',
                                  parseInt(e.target.value) || 0
                                )
                              }
                              className="text-xs text-right h-9"
                              disabled={isSaving}
                            />
                          </TableCell>

                          <TableCell className="text-center px-4">
                            {sizeColumns.length > 0 ? (
                              <Button
                                type="button"
                                variant="outline"
                                size="sm"
                                className="text-xs"
                                onClick={() =>
                                  handleUpdateRow(
                                    row.id,
                                    'useSizePriceOverrides',
                                    !row.useSizePriceOverrides
                                  )
                                }
                                disabled={isSaving}
                              >
                                {row.useSizePriceOverrides ? '끄기' : '설정'}
                              </Button>
                            ) : (
                              <span className="text-xs text-slate-400">-</span>
                            )}
                          </TableCell>

                          <TableCell className="text-right font-semibold px-4">
                            {getRowTotal(row, sizeColumns).toLocaleString()} ₩
                          </TableCell>

                          <TableCell className="px-4">
                            <Input
                              value={row.remarks}
                              onChange={(e) =>
                                handleUpdateRow(row.id, 'remarks', e.target.value)
                              }
                              placeholder="비고"
                              className="text-xs h-9"
                              disabled={isSaving}
                            />
                          </TableCell>

                          <TableCell className="text-center px-4">
                            <button
                              onClick={() => handleRemoveRow(row.id)}
                              className="text-red-600 hover:text-red-800 disabled:text-gray-300"
                              disabled={isSaving}
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </TableCell>
                        </TableRow>

                        {row.useSizePriceOverrides && sizeColumns.length > 0 && (
                          <TableRow>
                            <TableCell className="px-4 bg-slate-50 text-xs text-slate-500">
                              사이즈별 단가
                            </TableCell>

                            {sizeColumns.map((size) => (
                              <TableCell key={size} className="px-4 bg-slate-50">
                                <Input
                                  type="number"
                                  value={
                                    row.unitPricesBySize[size] === ''
                                      ? ''
                                      : row.unitPricesBySize[size] ?? ''
                                  }
                                  onChange={(e) =>
                                    handleUpdateSizeUnitPrice(
                                      row.id,
                                      size,
                                      e.target.value === ''
                                        ? ''
                                        : parseInt(e.target.value) || 0
                                    )
                                  }
                                  placeholder={`${row.baseUnitPrice}`}
                                  className="text-xs text-right h-9"
                                  disabled={isSaving}
                                />
                              </TableCell>
                            ))}

                            <TableCell className="bg-slate-50" />
                            <TableCell className="bg-slate-50" />
                            <TableCell className="bg-slate-50" />
                            <TableCell className="bg-slate-50" />
                          </TableRow>
                        )}
                      </React.Fragment>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </>
          )}
        </div>

        <div className="mb-3 sm:mb-4 flex gap-2">
          {!isDepositLocked ? (
            <Button
              onClick={handleLockDeposit}
              size="sm"
              className="bg-blue-600 hover:bg-blue-700 text-white text-xs sm:text-sm"
              disabled={isSaving}
            >
              계약금 고정
            </Button>
          ) : (
            <Button
              onClick={handleUnlockDeposit}
              size="sm"
              variant="outline"
              className="text-xs sm:text-sm border-blue-300 text-blue-600"
              disabled={isSaving}
            >
              고정 해제
            </Button>
          )}
        </div>

        <div className="grid grid-cols-3 gap-2 sm:gap-4">
          <div className="bg-white p-2 sm:p-3 rounded border border-gray-200">
            <div className="text-[10px] sm:text-xs text-gray-600 mb-0.5 sm:mb-1">
              총액
            </div>
            <div className="text-sm sm:text-lg font-bold text-gray-900">
              {depositTabTotalAmount.toLocaleString()} ₩
            </div>
          </div>
          <div className="bg-white p-2 sm:p-3 rounded border border-blue-300">
            <div className="text-[10px] sm:text-xs text-gray-600 mb-0.5 sm:mb-1">
              계약금 {isDepositLocked && '(고정)'}
            </div>
            <div className="text-sm sm:text-lg font-bold text-blue-600">
              {Math.round(depositTabDepositAmount).toLocaleString()} ₩
            </div>
          </div>
          <div className="bg-white p-2 sm:p-3 rounded border border-green-300">
            <div className="text-[10px] sm:text-xs text-gray-600 mb-0.5 sm:mb-1">
              잔금 (60%)
            </div>
            <div className="text-sm sm:text-lg font-bold text-green-600">
              {Math.round(depositTabBalanceAmount).toLocaleString()} ₩
            </div>
          </div>
        </div>
      </div>

      <div className="mt-4 sm:mt-6 p-3 sm:p-4 bg-gray-50 rounded-lg border border-gray-200">
        <label className="block text-xs sm:text-sm font-semibold text-gray-700 mb-1.5 sm:mb-2">
          비고 (Remarks)
        </label>
        <textarea
          value={remarks}
          onChange={(e) => setRemarks(e.target.value)}
          placeholder="추가 사항이나 특수 주문 내용 등을 입력하세요"
          className="w-full px-2 sm:px-3 py-1.5 sm:py-2 border border-gray-300 rounded text-xs sm:text-sm resize-none focus:outline-none focus:ring-2 focus:ring-purple-500"
          rows={4}
          disabled={isSaving}
        />
      </div>

      <div className="flex flex-col sm:flex-row gap-2">
        <Button
          onClick={() => setShowPreview(!showPreview)}
          variant="outline"
          className="gap-1 sm:gap-2 text-xs sm:text-sm"
          disabled={isSaving}
        >
          {showPreview ? (
            <EyeOff className="w-3 h-3 sm:w-4 sm:h-4" />
          ) : (
            <Eye className="w-3 h-3 sm:w-4 sm:h-4" />
          )}
          {showPreview ? '미리보기 숨기기' : '미리보기'}
        </Button>
        <Button
          onClick={handleExportPDF}
          className="gap-1 sm:gap-2 bg-purple-600 hover:bg-purple-700 text-xs sm:text-sm"
          disabled={isSaving}
        >
          <FileDown className="w-3 h-3 sm:w-4 sm:h-4" />
          PDF 다운로드
        </Button>
      </div>

      {showPreview && (
        <div
          id="settlement-pdf-content"
          className="bg-white border border-gray-200 rounded-lg p-4 sm:p-8"
        >
          <SettlementPDFTemplate
            productName={productName}
            companyName={vendorName.split(' ').pop() || vendorName}
            date={date}
            items={depositItems}
            totalAmount={depositTabTotalAmount}
            depositAmount={Math.round(depositTabDepositAmount)}
            balanceAmount={Math.round(depositTabBalanceAmount)}
            remarks={remarks}
            isDepositLocked={isDepositLocked}
          />
        </div>
      )}
    </div>
  );
}