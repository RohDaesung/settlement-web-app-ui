'use client';

import { useRouter } from 'next/navigation';
import { useEffect, useMemo, useState } from 'react';
import {
  ArrowLeft,
  Save,
  Building2,
  Package2,
  Wallet,
  Search,
  ChevronUp,
  ChevronDown,
} from 'lucide-react';
import Link from 'next/link';
import { supabase } from '@/lib/supabase/client';
import {
  calculateMarginPerRow,
  calculateMarginKPI,
  formatCurrency,
} from '@/lib/margin-utils';
import type { MarginAnalysisRow, MarginAnalysisData } from '@/lib/margin-types';

const DEFAULT_SHIPPING_FEE_PER = 600;
const DEFAULT_INSPECTION_FEE_PER = 500;

type SortField =
  | 'companyName'
  | 'designCode'
  | 'round'
  | 'shippingDate'
  | 'totalQuantity'
  | 'exchangeRate'
  | 'costCNY'
  | 'sellingPrice'
  | 'totalProfit';

type SortDirection = 'asc' | 'desc';

function extractRoundNumber(roundName: string) {
  const match = (roundName || '').match(/\d+/);
  return match ? Number(match[0]) : Number.MAX_SAFE_INTEGER;
}

export default function MarginAnalysisPage() {
  const router = useRouter();

  const [authLoading, setAuthLoading] = useState(true);
  const [authorized, setAuthorized] = useState(false);

  const [data, setData] = useState<MarginAnalysisRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [savingRowId, setSavingRowId] = useState<string | null>(null);
  const [companyFilter, setCompanyFilter] = useState('전체');
  const [searchQuery, setSearchQuery] = useState('');
  const [sortField, setSortField] = useState<SortField>('shippingDate');
  const [sortDirection, setSortDirection] = useState<SortDirection>('desc');

  const checkAccess = async (): Promise<boolean> => {
    try {
      const { data: authData, error: authError } = await supabase.auth.getUser();

      if (authError || !authData.user) {
        alert('로그인이 필요합니다.');
        window.location.href = '/';
        return false;
      }

      const { data: profile, error: profileError } = await supabase
        .from('profiles')
        .select('role, status')
        .eq('id', authData.user.id)
        .maybeSingle();

      if (profileError || !profile) {
        await supabase.auth.signOut();
        alert('프로필 정보를 확인할 수 없습니다.');
        window.location.href = '/';
        return false;
      }

      if (profile.status !== 'approved') {
        await supabase.auth.signOut();
        alert('승인되지 않은 계정입니다.');
        window.location.href = '/';
        return false;
      }

      if (profile.role !== 'admin') {
        alert('이윤 분석 페이지는 총운영자만 접근할 수 있습니다.');
        window.location.href = '/shipment-management';
        return false;
      }

      setAuthorized(true);
      return true;
    } catch (error) {
      console.error('checkAccess error:', error);
      alert('권한 확인 중 오류가 발생했습니다.');
      window.location.href = '/';
      return false;
    } finally {
      setAuthLoading(false);
    }
  };

  const getHighestExchangeRateWithin5Days = async (
    shippingDate: string
  ): Promise<number> => {
    if (!shippingDate) return 170;

    const baseDate = new Date(shippingDate);
    const startDate = new Date(baseDate);
    const endDate = new Date(baseDate);

    startDate.setDate(baseDate.getDate() - 5);
    endDate.setDate(baseDate.getDate() + 5);

    const start = startDate.toISOString().split('T')[0];
    const end = endDate.toISOString().split('T')[0];

    const { data, error } = await supabase
      .from('exchange_rates')
      .select('rate_date, cny_to_krw')
      .gte('rate_date', start)
      .lte('rate_date', end)
      .order('cny_to_krw', { ascending: false })
      .limit(1);

    if (error) {
      console.error('exchange rate load error:', error);
      return 170;
    }

    return Number(data?.[0]?.cny_to_krw ?? 170);
  };

  const fetchData = async () => {
    setLoading(true);

    const { data: rows, error } = await supabase
      .from('margin_dashboard_rows')
      .select('*')
      .order('company_name', { ascending: true })
      .order('design_code', { ascending: true });

    if (error) {
      console.error('margin load error:', error);
      setLoading(false);
      return;
    }

    const mapped: MarginAnalysisRow[] = rows
      ? await Promise.all(
          rows.map(async (r: any) => {
            const shippingDate = r.shipping_date ?? '';

            const autoExchangeRate = shippingDate
              ? await getHighestExchangeRateWithin5Days(shippingDate)
              : Number(r.exchange_rate ?? 170);

            return {
              id: r.round_id,
              companyName: r.company_name,
              designCode: r.design_code,
              round: r.round_name,
              shippingDate,
              totalQuantity: Number(r.total_quantity ?? 0),
              costCNY: Number(r.cost_cny ?? 0),
              exchangeRate: autoExchangeRate,
              shippingFeePer: Number(
                r.shipping_fee_per ?? DEFAULT_SHIPPING_FEE_PER
              ),
              inspectionFeePer: Number(
                r.inspection_fee_per ?? DEFAULT_INSPECTION_FEE_PER
              ),
              documentFeePer: 0,
              otherCostPer: 0,
              tariffRate: Number(r.tariff_rate ?? 0),
              sellingPrice: Number(r.selling_price ?? 0),
            };
          })
        )
      : [];

    setData(mapped);
    setLoading(false);
  };

  useEffect(() => {
    const init = async () => {
      const allowed = await checkAccess();
      if (allowed) {
        await fetchData();
      } else {
        setLoading(false);
      }
    };

    init();
  }, []);

  const handleUpdateField = (
    roundId: string,
    field: keyof MarginAnalysisRow,
    value: string | number
  ) => {
    setData((prev) =>
      prev.map((row) =>
        row.id === roundId ? { ...row, [field]: value } : row
      )
    );
  };

  const handleShippingDateChange = async (
    roundId: string,
    shippingDate: string
  ) => {
    const autoExchangeRate = shippingDate
      ? await getHighestExchangeRateWithin5Days(shippingDate)
      : 170;

    setData((prev) =>
      prev.map((row) =>
        row.id === roundId
          ? {
              ...row,
              shippingDate,
              exchangeRate: autoExchangeRate,
            }
          : row
      )
    );
  };

  const makePayload = (row: MarginAnalysisRow) => ({
    round_id: row.id,
    shipping_date: row.shippingDate || null,
    cost_cny: Number(row.costCNY || 0),
    exchange_rate: Number(row.exchangeRate || 0),
    shipping_fee_per: Number(row.shippingFeePer || 0),
    inspection_fee_per: Number(row.inspectionFeePer || 0),
    tariff_rate: Number(row.tariffRate || 0),
    selling_price: Number(row.sellingPrice || 0),
  });

  const handleSaveRow = async (row: MarginAnalysisRow) => {
    setSavingRowId(row.id);

    try {
      const payload = makePayload(row);

      const { error } = await supabase
        .from('margin_rows')
        .upsert(payload, { onConflict: 'round_id' });

      if (error) {
        console.error('row save error:', error);
        alert(`행 저장 중 오류가 발생했습니다. (${row.designCode})`);
        return;
      }

      alert(`저장되었습니다. (${row.designCode})`);
    } finally {
      setSavingRowId(null);
    }
  };

  const handleSaveAll = async () => {
    setSaving(true);

    try {
      const payload = data.map((row) => makePayload(row));

      const { error } = await supabase
        .from('margin_rows')
        .upsert(payload, { onConflict: 'round_id' });

      if (error) {
        console.error('margin save error:', error);
        alert('저장 중 오류가 발생했습니다.');
        return;
      }

      alert('전체 저장되었습니다.');
    } finally {
      setSaving(false);
    }
  };

  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortDirection((prev) => (prev === 'asc' ? 'desc' : 'asc'));
      return;
    }

    setSortField(field);
    setSortDirection(field === 'shippingDate' ? 'desc' : 'asc');
  };

  const companyOptions = useMemo(() => {
    const companies = Array.from(
      new Set(data.map((row) => row.companyName).filter(Boolean))
    );
    companies.sort((a, b) =>
      a.localeCompare(b, 'ko', { numeric: true, sensitivity: 'base' })
    );
    return ['전체', ...companies];
  }, [data]);

  const searchedAndFilteredData = useMemo(() => {
    const keyword = searchQuery.trim().toLowerCase();

    return data.filter((row) => {
      const matchesCompany =
        companyFilter === '전체' || row.companyName === companyFilter;

      if (!matchesCompany) return false;
      if (!keyword) return true;

      return (
        row.companyName.toLowerCase().includes(keyword) ||
        row.designCode.toLowerCase().includes(keyword) ||
        row.round.toLowerCase().includes(keyword)
      );
    });
  }, [data, companyFilter, searchQuery]);

  const dataWithCalc: MarginAnalysisData[] = useMemo(() => {
    return searchedAndFilteredData.map((row) => ({
      ...row,
      calculations: calculateMarginPerRow(row),
    }));
  }, [searchedAndFilteredData]);

  const sortedDataWithCalc = useMemo(() => {
    const sorted = [...dataWithCalc];

    sorted.sort((a, b) => {
      let result = 0;

      switch (sortField) {
        case 'companyName':
          result = a.companyName.localeCompare(b.companyName, 'ko', {
            numeric: true,
            sensitivity: 'base',
          });
          break;

        case 'designCode':
          result = a.designCode.localeCompare(b.designCode, 'ko', {
            numeric: true,
            sensitivity: 'base',
          });
          break;

        case 'round':
          result = extractRoundNumber(a.round) - extractRoundNumber(b.round);
          if (result === 0) {
            result = a.round.localeCompare(b.round, 'ko', {
              numeric: true,
              sensitivity: 'base',
            });
          }
          break;

        case 'shippingDate':
          result =
            new Date(a.shippingDate || '1900-01-01').getTime() -
            new Date(b.shippingDate || '1900-01-01').getTime();
          break;

        case 'totalQuantity':
          result = a.totalQuantity - b.totalQuantity;
          break;

        case 'exchangeRate':
          result = a.exchangeRate - b.exchangeRate;
          break;

        case 'costCNY':
          result = a.costCNY - b.costCNY;
          break;

        case 'sellingPrice':
          result = a.sellingPrice - b.sellingPrice;
          break;

        case 'totalProfit':
          result = a.calculations.totalProfit - b.calculations.totalProfit;
          break;

        default:
          result = 0;
      }

      return sortDirection === 'asc' ? result : -result;
    });

    return sorted;
  }, [dataWithCalc, sortField, sortDirection]);

  const kpi = useMemo(() => {
    return calculateMarginKPI(sortedDataWithCalc);
  }, [sortedDataWithCalc]);

  const renderSortIcon = (field: SortField) => {
    if (sortField !== field) {
      return <span className="ml-1 inline-block w-3" />;
    }

    return sortDirection === 'asc' ? (
      <ChevronUp className="ml-1 inline-block h-3.5 w-3.5" />
    ) : (
      <ChevronDown className="ml-1 inline-block h-3.5 w-3.5" />
    );
  };

  if (authLoading || loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-50">
        <div className="rounded-2xl border border-slate-200 bg-white px-8 py-6 text-sm font-medium text-slate-600 shadow-sm">
          데이터를 불러오는 중입니다...
        </div>
      </div>
    );
  }

  if (!authorized) {
    return null;
  }

  return (
    <div className="min-h-screen bg-slate-50">
      <div className="sticky top-0 z-20 border-b border-slate-200 bg-white/95 backdrop-blur">
        <div className="mx-auto flex max-w-[1800px] flex-col gap-4 px-6 py-4 xl:flex-row xl:items-center xl:justify-between">
          <div className="flex items-center gap-4">
            <Link
              href="/"
              className="flex h-10 w-10 items-center justify-center rounded-xl border border-slate-200 text-slate-600 transition hover:bg-slate-100"
            >
              <ArrowLeft className="h-5 w-5" />
            </Link>

            <div>
              <h1 className="text-2xl font-bold tracking-tight text-slate-900">
                이윤 분석 대시보드
              </h1>
              <p className="mt-1 text-sm text-slate-500">
                회사별 출고일, 환율, 원가, 판매가를 확인하고 각 행별로 저장할 수 있습니다.
              </p>
            </div>
          </div>

          <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-center">
            <div className="flex items-center gap-2 rounded-xl border border-slate-200 bg-slate-50 px-3 py-2">
              <Search className="h-4 w-4 text-slate-500" />
              <input
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="회사 / 디자인코드 / 차수 검색"
                className="w-[220px] bg-transparent text-sm font-medium text-slate-700 outline-none placeholder:text-slate-400"
              />
            </div>

            <div className="flex items-center gap-2 rounded-xl border border-slate-200 bg-slate-50 px-3 py-2">
              <Building2 className="h-4 w-4 text-slate-500" />
              <select
                value={companyFilter}
                onChange={(e) => setCompanyFilter(e.target.value)}
                className="bg-transparent text-sm font-medium text-slate-700 outline-none"
              >
                {companyOptions.map((company) => (
                  <option key={company} value={company}>
                    {company}
                  </option>
                ))}
              </select>
            </div>

            <button
              onClick={handleSaveAll}
              disabled={saving}
              className="inline-flex h-11 items-center justify-center gap-2 rounded-xl bg-slate-900 px-5 text-sm font-semibold text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-50"
            >
              <Save className="h-4 w-4" />
              {saving ? '전체 저장 중...' : '전체 저장'}
            </button>
          </div>
        </div>
      </div>

      <div className="mx-auto max-w-[1800px] space-y-6 px-6 py-6">
        <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
          <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
            <div className="mb-3 flex items-center gap-2 text-sm font-medium text-slate-500">
              <Building2 className="h-4 w-4" />
              선택된 회사
            </div>
            <div className="text-3xl font-bold tracking-tight text-slate-900">
              {companyFilter}
            </div>
          </div>

          <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
            <div className="mb-3 flex items-center gap-2 text-sm font-medium text-slate-500">
              <Wallet className="h-4 w-4" />
              전체 총이윤
            </div>
            <div className="text-3xl font-bold tracking-tight text-slate-900">
              {formatCurrency(kpi.totalProfit)}
            </div>
          </div>

          <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
            <div className="mb-3 flex items-center gap-2 text-sm font-medium text-slate-500">
              <Package2 className="h-4 w-4" />
              전체 총수량
            </div>
            <div className="text-3xl font-bold tracking-tight text-slate-900">
              {kpi.totalQuantity.toLocaleString()}
            </div>
          </div>
        </div>

        <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
          <div className="border-b border-slate-200 bg-slate-50 px-5 py-4">
            <div className="text-sm font-semibold text-slate-800">
              이윤 상세 목록
            </div>
            <div className="mt-1 text-xs text-slate-500">
              서류비는 103,000원 ÷ 총수량, 기타비용은 20,000원 ÷ 총수량으로 자동 계산됩니다.
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full min-w-[2100px] table-auto text-sm">
              <thead className="bg-slate-100">
                <tr className="border-b border-slate-200">
                  <th
                    onClick={() => handleSort('companyName')}
                    className="cursor-pointer whitespace-nowrap px-4 py-4 text-left text-xs font-bold tracking-wide text-slate-700"
                  >
                    회사 {renderSortIcon('companyName')}
                  </th>
                  <th
                    onClick={() => handleSort('designCode')}
                    className="cursor-pointer whitespace-nowrap px-4 py-4 text-left text-xs font-bold tracking-wide text-slate-700"
                  >
                    디자인 {renderSortIcon('designCode')}
                  </th>
                  <th
                    onClick={() => handleSort('round')}
                    className="cursor-pointer whitespace-nowrap px-4 py-4 text-left text-xs font-bold tracking-wide text-slate-700"
                  >
                    차수 {renderSortIcon('round')}
                  </th>
                  <th
                    onClick={() => handleSort('shippingDate')}
                    className="cursor-pointer whitespace-nowrap px-4 py-4 text-left text-xs font-bold tracking-wide text-slate-700"
                  >
                    출고일 {renderSortIcon('shippingDate')}
                  </th>
                  <th
                    onClick={() => handleSort('totalQuantity')}
                    className="cursor-pointer whitespace-nowrap px-4 py-4 text-right text-xs font-bold tracking-wide text-slate-700"
                  >
                    수량 {renderSortIcon('totalQuantity')}
                  </th>
                  <th
                    onClick={() => handleSort('exchangeRate')}
                    className="cursor-pointer whitespace-nowrap px-4 py-4 text-right text-xs font-bold tracking-wide text-slate-700"
                  >
                    환율 {renderSortIcon('exchangeRate')}
                  </th>
                  <th
                    onClick={() => handleSort('costCNY')}
                    className="cursor-pointer whitespace-nowrap px-4 py-4 text-right text-xs font-bold tracking-wide text-slate-700"
                  >
                    원가(CNY) {renderSortIcon('costCNY')}
                  </th>
                  <th className="whitespace-nowrap px-4 py-4 text-right text-xs font-bold tracking-wide text-slate-700">
                    물류비
                  </th>
                  <th className="whitespace-nowrap px-4 py-4 text-right text-xs font-bold tracking-wide text-slate-700">
                    검품비
                  </th>
                  <th className="whitespace-nowrap px-4 py-4 text-right text-xs font-bold tracking-wide text-slate-700">
                    서류비
                  </th>
                  <th className="whitespace-nowrap px-4 py-4 text-right text-xs font-bold tracking-wide text-slate-700">
                    기타비용
                  </th>
                  <th className="whitespace-nowrap px-4 py-4 text-right text-xs font-bold tracking-wide text-slate-700">
                    관세
                  </th>
                  <th className="whitespace-nowrap px-4 py-4 text-right text-xs font-bold tracking-wide text-slate-700">
                    원화원가
                  </th>
                  <th className="whitespace-nowrap px-4 py-4 text-right text-xs font-bold tracking-wide text-slate-700">
                    장당원가
                  </th>
                  <th
                    onClick={() => handleSort('sellingPrice')}
                    className="cursor-pointer whitespace-nowrap px-4 py-4 text-right text-xs font-bold tracking-wide text-slate-700"
                  >
                    판매가 {renderSortIcon('sellingPrice')}
                  </th>
                  <th className="whitespace-nowrap px-4 py-4 text-right text-xs font-bold tracking-wide text-slate-700">
                    장당이윤
                  </th>
                  <th
                    onClick={() => handleSort('totalProfit')}
                    className="cursor-pointer whitespace-nowrap px-4 py-4 text-right text-xs font-bold tracking-wide text-slate-700"
                  >
                    총이윤 {renderSortIcon('totalProfit')}
                  </th>
                  <th className="whitespace-nowrap px-4 py-4 text-center text-xs font-bold tracking-wide text-slate-700">
                    저장
                  </th>
                </tr>
              </thead>

              <tbody>
                {sortedDataWithCalc.length === 0 ? (
                  <tr>
                    <td
                      colSpan={18}
                      className="px-6 py-12 text-center text-sm text-slate-500"
                    >
                      표시할 데이터가 없습니다.
                    </td>
                  </tr>
                ) : (
                  sortedDataWithCalc.map((row, index) => (
                    <tr
                      key={row.id}
                      className={`border-b border-slate-100 transition hover:bg-slate-50 ${
                        index % 2 === 0 ? 'bg-white' : 'bg-slate-50/40'
                      }`}
                    >
                      <td className="whitespace-nowrap px-4 py-4 font-medium text-slate-800">
                        <div className="min-w-[110px]">{row.companyName}</div>
                      </td>

                      <td className="whitespace-nowrap px-4 py-4 font-semibold text-slate-900">
                        <div className="min-w-[90px]">{row.designCode}</div>
                      </td>

                      <td className="whitespace-nowrap px-4 py-4 text-slate-700">
                        <div className="min-w-[70px]">{row.round}</div>
                      </td>

                      <td className="whitespace-nowrap px-4 py-4">
                        <input
                          type="date"
                          value={row.shippingDate}
                          onChange={(e) =>
                            handleShippingDateChange(row.id, e.target.value)
                          }
                          className="h-11 min-w-[150px] rounded-xl border border-slate-200 bg-white px-3 text-sm text-slate-700 outline-none transition focus:border-slate-400"
                        />
                      </td>

                      <td className="whitespace-nowrap px-4 py-4 text-right font-medium text-slate-800">
                        <div className="min-w-[70px]">
                          {row.totalQuantity.toLocaleString()}
                        </div>
                      </td>

                      <td className="whitespace-nowrap px-4 py-4 text-right">
                        <input
                          type="number"
                          value={row.exchangeRate}
                          onChange={(e) =>
                            handleUpdateField(
                              row.id,
                              'exchangeRate',
                              parseFloat(e.target.value) || 0
                            )
                          }
                          className="h-11 w-[110px] rounded-xl border border-slate-200 bg-white px-3 text-right text-sm font-medium text-slate-800 outline-none transition focus:border-slate-400"
                        />
                      </td>

                      <td className="whitespace-nowrap px-4 py-4 text-right">
                        <input
                          type="number"
                          value={row.costCNY}
                          onChange={(e) =>
                            handleUpdateField(
                              row.id,
                              'costCNY',
                              parseFloat(e.target.value) || 0
                            )
                          }
                          className="h-11 w-[120px] rounded-xl border border-slate-200 bg-white px-3 text-right text-sm font-medium text-slate-800 outline-none transition focus:border-slate-400"
                        />
                      </td>

                      <td className="whitespace-nowrap px-4 py-4 text-right">
                        <input
                          type="number"
                          value={row.shippingFeePer}
                          onChange={(e) =>
                            handleUpdateField(
                              row.id,
                              'shippingFeePer',
                              parseFloat(e.target.value) || 0
                            )
                          }
                          className="h-11 w-[110px] rounded-xl border border-slate-200 bg-white px-3 text-right text-sm font-medium text-slate-800 outline-none transition focus:border-slate-400"
                        />
                      </td>

                      <td className="whitespace-nowrap px-4 py-4 text-right">
                        <input
                          type="number"
                          value={row.inspectionFeePer}
                          onChange={(e) =>
                            handleUpdateField(
                              row.id,
                              'inspectionFeePer',
                              parseFloat(e.target.value) || 0
                            )
                          }
                          className="h-11 w-[110px] rounded-xl border border-slate-200 bg-white px-3 text-right text-sm font-medium text-slate-800 outline-none transition focus:border-slate-400"
                        />
                      </td>

                      <td className="whitespace-nowrap px-4 py-4 text-right text-slate-700">
                        <div className="min-w-[100px] rounded-lg bg-slate-50 px-3 py-2">
                          {formatCurrency(row.calculations.documentFeePer)}
                        </div>
                      </td>

                      <td className="whitespace-nowrap px-4 py-4 text-right text-slate-700">
                        <div className="min-w-[100px] rounded-lg bg-slate-50 px-3 py-2">
                          {formatCurrency(row.calculations.otherCostPer)}
                        </div>
                      </td>

                      <td className="whitespace-nowrap px-4 py-4 text-right">
                        <input
                          type="number"
                          value={row.tariffRate}
                          onChange={(e) =>
                            handleUpdateField(
                              row.id,
                              'tariffRate',
                              parseFloat(e.target.value) || 0
                            )
                          }
                          className="h-11 w-[110px] rounded-xl border border-slate-200 bg-white px-3 text-right text-sm font-medium text-slate-800 outline-none transition focus:border-slate-400"
                        />
                      </td>

                      <td className="whitespace-nowrap px-4 py-4 text-right font-semibold text-slate-800">
                        <div className="min-w-[110px] rounded-lg bg-slate-50 px-3 py-2">
                          {formatCurrency(row.calculations.baseCostPerUnit)}
                        </div>
                      </td>

                      <td className="whitespace-nowrap px-4 py-4 text-right font-bold text-slate-900">
                        <div className="min-w-[110px] rounded-lg bg-amber-50 px-3 py-2">
                          {formatCurrency(row.calculations.costPerUnit)}
                        </div>
                      </td>

                      <td className="whitespace-nowrap px-4 py-4 text-right">
                        <input
                          type="number"
                          value={row.sellingPrice}
                          onChange={(e) =>
                            handleUpdateField(
                              row.id,
                              'sellingPrice',
                              parseFloat(e.target.value) || 0
                            )
                          }
                          className="h-11 w-[120px] rounded-xl border border-slate-200 bg-white px-3 text-right text-sm font-medium text-slate-800 outline-none transition focus:border-slate-400"
                        />
                      </td>

                      <td className="whitespace-nowrap px-4 py-4 text-right font-bold text-blue-600">
                        <div className="min-w-[105px]">
                          {formatCurrency(row.calculations.profitPerUnit)}
                        </div>
                      </td>

                      <td className="whitespace-nowrap px-4 py-4 text-right font-extrabold text-emerald-600">
                        <div className="min-w-[120px] rounded-lg bg-emerald-50 px-3 py-2">
                          {formatCurrency(row.calculations.totalProfit)}
                        </div>
                      </td>

                      <td className="whitespace-nowrap px-4 py-4 text-center">
                        <button
                          onClick={() => handleSaveRow(row)}
                          disabled={savingRowId === row.id}
                          className="inline-flex h-10 min-w-[88px] items-center justify-center gap-2 rounded-xl bg-blue-600 px-4 text-xs font-semibold text-white transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-50"
                        >
                          <Save className="h-3.5 w-3.5" />
                          {savingRowId === row.id ? '저장중' : '저장'}
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>

        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <div className="mb-3 text-sm font-semibold text-slate-800">
            계산 기준
          </div>
          <div className="space-y-1 text-sm leading-7 text-slate-600">
            <div>원화 원가 = 원가(CNY) × 환율</div>
            <div>서류비 = 103,000원 ÷ 총수량</div>
            <div>기타비용 = 20,000원 ÷ 총수량</div>
            <div>
              장당 원가 = 원화 원가 + 물류비 + 검품비 + 서류비 + 기타비용 + 관세
            </div>
            <div>장당 이윤 = 판매가 - 장당 원가</div>
            <div>총이윤 = 장당 이윤 × 총수량</div>
            <div>
              환율은 출고일 기준 앞뒤 5일 이내 중 가장 높은 환율을 자동 적용
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}