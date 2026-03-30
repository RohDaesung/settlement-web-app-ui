'use client';

import React, { useEffect, useRef, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Upload, Download, Printer } from 'lucide-react';
import * as XLSX from 'xlsx';

interface ExcelViewerProps {
  mode: 'deposit' | 'balance';
}

declare global {
  interface Window {
    luckysheet: any;
  }
}

export function ExcelViewer({ mode }: ExcelViewerProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isLoaded, setIsLoaded] = useState(false);

  // Load Luckysheet library
  useEffect(() => {
    // Add Luckysheet CSS
    const linkCSS = document.createElement('link');
    linkCSS.rel = 'stylesheet';
    linkCSS.href = 'https://cdn.jsdelivr.net/npm/luckysheet@3.2.8/dist/luckysheet.css';
    document.head.appendChild(linkCSS);

    // Add Luckysheet JS
    const scriptJS = document.createElement('script');
    scriptJS.src = 'https://cdn.jsdelivr.net/npm/luckysheet@3.2.8/dist/luckysheet.umd.js';
    scriptJS.onload = () => {
      initLuckysheet();
      setIsLoaded(true);
    };
    document.body.appendChild(scriptJS);

    return () => {
      // Cleanup
      if (linkCSS.parentNode) linkCSS.parentNode.removeChild(linkCSS);
      if (scriptJS.parentNode) scriptJS.parentNode.removeChild(scriptJS);
    };
  }, []);

  const initLuckysheet = () => {
    if (!window.luckysheet || !containerRef.current) return;

    // Initialize with template data
    const templateData = [
      [
        { v: '계약정산표', m: '계약정산표', ct: { fa: 'Arial', fc: '#000000', fs: 24, bold: true }, mc: { r: 0, c: 5, rs: 1, cs: 1 } },
        null, null, null, null,
        { v: '계약정산표', m: '계약정산표', ct: { fa: 'Arial', fc: '#000000', fs: 24, bold: true } },
        null, null, null, null
      ],
      [null, null, null, null, null, null, null, null, null, null],
      [
        null, null, null, null, null,
        { v: new Date().toISOString().slice(0, 10).replace(/-/g, '.'), m: new Date().toISOString().slice(0, 10).replace(/-/g, '.'), ct: { fa: 'Arial', fc: '#000000', fs: 12 } },
        null, null, null, null
      ],
      [null, null, null, null, null, null, null, null, null, null],
      [
        { v: '생산품명 品名', m: '생산품명 品名', ct: { fa: 'Arial', fc: '#000000', bold: true }, bg: '#e8e8e8', bd: { b: { style: 1 }, l: { style: 1 }, r: { style: 1 }, t: { style: 1 } } },
        null, null, null,
        { v: '회사명 公司名', m: '회사명 公司名', ct: { fa: 'Arial', fc: '#000000', bold: true }, bg: '#e8e8e8', bd: { b: { style: 1 }, l: { style: 1 }, r: { style: 1 }, t: { style: 1 } } },
        null, null, null, null, null
      ],
      [
        { v: '', m: '', ct: { fa: 'Arial', fc: '#000000' }, bd: { b: { style: 1 }, l: { style: 1 }, r: { style: 1 }, t: { style: 1 } } },
        null, null, null,
        { v: '', m: '', ct: { fa: 'Arial', fc: '#000000' }, bd: { b: { style: 1 }, l: { style: 1 }, r: { style: 1 }, t: { style: 1 } } },
        null, null, null, null, null
      ],
      [null, null, null, null, null, null, null, null, null, null],
      [
        { v: '구분 分类', m: '구분 分类', ct: { fa: 'Arial', fc: '#000000', bold: true }, bg: '#e8e8e8', bd: { b: { style: 1 }, l: { style: 1 }, r: { style: 1 }, t: { style: 1 } } },
        { v: '품명 品名', m: '품명 品名', ct: { fa: 'Arial', fc: '#000000', bold: true }, bg: '#e8e8e8', bd: { b: { style: 1 }, l: { style: 1 }, r: { style: 1 }, t: { style: 1 } } },
        null,
        { v: 'S', m: 'S', ct: { fa: 'Arial', fc: '#000000', bold: true }, bg: '#e8e8e8', bd: { b: { style: 1 }, l: { style: 1 }, r: { style: 1 }, t: { style: 1 } } },
        { v: 'M', m: 'M', ct: { fa: 'Arial', fc: '#000000', bold: true }, bg: '#e8e8e8', bd: { b: { style: 1 }, l: { style: 1 }, r: { style: 1 }, t: { style: 1 } } },
        { v: 'L', m: 'L', ct: { fa: 'Arial', fc: '#000000', bold: true }, bg: '#e8e8e8', bd: { b: { style: 1 }, l: { style: 1 }, r: { style: 1 }, t: { style: 1 } } },
        { v: 'XL', m: 'XL', ct: { fa: 'Arial', fc: '#000000', bold: true }, bg: '#e8e8e8', bd: { b: { style: 1 }, l: { style: 1 }, r: { style: 1 }, t: { style: 1 } } },
        { v: '수량 数量', m: '수량 数量', ct: { fa: 'Arial', fc: '#000000', bold: true }, bg: '#e8e8e8', bd: { b: { style: 1 }, l: { style: 1 }, r: { style: 1 }, t: { style: 1 } } },
        { v: '단가 单价', m: '단가 单价', ct: { fa: 'Arial', fc: '#000000', bold: true }, bg: '#e8e8e8', bd: { b: { style: 1 }, l: { style: 1 }, r: { style: 1 }, t: { style: 1 } } },
        { v: '금액 总价', m: '금액 总价', ct: { fa: 'Arial', fc: '#000000', bold: true }, bg: '#e8e8e8', bd: { b: { style: 1 }, l: { style: 1 }, r: { style: 1 }, t: { style: 1 } } }
      ],
      [
        { v: '', m: '', bd: { b: { style: 1 }, l: { style: 1 }, r: { style: 1 }, t: { style: 1 } } },
        { v: '아이보리(#2159)', m: '아이보리(#2159)', bd: { b: { style: 1 }, l: { style: 1 }, r: { style: 1 }, t: { style: 1 } } },
        { v: '', m: '', bd: { b: { style: 1 }, l: { style: 1 }, r: { style: 1 }, t: { style: 1 } } },
        { v: '', m: '', bd: { b: { style: 1 }, l: { style: 1 }, r: { style: 1 }, t: { style: 1 } } },
        { v: '', m: '', bd: { b: { style: 1 }, l: { style: 1 }, r: { style: 1 }, t: { style: 1 } } },
        { v: '', m: '', bd: { b: { style: 1 }, l: { style: 1 }, r: { style: 1 }, t: { style: 1 } } },
        { v: '', m: '', bd: { b: { style: 1 }, l: { style: 1 }, r: { style: 1 }, t: { style: 1 } } },
        { v: '100', m: '100', bd: { b: { style: 1 }, l: { style: 1 }, r: { style: 1 }, t: { style: 1 } } },
        { v: '₩23,500', m: '₩23,500', bd: { b: { style: 1 }, l: { style: 1 }, r: { style: 1 }, t: { style: 1 } } },
        { v: '₩2,350,000', m: '₩2,350,000', bd: { b: { style: 1 }, l: { style: 1 }, r: { style: 1 }, t: { style: 1 } } }
      ],
      [
        { v: '', m: '', bd: { b: { style: 1 }, l: { style: 1 }, r: { style: 1 }, t: { style: 1 } } },
        { v: '멜란지 그레이(#2078)', m: '멜란지 그레이(#2078)', bd: { b: { style: 1 }, l: { style: 1 }, r: { style: 1 }, t: { style: 1 } } },
        { v: '', m: '', bd: { b: { style: 1 }, l: { style: 1 }, r: { style: 1 }, t: { style: 1 } } },
        { v: '', m: '', bd: { b: { style: 1 }, l: { style: 1 }, r: { style: 1 }, t: { style: 1 } } },
        { v: '', m: '', bd: { b: { style: 1 }, l: { style: 1 }, r: { style: 1 }, t: { style: 1 } } },
        { v: '', m: '', bd: { b: { style: 1 }, l: { style: 1 }, r: { style: 1 }, t: { style: 1 } } },
        { v: '', m: '', bd: { b: { style: 1 }, l: { style: 1 }, r: { style: 1 }, t: { style: 1 } } },
        { v: '100', m: '100', bd: { b: { style: 1 }, l: { style: 1 }, r: { style: 1 }, t: { style: 1 } } },
        { v: '₩23,500', m: '₩23,500', bd: { b: { style: 1 }, l: { style: 1 }, r: { style: 1 }, t: { style: 1 } } },
        { v: '₩2,350,000', m: '₩2,350,000', bd: { b: { style: 1 }, l: { style: 1 }, r: { style: 1 }, t: { style: 1 } } }
      ],
      [
        { v: '', m: '', bd: { b: { style: 1 }, l: { style: 1 }, r: { style: 1 }, t: { style: 1 } } },
        { v: '스카이 블루(#2171)', m: '스카이 블루(#2171)', bd: { b: { style: 1 }, l: { style: 1 }, r: { style: 1 }, t: { style: 1 } } },
        { v: '', m: '', bd: { b: { style: 1 }, l: { style: 1 }, r: { style: 1 }, t: { style: 1 } } },
        { v: '', m: '', bd: { b: { style: 1 }, l: { style: 1 }, r: { style: 1 }, t: { style: 1 } } },
        { v: '', m: '', bd: { b: { style: 1 }, l: { style: 1 }, r: { style: 1 }, t: { style: 1 } } },
        { v: '', m: '', bd: { b: { style: 1 }, l: { style: 1 }, r: { style: 1 }, t: { style: 1 } } },
        { v: '', m: '', bd: { b: { style: 1 }, l: { style: 1 }, r: { style: 1 }, t: { style: 1 } } },
        { v: '100', m: '100', bd: { b: { style: 1 }, l: { style: 1 }, r: { style: 1 }, t: { style: 1 } } },
        { v: '₩23,500', m: '₩23,500', bd: { b: { style: 1 }, l: { style: 1 }, r: { style: 1 }, t: { style: 1 } } },
        { v: '₩2,350,000', m: '₩2,350,000', bd: { b: { style: 1 }, l: { style: 1 }, r: { style: 1 }, t: { style: 1 } } }
      ],
      ...[...Array(12)].map(() => [
        { v: '', m: '', bd: { b: { style: 1 }, l: { style: 1 }, r: { style: 1 }, t: { style: 1 } } },
        { v: '', m: '', bd: { b: { style: 1 }, l: { style: 1 }, r: { style: 1 }, t: { style: 1 } } },
        { v: '', m: '', bd: { b: { style: 1 }, l: { style: 1 }, r: { style: 1 }, t: { style: 1 } } },
        { v: '', m: '', bd: { b: { style: 1 }, l: { style: 1 }, r: { style: 1 }, t: { style: 1 } } },
        { v: '', m: '', bd: { b: { style: 1 }, l: { style: 1 }, r: { style: 1 }, t: { style: 1 } } },
        { v: '', m: '', bd: { b: { style: 1 }, l: { style: 1 }, r: { style: 1 }, t: { style: 1 } } },
        { v: '', m: '', bd: { b: { style: 1 }, l: { style: 1 }, r: { style: 1 }, t: { style: 1 } } },
        { v: '', m: '', bd: { b: { style: 1 }, l: { style: 1 }, r: { style: 1 }, t: { style: 1 } } },
        { v: '', m: '', bd: { b: { style: 1 }, l: { style: 1 }, r: { style: 1 }, t: { style: 1 } } },
        { v: '', m: '', bd: { b: { style: 1 }, l: { style: 1 }, r: { style: 1 }, t: { style: 1 } } }
      ]),
      [
        { v: '총액 总额', m: '총액 总额', ct: { fa: 'Arial', fc: '#000000', bold: true }, bg: '#ffff99', bd: { b: { style: 2 }, l: { style: 2 }, r: { style: 2 }, t: { style: 2 } } },
        null, null, null, null, null, null, null, null,
        { v: '₩7,050,000', m: '₩7,050,000', ct: { fa: 'Arial', fc: '#000000', bold: true }, bg: '#ffff99', bd: { b: { style: 2 }, l: { style: 2 }, r: { style: 2 }, t: { style: 2 } } }
      ],
      [
        { v: '계약금 定金', m: '계약금 定金', ct: { fa: 'Arial', fc: '#000000', bold: true }, bg: '#ffff99', bd: { b: { style: 2 }, l: { style: 2 }, r: { style: 2 }, t: { style: 2 } } },
        null, null, null, null, null, null, null, null,
        { v: '₩2,820,000', m: '₩2,820,000', ct: { fa: 'Arial', fc: '#000000', bold: true }, bg: '#ffff99', bd: { b: { style: 2 }, l: { style: 2 }, r: { style: 2 }, t: { style: 2 } } }
      ],
      [
        { v: '잔금 尾款', m: '잔금 尾款', ct: { fa: 'Arial', fc: '#000000', bold: true }, bg: '#ffeb3b', bd: { b: { style: 2 }, l: { style: 2 }, r: { style: 2 }, t: { style: 2 } } },
        null, null, null, null, null, null, null, null,
        { v: '₩4,230,000', m: '₩4,230,000', ct: { fa: 'Arial', fc: '#000000', bold: true }, bg: '#ffeb3b', bd: { b: { style: 2 }, l: { style: 2 }, r: { style: 2 }, t: { style: 2 } } }
      ],
      [null, null, null, null, null, null, null, null, null, null],
      [
        { v: '(VAT 별도)', m: '(VAT 별도)', bd: { b: { style: 1 }, l: { style: 1 }, r: { style: 1 }, t: { style: 1 } } },
        null, null, null, null, null, null, null, null, null
      ],
      [
        { v: '하나은행 357-910040-73404 칸컬쳐 주식회사', m: '하나은행 357-910040-73404 칸컬쳐 주식회사', bd: { b: { style: 1 }, l: { style: 1 }, r: { style: 1 }, t: { style: 1 } } },
        null, null, null, null, null, null, null, null, null
      ]
    ];

    const options = {
      container: containerRef.current,
      title: '정산표',
      lang: 'ko',
      plugins: [],
      data: [{ name: mode === 'deposit' ? '계약금' : '잔금', celldata: templateData }],
      updateUrl: '',
      editMode: true,
      showToolbar: true,
      showBottomBar: true,
      allowCopy: true,
      allowPaste: true,
      enableAddRow: true,
      enableAddCol: true,
    };

    window.luckysheet.create(options);
  };

  const handleUpload = () => {
    fileInputRef.current?.click();
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const workbook = XLSX.read(event.target?.result);
        const firstSheet = workbook.SheetNames[0];
        const worksheet = workbook.Sheets[firstSheet];
        const data = XLSX.utils.sheet_to_json(worksheet, { header: 1 });

        // Reload Luckysheet with uploaded data
        if (window.luckysheet) {
          window.luckysheet.destroyEdit();
          const options = {
            container: containerRef.current,
            title: '정산표',
            lang: 'ko',
            data: [{ name: firstSheet, celldata: data }],
            editMode: true,
            showToolbar: true,
            showBottomBar: true,
          };
          window.luckysheet.create(options);
        }
      } catch (error) {
        console.error('[v0] File upload error:', error);
        alert('파일을 읽을 수 없습니다');
      }
    };
    reader.readAsArrayBuffer(file);
  };

  const handleDownload = () => {
    try {
      if (!window.luckysheet) return;
      
      const data = window.luckysheet.getAllSheets();
      if (!data || data.length === 0) return;

      const sheet = data[0];
      const worksheet = XLSX.utils.aoa_to_sheet(sheet.celldata || []);
      const workbook = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(workbook, worksheet, sheet.name || '정산표');

      const fileName = `${mode === 'deposit' ? '계약금' : '잔금'}_정산표_${new Date().toISOString().slice(0, 10)}.xlsx`;
      XLSX.writeFile(workbook, fileName);
    } catch (error) {
      console.error('[v0] Download error:', error);
      alert('다운로드에 실패했습니다');
    }
  };

  const handlePrint = () => {
    if (window.luckysheet) {
      window.print();
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex gap-2">
        <Button onClick={handleUpload} className="flex items-center gap-2">
          <Upload className="h-4 w-4" />
          엑셀 업로드
        </Button>
        <Button onClick={handleDownload} variant="outline" className="flex items-center gap-2">
          <Download className="h-4 w-4" />
          엑셀 다운로드
        </Button>
        <Button onClick={handlePrint} variant="outline" className="flex items-center gap-2">
          <Printer className="h-4 w-4" />
          인쇄
        </Button>
      </div>

      <input
        ref={fileInputRef}
        type="file"
        accept=".xlsx,.xls"
        onChange={handleFileChange}
        className="hidden"
      />

      <div
        ref={containerRef}
        style={{
          width: '100%',
          height: '600px',
          border: '1px solid #ddd',
          borderRadius: '4px',
          overflow: 'auto',
        }}
      />
    </div>
  );
}
