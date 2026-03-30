'use client';

import { useState } from 'react';
import { Search, Plus } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import { FolderTree } from './folder-tree';
import { Vendor } from '@/lib/types';

interface SidebarProps {
  vendors: Vendor[];
  selectedVendorId?: string;
  selectedStyleId?: string;
  selectedRoundId?: string;
  searchQuery: string;
  onSearchChange: (query: string) => void;
  onSelectVendor: (vendorId: string) => void;
  onSelectStyle: (vendorId: string, styleId: string) => void;
  onSelectRound: (vendorId: string, styleId: string, roundId: string) => void;
  recentItems: Array<{ vendorCode: string; styleCode: string; roundName: string }>;
  onSelectRecent: (vendorCode: string, styleCode: string) => void;
  onAddVendor: (code: string, name: string) => void;
  onAddStyle: (code: string, name: string) => void;
  onAddRound: (name: string) => void;
  onEditVendor: (vendorId: string, newName: string) => void;
  onEditStyle: (vendorId: string, styleId: string, newName: string) => void;
  onEditRound: (vendorId: string, styleId: string, roundId: string, newName: string) => void;
  onDeleteVendor: (vendorId: string, vendorName?: string) => void;
  onDeleteStyle: (vendorId: string, styleId: string, styleName?: string) => void;
  onDeleteRound: (
    vendorId: string,
    styleId: string,
    roundId: string,
    roundName?: string
  ) => void;
}

export function Sidebar({
  vendors,
  selectedVendorId,
  selectedStyleId,
  selectedRoundId,
  searchQuery,
  onSearchChange,
  onSelectVendor,
  onSelectStyle,
  onSelectRound,
  recentItems,
  onSelectRecent,
  onAddVendor,
  onAddStyle,
  onAddRound,
  onEditVendor,
  onEditStyle,
  onEditRound,
  onDeleteVendor,
  onDeleteStyle,
  onDeleteRound,
}: SidebarProps) {
  const [showAddVendorModal, setShowAddVendorModal] = useState(false);
  const [showAddStyleModal, setShowAddStyleModal] = useState(false);
  const [showAddRoundModal, setShowAddRoundModal] = useState(false);
  const [showEditVendorModal, setShowEditVendorModal] = useState(false);
  const [showEditStyleModal, setShowEditStyleModal] = useState(false);
  const [showEditRoundModal, setShowEditRoundModal] = useState(false);

  const [vendorNumber, setVendorNumber] = useState('');
  const [vendorName, setVendorName] = useState('');
  const [styleCode, setStyleCode] = useState('');
  const [styleName, setStyleName] = useState('');
  const [roundNumber, setRoundNumber] = useState('');
  const [error, setError] = useState('');

  const [editingVendorId, setEditingVendorId] = useState('');
  const [editingStyleId, setEditingStyleId] = useState('');
  const [editingRoundId, setEditingRoundId] = useState('');
  const [editName, setEditName] = useState('');

  const handleSubmitVendor = () => {
    setError('');

    if (!vendorNumber.trim()) {
      setError('거래처 번호를 입력해주세요.');
      return;
    }

    if (!vendorName.trim()) {
      setError('거래처명을 입력해주세요.');
      return;
    }

    if (vendors.some((v) => v.code === vendorNumber.trim())) {
      setError(`거래처 번호 "${vendorNumber.trim()}"은(는) 이미 존재합니다.`);
      return;
    }

    onAddVendor(vendorNumber.trim(), vendorName.trim());
    setVendorNumber('');
    setVendorName('');
    setShowAddVendorModal(false);
  };

  const handleSubmitStyle = () => {
    setError('');

    if (!styleCode.trim()) {
      setError('스타일 코드를 입력해주세요.');
      return;
    }

    const selectedVendor = vendors.find((v) => v.id === selectedVendorId);
    if (!selectedVendor) {
      setError('거래처를 먼저 선택해주세요.');
      return;
    }

    if (selectedVendor.styles.some((s) => s.code === styleCode.trim())) {
      setError(`스타일 코드 "${styleCode.trim()}"은(는) 이미 존재합니다.`);
      return;
    }

    onAddStyle(styleCode.trim(), styleName.trim());
    setStyleCode('');
    setStyleName('');
    setShowAddStyleModal(false);
  };

  const handleSubmitRound = () => {
    setError('');

    if (!roundNumber.trim()) {
      setError('차수 번호를 입력해주세요.');
      return;
    }

    const selectedVendor = vendors.find((v) => v.id === selectedVendorId);
    const selectedStyle = selectedVendor?.styles.find((s) => s.id === selectedStyleId);

    if (!selectedStyle) {
      setError('스타일을 먼저 선택해주세요.');
      return;
    }

    if (selectedStyle.rounds.some((r) => r.name === `${roundNumber.trim()}차`)) {
      setError(`차수 "${roundNumber.trim()}차"는 이미 존재합니다.`);
      return;
    }

    onAddRound(`${roundNumber.trim()}차`);
    setRoundNumber('');
    setShowAddRoundModal(false);
  };

  const handleEditVendorClick = (vendorId: string, currentName: string) => {
    setEditingVendorId(vendorId);
    setEditName(currentName);
    setShowEditVendorModal(true);
    setError('');
  };

  const handleSubmitEditVendor = () => {
    setError('');

    if (!editName.trim()) {
      setError('거래처명을 입력해주세요.');
      return;
    }

    onEditVendor(editingVendorId, editName.trim());
    setShowEditVendorModal(false);
    setEditName('');
  };

  const handleEditStyleClick = (styleId: string, currentName: string) => {
    setEditingStyleId(styleId);
    setEditName(currentName);
    setShowEditStyleModal(true);
    setError('');
  };

  const handleSubmitEditStyle = () => {
    setError('');

    if (!editName.trim()) {
      setError('스타일명을 입력해주세요.');
      return;
    }

    onEditStyle(selectedVendorId || '', editingStyleId, editName.trim());
    setShowEditStyleModal(false);
    setEditName('');
  };

  const handleEditRoundClick = (roundId: string, currentName: string) => {
    setEditingRoundId(roundId);
    setEditName(currentName);
    setShowEditRoundModal(true);
    setError('');
  };

  const handleSubmitEditRound = () => {
    setError('');

    if (!editName.trim()) {
      setError('차수명을 입력해주세요.');
      return;
    }

    onEditRound(
      selectedVendorId || '',
      selectedStyleId || '',
      editingRoundId,
      editName.trim()
    );
    setShowEditRoundModal(false);
    setEditName('');
  };

  return (
    <div className="flex flex-col h-full bg-sidebar text-sidebar-foreground">
      <div className="p-3 border-b border-sidebar-border">
        <div className="relative">
          <Search className="absolute left-2 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            placeholder="코드 또는 이름으로 검색..."
            value={searchQuery}
            onChange={(e) => onSearchChange(e.target.value)}
            className="pl-8 h-9 text-sm"
          />
        </div>
      </div>

      <div className="px-2 py-2 space-y-1.5">
        <Button
          size="sm"
          variant="outline"
          className="w-full justify-start text-xs bg-transparent"
          onClick={() => setShowAddVendorModal(true)}
        >
          <Plus className="w-3 h-3 mr-2" />
          거래처 추가
        </Button>

        <Button
          size="sm"
          variant="outline"
          className="w-full justify-start text-xs bg-transparent"
          onClick={() => setShowAddStyleModal(true)}
          data-add-style-btn
        >
          <Plus className="w-3 h-3 mr-2" />
          스타일 추가
        </Button>

        <Button
          size="sm"
          variant="outline"
          className="w-full justify-start text-xs bg-transparent"
          onClick={() => setShowAddRoundModal(true)}
          data-add-round-btn
        >
          <Plus className="w-3 h-3 mr-2" />
          차수 추가
        </Button>
      </div>

      <Separator className="my-1" />

      <div className="flex-1 overflow-y-auto">
        <FolderTree
          vendors={vendors}
          selectedVendorId={selectedVendorId}
          selectedStyleId={selectedStyleId}
          selectedRoundId={selectedRoundId}
          onSelectVendor={onSelectVendor}
          onSelectStyle={onSelectStyle}
          onSelectRound={onSelectRound}
          searchQuery={searchQuery}
          onEditVendor={handleEditVendorClick}
          onEditStyle={handleEditStyleClick}
          onEditRound={handleEditRoundClick}
          onDeleteVendor={onDeleteVendor}
          onDeleteStyle={onDeleteStyle}
          onDeleteRound={onDeleteRound}
        />
      </div>

      {showAddVendorModal && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center">
          <div className="bg-white rounded-lg shadow-lg p-6 w-96">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">거래처 추가</h3>

            {error && (
              <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded text-sm text-red-700">
                {error}
              </div>
            )}

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  거래처 번호
                </label>
                <Input
                  value={vendorNumber}
                  onChange={(e) => setVendorNumber(e.target.value)}
                  placeholder="예: 01, 02, 05"
                  className="h-9"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  거래처명
                </label>
                <Input
                  value={vendorName}
                  onChange={(e) => setVendorName(e.target.value)}
                  placeholder="예: 로브로브"
                  className="h-9"
                />
              </div>
            </div>

            <div className="flex gap-2 mt-6">
              <Button
                variant="outline"
                onClick={() => {
                  setShowAddVendorModal(false);
                  setError('');
                  setVendorNumber('');
                  setVendorName('');
                }}
                className="flex-1"
              >
                취소
              </Button>
              <Button onClick={handleSubmitVendor} className="flex-1">
                추가
              </Button>
            </div>
          </div>
        </div>
      )}

      {showAddStyleModal && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center">
          <div className="bg-white rounded-lg shadow-lg p-6 w-96">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">스타일 추가</h3>

            {error && (
              <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded text-sm text-red-700">
                {error}
              </div>
            )}

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  스타일 코드
                </label>
                <Input
                  value={styleCode}
                  onChange={(e) => setStyleCode(e.target.value)}
                  placeholder="예: 0110"
                  className="h-9"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  스타일명 (선택사항)
                </label>
                <Input
                  value={styleName}
                  onChange={(e) => setStyleName(e.target.value)}
                  placeholder="예: 에이트 가디건"
                  className="h-9"
                />
              </div>
            </div>

            <div className="flex gap-2 mt-6">
              <Button
                variant="outline"
                onClick={() => {
                  setShowAddStyleModal(false);
                  setError('');
                  setStyleCode('');
                  setStyleName('');
                }}
                className="flex-1"
              >
                취소
              </Button>
              <Button onClick={handleSubmitStyle} className="flex-1">
                추가
              </Button>
            </div>
          </div>
        </div>
      )}

      {showAddRoundModal && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center">
          <div className="bg-white rounded-lg shadow-lg p-6 w-96">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">차수 추가</h3>

            {error && (
              <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded text-sm text-red-700">
                {error}
              </div>
            )}

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  차수 번호
                </label>
                <Input
                  value={roundNumber}
                  onChange={(e) => setRoundNumber(e.target.value)}
                  placeholder="예: 1, 2, 3"
                  className="h-9"
                />
              </div>
            </div>

            <div className="flex gap-2 mt-6">
              <Button
                variant="outline"
                onClick={() => {
                  setShowAddRoundModal(false);
                  setError('');
                  setRoundNumber('');
                }}
                className="flex-1"
              >
                취소
              </Button>
              <Button onClick={handleSubmitRound} className="flex-1">
                추가
              </Button>
            </div>
          </div>
        </div>
      )}

      {showEditVendorModal && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center">
          <div className="bg-white rounded-lg shadow-lg p-6 w-96">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">거래처 이름 수정</h3>

            {error && (
              <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded text-sm text-red-700">
                {error}
              </div>
            )}

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  거래처명
                </label>
                <input
                  type="text"
                  value={editName}
                  onChange={(e) => setEditName(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded text-sm"
                  autoFocus
                />
              </div>
            </div>

            <div className="flex gap-2 mt-6">
              <button
                onClick={() => {
                  setShowEditVendorModal(false);
                  setError('');
                  setEditName('');
                }}
                className="flex-1 px-4 py-2 text-sm border border-gray-300 rounded hover:bg-gray-50"
              >
                취소
              </button>
              <button
                onClick={handleSubmitEditVendor}
                className="flex-1 px-4 py-2 text-sm bg-blue-600 text-white rounded hover:bg-blue-700"
              >
                수정
              </button>
            </div>
          </div>
        </div>
      )}

      {showEditStyleModal && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center">
          <div className="bg-white rounded-lg shadow-lg p-6 w-96">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">스타일 이름 수정</h3>

            {error && (
              <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded text-sm text-red-700">
                {error}
              </div>
            )}

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  스타일명
                </label>
                <input
                  type="text"
                  value={editName}
                  onChange={(e) => setEditName(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded text-sm"
                  autoFocus
                />
              </div>
            </div>

            <div className="flex gap-2 mt-6">
              <button
                onClick={() => {
                  setShowEditStyleModal(false);
                  setError('');
                  setEditName('');
                }}
                className="flex-1 px-4 py-2 text-sm border border-gray-300 rounded hover:bg-gray-50"
              >
                취소
              </button>
              <button
                onClick={handleSubmitEditStyle}
                className="flex-1 px-4 py-2 text-sm bg-blue-600 text-white rounded hover:bg-blue-700"
              >
                수정
              </button>
            </div>
          </div>
        </div>
      )}

      {showEditRoundModal && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center">
          <div className="bg-white rounded-lg shadow-lg p-6 w-96">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">차수 이름 수정</h3>

            {error && (
              <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded text-sm text-red-700">
                {error}
              </div>
            )}

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  차수명
                </label>
                <input
                  type="text"
                  value={editName}
                  onChange={(e) => setEditName(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded text-sm"
                  autoFocus
                />
              </div>
            </div>

            <div className="flex gap-2 mt-6">
              <button
                onClick={() => {
                  setShowEditRoundModal(false);
                  setError('');
                  setEditName('');
                }}
                className="flex-1 px-4 py-2 text-sm border border-gray-300 rounded hover:bg-gray-50"
              >
                취소
              </button>
              <button
                onClick={handleSubmitEditRound}
                className="flex-1 px-4 py-2 text-sm bg-blue-600 text-white rounded hover:bg-blue-700"
              >
                수정
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}