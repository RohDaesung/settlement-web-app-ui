'use client';

import { useState } from 'react';
import { RoundData } from '@/lib/types';
import { Button } from '@/components/ui/button';

interface SettlementSheetTemplateProps {
  mode: 'deposit' | 'balance';
  round: RoundData;
  vendor: string;
  style: string;
}

interface CalibrationState {
  enabled: boolean;
  offsetX: number;
  offsetY: number;
}

export function SettlementSheetTemplate({
  mode,
  round,
  vendor,
  style,
}: SettlementSheetTemplateProps) {
  const [calibration, setCalibration] = useState<CalibrationState>({
    enabled: false,
    offsetX: 0,
    offsetY: 0,
  });

  const today = new Date();
  const dateStr = `${String(today.getFullYear()).slice(-2)}.${String(today.getMonth() + 1).padStart(2, '0')}.${String(today.getDate()).padStart(2, '0')}`;

  const deposit =
    mode === 'deposit'
      ? round.totalAmount * 0.4
      : round.depositPaidAmount;
  const balance = round.totalAmount - deposit;

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('ko-KR').format(Math.round(amount));
  };

  // Anchor points for calibration (absolute positioning coordinates in mm)
  const anchors = {
    date: { x: 105, y: 62, label: 'date' },
    styleName: { x: 52, y: 78, label: 'styleName' },
    vendorName: { x: 158, y: 78, label: 'vendorName' },
    row1Name: { x: 52, y: 105, label: 'row1Name' },
    row1Qty: { x: 105, y: 105, label: 'row1Qty' },
    row1Price: { x: 145, y: 105, label: 'row1Price' },
    row1Amount: { x: 180, y: 105, label: 'row1Amount' },
    totalAmount: { x: 180, y: 195, label: 'totalAmount' },
    depositAmount: { x: 180, y: 205, label: 'depositAmount' },
    balanceAmount: { x: 180, y: 215, label: 'balanceAmount' },
  };

  const positionStyle = (anchor: { x: number; y: number }) => {
    const x = anchor.x + calibration.offsetX;
    const y = anchor.y + calibration.offsetY;
    return {
      position: 'absolute' as const,
      left: `${x}mm`,
      top: `${y}mm`,
      fontSize: '10px',
      fontFamily: 'Arial, sans-serif',
    };
  };

  return (
    <>
      {/* Calibration Controls - Print Hidden */}
      {!calibration.enabled && (
        <div className="print:hidden mb-4 p-4 bg-blue-50 border border-blue-200 rounded flex gap-4 items-center">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setCalibration({ ...calibration, enabled: true })}
          >
            Calibration Mode ON
          </Button>
          <p className="text-sm text-gray-600">Enable to adjust text overlay alignment</p>
        </div>
      )}

      {calibration.enabled && (
        <div className="print:hidden mb-4 p-4 bg-yellow-50 border border-yellow-300 rounded">
          <div className="mb-4">
            <h3 className="font-bold mb-2">Calibration Mode</h3>
            <div className="grid grid-cols-2 gap-4 mb-4">
              <div>
                <label className="text-sm">X Offset (mm): {calibration.offsetX}</label>
                <input
                  type="range"
                  min="-10"
                  max="10"
                  step="0.5"
                  value={calibration.offsetX}
                  onChange={(e) =>
                    setCalibration({
                      ...calibration,
                      offsetX: parseFloat(e.target.value),
                    })
                  }
                  className="w-full"
                />
              </div>
              <div>
                <label className="text-sm">Y Offset (mm): {calibration.offsetY}</label>
                <input
                  type="range"
                  min="-10"
                  max="10"
                  step="0.5"
                  value={calibration.offsetY}
                  onChange={(e) =>
                    setCalibration({
                      ...calibration,
                      offsetY: parseFloat(e.target.value),
                    })
                  }
                  className="w-full"
                />
              </div>
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setCalibration({ ...calibration, enabled: false })}
            >
              Exit Calibration
            </Button>
          </div>
        </div>
      )}

      {/* A4 Print Container */}
      <div
        style={{
          width: '210mm',
          height: '297mm',
          position: 'relative',
          margin: '0 auto',
          backgroundColor: 'white',
          backgroundImage: 'url(/settlement-template.jpg)',
          backgroundSize: '100% 100%',
          backgroundRepeat: 'no-repeat',
          backgroundPosition: '0 0',
          boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
        }}
      >
        <style>{`
          @page {
            size: A4 portrait;
            margin: 0;
          }
          @media print {
            body {
              margin: 0;
              padding: 0;
            }
            html {
              margin: 0;
              padding: 0;
            }
          }
        `}</style>

        {/* Calibration Grid Overlay */}
        {calibration.enabled && (
          <svg
            style={{
              position: 'absolute',
              top: 0,
              left: 0,
              width: '100%',
              height: '100%',
              pointerEvents: 'none',
              opacity: 0.3,
            }}
          >
            {/* Vertical grid lines every 10mm */}
            {Array.from({ length: 22 }).map((_, i) => (
              <line
                key={`v-${i}`}
                x1={`${(i * 10 * 100) / 210}%`}
                y1="0"
                x2={`${(i * 10 * 100) / 210}%`}
                y2="100%"
                stroke="red"
                strokeWidth="0.5"
              />
            ))}
            {/* Horizontal grid lines every 10mm */}
            {Array.from({ length: 30 }).map((_, i) => (
              <line
                key={`h-${i}`}
                x1="0"
                y1={`${(i * 10 * 100) / 297}%`}
                x2="100%"
                y2={`${(i * 10 * 100) / 297}%`}
                stroke="red"
                strokeWidth="0.5"
              />
            ))}
          </svg>
        )}

        {/* Overlay Text Anchors - Print Hidden */}
        {calibration.enabled &&
          Object.values(anchors).map((anchor) => (
            <div
              key={anchor.label}
              style={{
                ...positionStyle(anchor),
                width: '4mm',
                height: '4mm',
                backgroundColor: 'red',
                borderRadius: '50%',
                opacity: 0.7,
                zIndex: 10,
                pointerEvents: 'none',
              }}
              title={anchor.label}
            />
          ))}

        {/* Dynamic Overlay Values */}
        {/* Date */}
        <div style={positionStyle(anchors.date)}>
          <span style={{ fontWeight: 'bold' }}>{dateStr}</span>
        </div>

        {/* Style/Product Name */}
        <div style={positionStyle(anchors.styleName)}>
          <span>{style}</span>
        </div>

        {/* Vendor/Company Name */}
        <div style={positionStyle(anchors.vendorName)}>
          <span>{vendor}</span>
        </div>

        {/* Data Rows - Display first 2 items */}
        {round.items.slice(0, 2).map((item, idx) => {
          const yOffset = 105 + idx * 10;
          return (
            <div key={item.id}>
              {/* Row Name */}
              <div
                style={{
                  ...positionStyle({ x: 52, y: yOffset }),
                }}
              >
                {item.name}
              </div>

              {/* Row Quantity */}
              <div
                style={{
                  ...positionStyle({ x: 105, y: yOffset }),
                  textAlign: 'right',
                  paddingRight: '2mm',
                }}
              >
                {item.quantity}
              </div>

              {/* Row Unit Price */}
              <div
                style={{
                  ...positionStyle({ x: 145, y: yOffset }),
                  textAlign: 'right',
                  paddingRight: '2mm',
                  fontSize: '9px',
                }}
              >
                ₩{formatCurrency(item.unitPrice)}
              </div>

              {/* Row Amount */}
              <div
                style={{
                  ...positionStyle({ x: 180, y: yOffset }),
                  textAlign: 'right',
                  paddingRight: '2mm',
                  fontSize: '9px',
                }}
              >
                ₩{formatCurrency(item.quantity * item.unitPrice)}
              </div>
            </div>
          );
        })}

        {/* Summary Section - Yellow Overlay Values */}
        {/* Total Amount */}
        <div
          style={{
            ...positionStyle(anchors.totalAmount),
            textAlign: 'right',
            paddingRight: '2mm',
            fontWeight: 'bold',
            fontSize: '11px',
          }}
        >
          ₩{formatCurrency(round.totalAmount)}
        </div>

        {/* Deposit Amount */}
        <div
          style={{
            ...positionStyle(anchors.depositAmount),
            textAlign: 'right',
            paddingRight: '2mm',
            fontWeight: 'bold',
            fontSize: '11px',
          }}
        >
          ₩{formatCurrency(deposit)}
        </div>

        {/* Balance Amount */}
        <div
          style={{
            ...positionStyle(anchors.balanceAmount),
            textAlign: 'right',
            paddingRight: '2mm',
            fontWeight: 'bold',
            fontSize: '11px',
          }}
        >
          ₩{formatCurrency(balance)}
        </div>
      </div>
    </>
  );
}
