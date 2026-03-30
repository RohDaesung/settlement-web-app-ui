'use client';

import { useEffect, useState } from 'react';
import { ArrowLeft, Menu, X } from 'lucide-react';
import Link from 'next/link';
import { Sidebar } from '@/components/sidebar';
import { RoundHeader } from '@/components/round-header';
import { SettlementTab } from '@/components/settlement-tab';
import type { SettlementState, RoundData } from '@/lib/types';
import { supabase } from '@/lib/supabase/client';

export default function SettlementPage() {
  const [authLoading, setAuthLoading] = useState(true);
  const [authorized, setAuthorized] = useState(false);

  const [state, setState] = useState<SettlementState>({
    vendors: [],
    recentItems: [],
  } as any);

  const [selectedVendorId, setSelectedVendorId] = useState<string>('');
  const [selectedStyleId, setSelectedStyleId] = useState<string>('');
  const [selectedRoundId, setSelectedRoundId] = useState<string>('');

  const [searchQuery, setSearchQuery] = useState('');
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);

  useEffect(() => {
    let cancelled = false;

    const checkAccess = async () => {
      try {
        const { data: authData, error: authError } = await supabase.auth.getUser();

        if (authError || !authData.user) {
          alert('로그인이 필요합니다.');
          window.location.href = '/';
          return;
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
          return;
        }

        if (profile.status !== 'approved') {
          await supabase.auth.signOut();
          alert('승인되지 않은 계정입니다.');
          window.location.href = '/';
          return;
        }

        if (profile.role !== 'admin') {
          alert('정산표 페이지는 총운영자만 접근할 수 있습니다.');
          window.location.href = '/shipment-management';
          return;
        }

        if (!cancelled) {
          setAuthorized(true);
        }
      } catch (error) {
        console.error('checkAccess error:', error);
        alert('권한 확인 중 오류가 발생했습니다.');
        window.location.href = '/';
      } finally {
        if (!cancelled) {
          setAuthLoading(false);
        }
      }
    };

    checkAccess();

    return () => {
      cancelled = true;
    };
  }, []);

  const refreshTree = async (opts?: {
    keepSelection?: boolean;
    preferSelect?: { vendorId?: string; styleId?: string; roundId?: string };
  }) => {
    const res = await fetch('/api/tree', { cache: 'no-store' });
    const json = await res.json();
    const vendors = json.vendors ?? [];

    setState((prev) => ({ ...prev, vendors }));

    const keepSelection = opts?.keepSelection ?? true;
    const prefer = opts?.preferSelect;

    if (prefer?.vendorId) {
      setSelectedVendorId(prefer.vendorId);
      setSelectedStyleId(prefer.styleId ?? '');
      setSelectedRoundId(prefer.roundId ?? '');
      return;
    }

    if (keepSelection && selectedVendorId) return;

    if (vendors.length > 0) {
      const v0 = vendors[0];
      setSelectedVendorId(v0.id);

      const s0 = v0.styles?.[0];
      setSelectedStyleId(s0?.id ?? '');

      const r0 = s0?.rounds?.[0];
      setSelectedRoundId(r0?.id ?? '');
    } else {
      setSelectedVendorId('');
      setSelectedStyleId('');
      setSelectedRoundId('');
    }
  };

  useEffect(() => {
    if (!authorized) return;
    refreshTree({ keepSelection: false });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [authorized]);

  const selectedVendor = state.vendors.find((v) => v.id === selectedVendorId);
  const selectedStyle = selectedVendor?.styles.find((s) => s.id === selectedStyleId);
  const selectedRound = selectedStyle?.rounds.find((r) => r.id === selectedRoundId);

  const handleSelectVendor = (vendorId: string) => {
    setSelectedVendorId(vendorId);

    const vendor = state.vendors.find((v) => v.id === vendorId);
    const s0 = vendor?.styles?.[0];

    setSelectedStyleId(s0?.id ?? '');
    setSelectedRoundId(s0?.rounds?.[0]?.id ?? '');
  };

  const handleSelectStyle = (vendorId: string, styleId: string) => {
    setSelectedVendorId(vendorId);
    setSelectedStyleId(styleId);

    const vendor = state.vendors.find((v) => v.id === vendorId);
    const style = vendor?.styles.find((s) => s.id === styleId);

    setSelectedRoundId(style?.rounds?.[0]?.id ?? '');
  };

  const handleSelectRound = (vendorId: string, styleId: string, roundId: string) => {
    setSelectedVendorId(vendorId);
    setSelectedStyleId(styleId);
    setSelectedRoundId(roundId);
  };

  const handleSelectRecent = (vendorCode: string, styleCode: string) => {
    const vendor = state.vendors.find((v) => v.code === vendorCode);
    if (vendor) {
      const style = vendor.styles.find((s) => s.code === styleCode);
      if (style && style.rounds.length > 0) {
        handleSelectStyle(vendor.id, style.id);
        setSelectedRoundId(style.rounds[0].id);
      }
    }
  };

  const handleRoundUpdate = (updatedRound: RoundData) => {
    if (!selectedVendor || !selectedStyle) return;

    const newVendors = state.vendors.map((v) => {
      if (v.id !== selectedVendorId) return v;
      return {
        ...v,
        styles: v.styles.map((s) => {
          if (s.id !== selectedStyleId) return s;
          return {
            ...s,
            rounds: s.rounds.map((r) => (r.id === selectedRoundId ? updatedRound : r)),
          };
        }),
      };
    });

    setState({ ...state, vendors: newVendors });
  };

  const handleAddVendor = async (code: string, name: string) => {
    const { data, error } = await supabase
      .from('vendors')
      .insert({ code, name })
      .select('id, code, name, created_at')
      .single();

    if (error) {
      alert(error.message);
      return;
    }

    await refreshTree({ preferSelect: { vendorId: data.id } });
  };

  const handleAddStyle = async (code: string, name: string) => {
    if (!selectedVendorId) {
      alert('거래처를 먼저 선택해주세요.');
      return;
    }

    const { data, error } = await supabase
      .from('styles')
      .insert({ vendor_id: selectedVendorId, code, name: name || code })
      .select('id, vendor_id, code, name, created_at')
      .single();

    if (error) {
      alert(error.message);
      return;
    }

    await refreshTree({
      preferSelect: { vendorId: selectedVendorId, styleId: data.id, roundId: '' },
    });
  };

  const handleAddRound = async (roundName: string) => {
    if (!selectedStyleId || !selectedVendorId) {
      alert('스타일을 먼저 선택해주세요.');
      return;
    }

    const { data: round, error: rErr } = await supabase
      .from('rounds')
      .insert({ style_id: selectedStyleId, name: roundName, with_vat: true })
      .select('id, style_id, name, with_vat, created_at')
      .single();

    if (rErr) {
      alert(rErr.message);
      return;
    }

    const { error: sumErr } = await supabase
      .from('round_summaries')
      .upsert({ round_id: round.id, total_amount: 0, deposit_amount: 0, balance_amount: 0 });

    if (sumErr) {
      console.warn(sumErr.message);
    }

    await refreshTree({
      preferSelect: { vendorId: selectedVendorId, styleId: selectedStyleId, roundId: round.id },
    });
  };

  const handleEditVendor = async (vendorId: string, newName: string) => {
    const { error } = await supabase.from('vendors').update({ name: newName }).eq('id', vendorId);
    if (error) {
      alert(error.message);
      return;
    }
    await refreshTree({ keepSelection: true });
  };

  const handleEditStyle = async (_vendorId: string, styleId: string, newName: string) => {
    const { error } = await supabase.from('styles').update({ name: newName }).eq('id', styleId);
    if (error) {
      alert(error.message);
      return;
    }
    await refreshTree({ keepSelection: true });
  };

  const handleEditRound = async (
    _vendorId: string,
    _styleId: string,
    roundId: string,
    newName: string
  ) => {
    const { error } = await supabase.from('rounds').update({ name: newName }).eq('id', roundId);
    if (error) {
      alert(error.message);
      return;
    }
    await refreshTree({ keepSelection: true });
  };

  const handleDeleteRound = async (
    vendorId: string,
    styleId: string,
    roundId: string,
    roundName?: string
  ) => {
    const ok = window.confirm(
      `차수${roundName ? ` "${roundName}"` : ''}를 삭제할까요?\n연결된 정산 항목, 정산 합계, 마진 데이터도 함께 삭제됩니다.`
    );
    if (!ok) return;

    const { error: itemsError } = await supabase
      .from('settlement_items')
      .delete()
      .eq('round_id', roundId);

    if (itemsError) {
      alert(itemsError.message);
      return;
    }

    const { error: summaryError } = await supabase
      .from('round_summaries')
      .delete()
      .eq('round_id', roundId);

    if (summaryError) {
      alert(summaryError.message);
      return;
    }

    const { error: marginError } = await supabase
      .from('margin_rows')
      .delete()
      .eq('round_id', roundId);

    if (marginError) {
      alert(marginError.message);
      return;
    }

    const { error: roundError } = await supabase.from('rounds').delete().eq('id', roundId);

    if (roundError) {
      alert(roundError.message);
      return;
    }

    const vendor = state.vendors.find((v) => v.id === vendorId);
    const style = vendor?.styles.find((s) => s.id === styleId);
    const remainRounds = style?.rounds.filter((r) => r.id !== roundId) ?? [];

    await refreshTree({
      preferSelect: {
        vendorId,
        styleId,
        roundId: remainRounds[0]?.id ?? '',
      },
    });
  };

  const handleDeleteStyle = async (vendorId: string, styleId: string, styleName?: string) => {
    const ok = window.confirm(
      `디자인${styleName ? ` "${styleName}"` : ''}을 삭제할까요?\n하위 차수, 정산 항목, 정산 합계, 마진 데이터가 모두 삭제됩니다.`
    );
    if (!ok) return;

    const { data: roundsData, error: roundsLoadError } = await supabase
      .from('rounds')
      .select('id')
      .eq('style_id', styleId);

    if (roundsLoadError) {
      alert(roundsLoadError.message);
      return;
    }

    const roundIds = (roundsData ?? []).map((r) => r.id);

    if (roundIds.length > 0) {
      const { error: itemsError } = await supabase
        .from('settlement_items')
        .delete()
        .in('round_id', roundIds);

      if (itemsError) {
        alert(itemsError.message);
        return;
      }

      const { error: summariesError } = await supabase
        .from('round_summaries')
        .delete()
        .in('round_id', roundIds);

      if (summariesError) {
        alert(summariesError.message);
        return;
      }

      const { error: marginError } = await supabase
        .from('margin_rows')
        .delete()
        .in('round_id', roundIds);

      if (marginError) {
        alert(marginError.message);
        return;
      }

      const { error: roundsDeleteError } = await supabase
        .from('rounds')
        .delete()
        .in('id', roundIds);

      if (roundsDeleteError) {
        alert(roundsDeleteError.message);
        return;
      }
    }

    const { error: styleDeleteError } = await supabase
      .from('styles')
      .delete()
      .eq('id', styleId);

    if (styleDeleteError) {
      alert(styleDeleteError.message);
      return;
    }

    const vendor = state.vendors.find((v) => v.id === vendorId);
    const remainStyles = vendor?.styles.filter((s) => s.id !== styleId) ?? [];

    await refreshTree({
      preferSelect: {
        vendorId,
        styleId: remainStyles[0]?.id ?? '',
        roundId: remainStyles[0]?.rounds?.[0]?.id ?? '',
      },
    });
  };

  const handleDeleteVendor = async (vendorId: string, vendorName?: string) => {
    const ok = window.confirm(
      `거래처${vendorName ? ` "${vendorName}"` : ''}를 삭제할까요?\n하위 디자인, 차수, 정산 항목, 정산 합계, 마진 데이터가 모두 삭제됩니다.`
    );
    if (!ok) return;

    const { data: stylesData, error: stylesLoadError } = await supabase
      .from('styles')
      .select('id')
      .eq('vendor_id', vendorId);

    if (stylesLoadError) {
      alert(stylesLoadError.message);
      return;
    }

    const styleIds = (stylesData ?? []).map((s) => s.id);

    if (styleIds.length > 0) {
      const { data: roundsData, error: roundsLoadError } = await supabase
        .from('rounds')
        .select('id')
        .in('style_id', styleIds);

      if (roundsLoadError) {
        alert(roundsLoadError.message);
        return;
      }

      const roundIds = (roundsData ?? []).map((r) => r.id);

      if (roundIds.length > 0) {
        const { error: itemsError } = await supabase
          .from('settlement_items')
          .delete()
          .in('round_id', roundIds);

        if (itemsError) {
          alert(itemsError.message);
          return;
        }

        const { error: summariesError } = await supabase
          .from('round_summaries')
          .delete()
          .in('round_id', roundIds);

        if (summariesError) {
          alert(summariesError.message);
          return;
        }

        const { error: marginError } = await supabase
          .from('margin_rows')
          .delete()
          .in('round_id', roundIds);

        if (marginError) {
          alert(marginError.message);
          return;
        }

        const { error: roundsDeleteError } = await supabase
          .from('rounds')
          .delete()
          .in('id', roundIds);

        if (roundsDeleteError) {
          alert(roundsDeleteError.message);
          return;
        }
      }

      const { error: stylesDeleteError } = await supabase
        .from('styles')
        .delete()
        .in('id', styleIds);

      if (stylesDeleteError) {
        alert(stylesDeleteError.message);
        return;
      }
    }

    const { error: vendorDeleteError } = await supabase
      .from('vendors')
      .delete()
      .eq('id', vendorId);

    if (vendorDeleteError) {
      alert(vendorDeleteError.message);
      return;
    }

    await refreshTree({ keepSelection: false });
  };

  if (authLoading) {
    return (
      <div className="min-h-screen bg-white flex items-center justify-center">
        <div className="text-sm text-slate-600">권한 확인 중...</div>
      </div>
    );
  }

  if (!authorized) {
    return null;
  }

  return (
    <div className="h-screen bg-white flex flex-col">
      <div className="border-b border-slate-200 px-3 sm:px-6 py-3 sm:py-4 bg-white flex items-center justify-between">
        <Link href="/">
          <button className="flex items-center gap-2 text-slate-600 hover:text-slate-900 font-medium text-xs sm:text-sm transition-colors">
            <ArrowLeft className="w-3 h-3 sm:w-4 sm:h-4" />
            돌아가기
          </button>
        </Link>
        <button
          onClick={() => setIsSidebarOpen(!isSidebarOpen)}
          className="lg:hidden p-2 text-slate-600 hover:text-slate-900 hover:bg-slate-100 rounded transition-colors"
        >
          <Menu className="w-5 h-5" />
        </button>
      </div>

      <div className="flex flex-1 overflow-hidden bg-white relative">
        <div className="hidden lg:block w-80 border-r border-gray-200 overflow-hidden flex-col">
          <Sidebar
            vendors={state.vendors}
            selectedVendorId={selectedVendorId}
            selectedStyleId={selectedStyleId}
            selectedRoundId={selectedRoundId}
            searchQuery={searchQuery}
            onSearchChange={setSearchQuery}
            onSelectVendor={handleSelectVendor}
            onSelectStyle={handleSelectStyle}
            onSelectRound={handleSelectRound}
            recentItems={state.recentItems}
            onSelectRecent={handleSelectRecent}
            onAddVendor={handleAddVendor as any}
            onAddStyle={handleAddStyle as any}
            onAddRound={handleAddRound as any}
            onEditVendor={handleEditVendor as any}
            onEditStyle={handleEditStyle as any}
            onEditRound={handleEditRound as any}
            onDeleteVendor={handleDeleteVendor as any}
            onDeleteStyle={handleDeleteStyle as any}
            onDeleteRound={handleDeleteRound as any}
          />
        </div>

        {isSidebarOpen && (
          <>
            <div
              className="lg:hidden fixed inset-0 bg-black/50 z-40"
              onClick={() => setIsSidebarOpen(false)}
            />
            <div className="lg:hidden fixed inset-y-0 left-0 w-80 bg-white z-50 shadow-xl flex flex-col">
              <div className="flex items-center justify-between p-4 border-b border-gray-200">
                <h2 className="text-lg font-semibold text-gray-900">메뉴</h2>
                <button
                  onClick={() => setIsSidebarOpen(false)}
                  className="p-2 text-slate-600 hover:text-slate-900 hover:bg-slate-100 rounded transition-colors"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
              <div className="flex-1 overflow-hidden">
                <Sidebar
                  vendors={state.vendors}
                  selectedVendorId={selectedVendorId}
                  selectedStyleId={selectedStyleId}
                  selectedRoundId={selectedRoundId}
                  searchQuery={searchQuery}
                  onSearchChange={setSearchQuery}
                  onSelectVendor={(id) => {
                    handleSelectVendor(id);
                    setIsSidebarOpen(false);
                  }}
                  onSelectStyle={(vendorId, styleId) => {
                    handleSelectStyle(vendorId, styleId);
                    setIsSidebarOpen(false);
                  }}
                  onSelectRound={(vendorId, styleId, roundId) => {
                    handleSelectRound(vendorId, styleId, roundId);
                    setIsSidebarOpen(false);
                  }}
                  recentItems={state.recentItems}
                  onSelectRecent={(vendorCode, styleCode) => {
                    handleSelectRecent(vendorCode, styleCode);
                    setIsSidebarOpen(false);
                  }}
                  onAddVendor={handleAddVendor as any}
                  onAddStyle={handleAddStyle as any}
                  onAddRound={handleAddRound as any}
                  onEditVendor={handleEditVendor as any}
                  onEditStyle={handleEditStyle as any}
                  onEditRound={handleEditRound as any}
                  onDeleteVendor={handleDeleteVendor as any}
                  onDeleteStyle={handleDeleteStyle as any}
                  onDeleteRound={handleDeleteRound as any}
                />
              </div>
            </div>
          </>
        )}

        <div className="flex-1 overflow-hidden flex flex-col">
          {selectedVendor && selectedStyle && selectedRound ? (
            <>
              <RoundHeader vendor={selectedVendor} style={selectedStyle} round={selectedRound} />
              <div className="flex-1 overflow-y-auto">
                <div className="p-3 sm:p-6">
                  <SettlementTab
                    round={selectedRound}
                    vendorName={selectedVendor.name}
                    styleName={selectedStyle.name}
                    onUpdate={handleRoundUpdate}
                  />
                </div>
              </div>
            </>
          ) : (
            <div className="flex-1 flex items-center justify-center">
              <div className="text-center space-y-4">
                <p className="text-lg font-semibold text-gray-900">정산표를 준비 중입니다</p>
                <p className="text-sm text-gray-600">
                  왼쪽 메뉴에서 거래처, 품번, 차수를 선택해주세요
                </p>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}